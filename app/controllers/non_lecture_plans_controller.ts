import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import db from '@adonisjs/lucid/services/db'
import ExcelJS from 'exceljs'
import path from 'node:path'
import fs from 'node:fs'
// @ts-ignore
import PdfPrinterPkg from 'pdfmake/js/Printer.js'
import NonLectureTemplate from '#models/non_lecture_template'
import NonLectureTemplateTopic from '#models/non_lecture_template_topic'
import NonLecturePlanRow from '#models/non_lecture_plan_row'
import NonLectureLog from '#models/non_lecture_log'
import NonLectureTeacherAssignment from '#models/non_lecture_teacher_assignment'
import Access from '#services/access_control'
import {
  buildPlanPdfDefinition,
  buildPlanWorkbook,
  parsePlanWorksheet,
  recalculateProgress,
  type PlanDocumentInput,
} from '#services/non_lecture_plan'

const PdfPrinter = PdfPrinterPkg.default || PdfPrinterPkg
const fonts = {
  Roboto: {
    normal: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Regular.ttf'),
    bold: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Medium.ttf'),
    italics: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Italic.ttf'),
    bolditalics: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-MediumItalic.ttf'),
  },
}

/** Roles that may build and change plans (Admin, Principal, IT Admin, Super Admin, HOD, Developer), or a template granting it. */
const MANAGER_ROLE_IDS = [1, 2, 5, 8, 9, 11]
const MAX_UPLOAD_ROWS = 2000

const text = (max: number) => vine.string().trim().maxLength(max).nullable().optional()
const rowSchema = vine.object({
  id: vine.number().optional(),
  lesson_plan_number: text(30),
  sl_no: text(30),
  competency: text(2000),
  miller: text(80),
  content: text(5000),
  outcome: text(3000),
  bloom: text(120),
  priority: text(40),
  tl_mm: text(2000),
  assessment: text(2000),
  integration: text(2000),
  required_hours: vine.number().min(0).max(100).optional(),
})
const savePlanSchema = vine.compile(
  vine.object({
    topics: vine
      .array(
        vine.object({
          id: vine.number().optional(),
          title: vine.string().trim().minLength(1).maxLength(255),
          hours: vine.number().min(0).max(1000).optional(),
          assigned_staff_ids: vine.array(vine.number()).maxLength(100).optional(),
          rows: vine.array(rowSchema).maxLength(500).optional(),
        })
      )
      .maxLength(200),
    removed_topic_ids: vine.array(vine.number()).optional(),
  })
)

/** '' becomes null so the validator treats an empty cell as "no value". */
function blankToNull(value: any): any {
  if (Array.isArray(value)) return value.map(blankToNull)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, blankToNull(v)]))
  }
  return typeof value === 'string' && value.trim() === '' ? null : value
}

const sessionLabel = (year?: number | null) => (year ? `${year}-${String(year + 1).slice(2)}` : '')

export default class NonLecturePlansController {
  /** Find the template in the caller's school; writes also need the right to manage lesson plans. */
  private async authorize(ctx: HttpContext, write: 'create' | 'update' | null) {
    const user = ctx.auth.user!
    const template = await NonLectureTemplate.query()
      .where('id', ctx.params.id)
      .preload('class')
      .first()

    if (!template || (template.schoolId && Number(template.schoolId) !== Number(user.school_id))) {
      ctx.response.notFound({ success: false, message: 'Template not found' })
      return null
    }
    if (write && !(await Access.allows(user, write, 'LessonPlan', MANAGER_ROLE_IDS))) {
      ctx.response.forbidden({ success: false, message: 'You are not allowed to change non-lecture lesson plans.' })
      return null
    }
    return template
  }

  private headingFor(template: NonLectureTemplate): string {
    const klass = (template.class as any)?.class
    const session = sessionLabel(template.academicSessionId)
    const inner = [klass, session].filter(Boolean).join(' ')
    return inner ? `${template.title} (${inner})` : template.title
  }

  private async teacherNames(templateId: number): Promise<string[]> {
    const assignments = await NonLectureTeacherAssignment.query()
      .where('template_id', templateId)
      .where('status', 'Active')
      .preload('staff')
    const names = assignments.map((a) => `${a.staff?.first_name ?? ''} ${a.staff?.last_name ?? ''}`.trim()).filter(Boolean)
    return [...new Set(names)]
  }

  /** The plan as the screens use it: topics, rows and how much has been covered. */
  private async planView(template: NonLectureTemplate) {
    const topics = await NonLectureTemplateTopic.query()
      .where('template_id', template.id)
      .orderBy('topic_order', 'asc')
      .preload('rows', (q) => q.orderBy('row_order', 'asc'))
    const logs = await NonLectureLog.query().where('template_id', template.id)

    let totalRows = 0
    let coveredRows = 0
    const topicViews = topics.map((topic) => {
      const rows = topic.rows.map((row) => {
        const covering = logs.filter((l) => (l.rowIds || []).map(Number).includes(row.id))
        const dates = covering.map((l) => String(l.date).slice(0, 10)).sort()
        return {
          ...row.serialize(),
          covered_count: covering.length,
          covered_batches: [...new Set(covering.map((l) => l.batchName).filter(Boolean))],
          last_covered_on: dates.length ? dates[dates.length - 1] : null,
        }
      })
      const covered = rows.filter((r) => r.covered_count > 0).length
      totalRows += rows.length
      coveredRows += covered
      const requiredHours = rows.length ? topic.rows.reduce((s, r) => s + Number(r.requiredHours || 0), 0) : Number(topic.hours)
      return {
        id: topic.id,
        title: topic.title,
        assigned_staff_ids: topic.assignedStaffIds || [],
        topic_order: topic.topicOrder,
        hours: Number(topic.hours),
        required_hours: requiredHours,
        logged_hours: Number(topic.completedHours || 0),
        is_completed: topic.isCompleted,
        rows_total: rows.length,
        rows_covered: covered,
        percent: rows.length ? Math.round((covered / rows.length) * 100) : requiredHours > 0 ? Math.min(100, Math.round((Number(topic.completedHours || 0) / requiredHours) * 100)) : 0,
        rows,
      }
    })

    const subjectRow = template.subjectId ? await db.from('subjects').where('id', Number(template.subjectId)).first() : null

    return {
      template: {
        id: template.id,
        title: template.title,
        class_id: template.classId,
        class_name: (template.class as any)?.class ?? null,
        subject_id: template.subjectId,
        subject_name: (subjectRow?.name as string | undefined) ?? null,
        academic_session_id: template.academicSessionId,
        session_label: sessionLabel(template.academicSessionId),
        heading: this.headingFor(template),
        teachers: await this.teacherNames(template.id),
      },
      topics: topicViews,
      summary: {
        topics: topicViews.length,
        topics_completed: topicViews.filter((t) => t.is_completed).length,
        rows: totalRows,
        rows_covered: coveredRows,
        percent: totalRows ? Math.round((coveredRows / totalRows) * 100) : 0,
        logged_hours: Math.round(topicViews.reduce((s, t) => s + t.logged_hours, 0) * 100) / 100,
        required_hours: Math.round(topicViews.reduce((s, t) => s + t.required_hours, 0) * 100) / 100,
      },
    }
  }

  /**
   * GET non-lecture-templates/by-subject/:subjectId
   * What a teacher sees when logging the diary for a timetable period of this subject: the subject's
   * non-lecture plans, limited to the topics assigned to the teacher (all topics when none are assigned).
   */
  async forSubject(ctx: HttpContext) {
    const user = ctx.auth.user!
    const templates = await NonLectureTemplate.query()
      .where('subject_id', ctx.params.subjectId)
      .where('is_active', true)
      .where((q) => q.where('school_id', Number(user.school_id)).orWhereNull('school_id'))
    const isTeacher = [6, 10].includes(Number(user.role_id))
    const staffId = user.staff_id ? Number(user.staff_id) : null

    const data = []
    for (const template of templates) {
      const topics = await NonLectureTemplateTopic.query()
        .where('template_id', template.id)
        .orderBy('topic_order', 'asc')
        .preload('rows', (q) => q.orderBy('row_order', 'asc'))
      const visible = topics.filter(
        (t) => !isTeacher || !t.assignedStaffIds.length || (staffId !== null && t.assignedStaffIds.map(Number).includes(staffId))
      )
      if (!visible.length) continue
      const logs = await NonLectureLog.query().where('template_id', template.id)
      const covered = [...new Set(logs.flatMap((l) => (l.rowIds || []).map(Number)))]
      data.push({
        template_id: template.id,
        batch_name: 'All',
        covered_row_ids: covered,
        template: {
          id: template.id,
          title: template.title,
          activity_type: template.activityType,
          topics: visible.map((t) => ({ ...t.serialize(), rows: t.rows.map((r) => r.serialize()) })),
        },
      })
    }
    return ctx.response.ok({ success: true, data })
  }

  /** GET non-lecture-templates/:id/plan */
  async getPlan(ctx: HttpContext) {
    const template = await this.authorize(ctx, null)
    if (!template) return
    return ctx.response.ok({ success: true, data: await this.planView(template) })
  }

  /**
   * PUT non-lecture-templates/:id/plan
   * The topics listed are saved in the order given; the rows of each listed topic are replaced by the
   * rows sent. Topics that are not listed are left alone unless named in removed_topic_ids.
   */
  async savePlan(ctx: HttpContext) {
    const template = await this.authorize(ctx, 'update')
    if (!template) return

    const payload = await savePlanSchema.validate(blankToNull(ctx.request.only(['topics', 'removed_topic_ids'])))
    const trx = await db.transaction()

    try {
      if (payload.removed_topic_ids?.length) {
        await NonLectureTemplateTopic.query({ client: trx })
          .where('template_id', template.id)
          .whereIn('id', payload.removed_topic_ids)
          .delete()
      }

      let order = 1
      for (const incoming of payload.topics) {
        let topic: NonLectureTemplateTopic | null = null
        if (incoming.id) {
          topic = await NonLectureTemplateTopic.query({ client: trx })
            .where('id', incoming.id)
            .where('template_id', template.id)
            .first()
        }
        if (!topic) {
          topic = await NonLectureTemplateTopic.create(
            {
              templateId: template.id,
              topicOrder: order,
              title: incoming.title,
              hours: incoming.hours ?? 1,
              activityType: template.activityType,
            },
            { client: trx }
          )
        } else {
          topic.useTransaction(trx)
          topic.merge({ title: incoming.title, topicOrder: order })
        }
        order++
        if (incoming.assigned_staff_ids) topic.assignedStaffIds = incoming.assigned_staff_ids

        if (incoming.rows) {
          const existing = await NonLecturePlanRow.query({ client: trx }).where('topic_id', topic.id)
          const keepIds = new Set(incoming.rows.map((r) => r.id).filter(Boolean) as number[])
          const toDelete = existing.filter((r) => !keepIds.has(r.id)).map((r) => r.id)
          if (toDelete.length) await NonLecturePlanRow.query({ client: trx }).whereIn('id', toDelete).delete()

          let rowOrder = 1
          let hoursSum = 0
          for (const r of incoming.rows) {
            const values = {
              rowOrder: rowOrder++,
              lessonPlanNumber: r.lesson_plan_number ?? null,
              slNo: r.sl_no ?? null,
              competency: r.competency ?? null,
              miller: r.miller ?? null,
              content: r.content ?? null,
              outcome: r.outcome ?? null,
              bloom: r.bloom ?? null,
              priority: r.priority ?? null,
              tlMm: r.tl_mm ?? null,
              assessment: r.assessment ?? null,
              integration: r.integration ?? null,
              requiredHours: r.required_hours ?? 1,
            }
            hoursSum += Number(values.requiredHours)
            const current = r.id ? existing.find((x) => x.id === r.id) : null
            if (current) {
              current.useTransaction(trx)
              current.merge(values)
              await current.save()
            } else {
              await NonLecturePlanRow.create({ ...values, topicId: topic.id, isCompleted: false, completedHours: 0 }, { client: trx })
            }
          }
          // a topic with rows is as long as its rows add up to
          if (incoming.rows.length) topic.hours = Math.round(hoursSum * 100) / 100
          else if (incoming.hours !== undefined) topic.hours = incoming.hours
        } else if (incoming.hours !== undefined) {
          topic.hours = incoming.hours
        }
        await topic.save()
      }

      const all = await NonLectureTemplateTopic.query({ client: trx }).where('template_id', template.id)
      template.useTransaction(trx)
      template.totalHours = Math.round(all.reduce((s, t) => s + Number(t.hours || 0), 0) * 100) / 100
      await template.save()

      await trx.commit()
    } catch (error: any) {
      await trx.rollback()
      console.error('NonLecturePlansController.savePlan error:', error)
      return ctx.response.status(500).json({ success: false, message: 'Failed to save the lesson plan: ' + error.message })
    }

    await recalculateProgress(template.id)
    return ctx.response.ok({ success: true, message: 'Lesson plan saved', data: await this.planView(template) })
  }

  /**
   * POST non-lecture-templates/:id/plan/upload   (multipart: file, replace_rows=true|false)
   * Reads the lesson plan sheet. A topic with the same title is updated, a new title is added.
   */
  async uploadPlan(ctx: HttpContext) {
    const template = await this.authorize(ctx, 'create')
    if (!template) return

    const file = ctx.request.file('file', { extnames: ['xlsx'], size: '10mb' })
    if (!file) return ctx.response.badRequest({ success: false, message: 'Please choose an .xlsx file.' })
    if (!file.isValid) return ctx.response.badRequest({ success: false, message: file.errors.map((e) => e.message).join(', ') })

    const replaceRows = String(ctx.request.input('replace_rows', 'true')) !== 'false'

    const workbook = new ExcelJS.Workbook()
    try {
      await workbook.xlsx.readFile(file.tmpPath!)
    } catch {
      return ctx.response.badRequest({ success: false, message: 'The file could not be read as an Excel workbook.' })
    }

    const topicsFound: ReturnType<typeof parsePlanWorksheet>['topics'] = []
    const warnings: string[] = []
    for (const ws of workbook.worksheets) {
      if (ws.rowCount === 0) continue
      const parsed = parsePlanWorksheet(ws)
      topicsFound.push(...parsed.topics)
      warnings.push(...parsed.warnings)
    }
    const totalRows = topicsFound.reduce((s, t) => s + t.rows.length, 0)
    if (totalRows === 0) {
      return ctx.response.badRequest({
        success: false,
        message: 'No lesson plan rows were found. Download the template, fill the rows under the heads and upload it again.',
        warnings,
      })
    }
    if (totalRows > MAX_UPLOAD_ROWS) {
      return ctx.response.badRequest({ success: false, message: `A file can hold up to ${MAX_UPLOAD_ROWS} rows.` })
    }

    const trx = await db.transaction()
    let created = 0
    let updated = 0
    let imported = 0
    try {
      const existingTopics = await NonLectureTemplateTopic.query({ client: trx }).where('template_id', template.id)
      let nextOrder = existingTopics.reduce((m, t) => Math.max(m, t.topicOrder), 0) + 1

      for (const found of topicsFound) {
        if (found.rows.length === 0) continue
        const title = found.title.slice(0, 255)
        let topic = existingTopics.find((t) => t.title.trim().toLowerCase() === title.trim().toLowerCase()) || null
        if (!topic) {
          topic = await NonLectureTemplateTopic.create(
            { templateId: template.id, topicOrder: nextOrder++, title, hours: 1, activityType: template.activityType },
            { client: trx }
          )
          existingTopics.push(topic)
          created++
        } else {
          updated++
          if (replaceRows) await NonLecturePlanRow.query({ client: trx }).where('topic_id', topic.id).delete()
        }

        const start = replaceRows
          ? 0
          : (await NonLecturePlanRow.query({ client: trx }).where('topic_id', topic.id).max('row_order as m').first())?.$extras.m || 0
        let hours = 0
        let i = 0
        for (const r of found.rows) {
          i++
          hours += r.requiredHours
          imported++
          await NonLecturePlanRow.create(
            {
              topicId: topic.id,
              rowOrder: Number(start) + i,
              lessonPlanNumber: r.lessonPlanNumber?.slice(0, 30) ?? null,
              slNo: (r.slNo ?? String(i)).slice(0, 30),
              competency: r.competency?.slice(0, 2000) ?? null,
              miller: r.miller?.slice(0, 80) ?? null,
              content: r.content?.slice(0, 5000) ?? null,
              outcome: r.outcome?.slice(0, 3000) ?? null,
              bloom: r.bloom?.slice(0, 120) ?? null,
              priority: r.priority?.slice(0, 40) ?? null,
              tlMm: r.tlMm?.slice(0, 2000) ?? null,
              assessment: r.assessment?.slice(0, 2000) ?? null,
              integration: r.integration?.slice(0, 2000) ?? null,
              requiredHours: r.requiredHours,
              isCompleted: false,
              completedHours: 0,
            },
            { client: trx }
          )
        }
        const total = await NonLecturePlanRow.query({ client: trx }).where('topic_id', topic.id)
        topic.useTransaction(trx)
        topic.hours = Math.round(total.reduce((s, x) => s + Number(x.requiredHours), 0) * 100) / 100 || Math.round(hours * 100) / 100
        await topic.save()
      }

      const all = await NonLectureTemplateTopic.query({ client: trx }).where('template_id', template.id)
      template.useTransaction(trx)
      template.totalHours = Math.round(all.reduce((s, t) => s + Number(t.hours || 0), 0) * 100) / 100
      await template.save()
      await trx.commit()
    } catch (error: any) {
      await trx.rollback()
      console.error('NonLecturePlansController.uploadPlan error:', error)
      return ctx.response.status(500).json({ success: false, message: 'Failed to import the lesson plan: ' + error.message })
    }

    await recalculateProgress(template.id)
    return ctx.response.ok({
      success: true,
      message: `Imported ${imported} row(s): ${created} new topic(s), ${updated} topic(s) updated.`,
      warnings,
      data: await this.planView(template),
    })
  }

  /** GET non-lecture-templates/plan-template?template_id=  A blank sheet with the heads. */
  async downloadTemplate(ctx: HttpContext) {
    const user = ctx.auth.user!
    let heading = 'Subject (Class Year)'
    const templateId = ctx.request.input('template_id')
    if (templateId) {
      const template = await NonLectureTemplate.query().where('id', templateId).preload('class').first()
      if (template && (!template.schoolId || Number(template.schoolId) === Number(user.school_id))) {
        heading = this.headingFor(template)
      }
    }
    const wb = await buildPlanWorkbook({ heading, topics: [] })
    const buffer = Buffer.from(await wb.xlsx.writeBuffer())
    ctx.response.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    ctx.response.header('Content-Disposition', 'attachment; filename="non-lecture-lesson-plan-template.xlsx"')
    return ctx.response.send(buffer)
  }

  /** GET non-lecture-templates/:id/plan/export?format=xlsx|pdf&lp_number=&topic_id= */
  async exportPlan(ctx: HttpContext) {
    const template = await this.authorize(ctx, null)
    if (!template) return

    const format = String(ctx.request.input('format', 'xlsx')).toLowerCase() === 'pdf' ? 'pdf' : 'xlsx'
    const lpNumber = ctx.request.input('lp_number')
    const topicId = ctx.request.input('topic_id')

    const topicsQuery = NonLectureTemplateTopic.query()
      .where('template_id', template.id)
      .orderBy('topic_order', 'asc')
      .preload('rows', (q) => q.orderBy('row_order', 'asc'))
    if (topicId) topicsQuery.where('id', topicId)
    const topics = await topicsQuery

    const input: PlanDocumentInput = {
      heading: this.headingFor(template),
      lessonPlanNumber: lpNumber ? String(lpNumber) : null,
      date: null,
      teacherName: (await this.teacherNames(template.id)).join(', '),
      topics: topics
        .map((t) => ({
          title: t.title,
          rows: t.rows
            .filter((r) => !lpNumber || String(r.lessonPlanNumber ?? '') === String(lpNumber))
            .map((r) => ({
              slNo: r.slNo,
              competency: r.competency,
              miller: r.miller,
              content: r.content,
              outcome: r.outcome,
              bloom: r.bloom,
              priority: r.priority,
              tlMm: r.tlMm,
              assessment: r.assessment,
              integration: r.integration,
            })),
        }))
        .filter((t) => !lpNumber || t.rows.length > 0),
    }

    const safeName = template.title.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 60) || 'plan'

    if (format === 'xlsx') {
      const wb = await buildPlanWorkbook(input)
      const buffer = Buffer.from(await wb.xlsx.writeBuffer())
      ctx.response.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      ctx.response.header('Content-Disposition', `attachment; filename="${safeName}_lesson_plan.xlsx"`)
      return ctx.response.send(buffer)
    }

    let logo: string | null = null
    try {
      const logoPath = path.resolve(process.cwd(), 'resources/logo.jpg')
      if (fs.existsSync(logoPath)) logo = `data:image/jpeg;base64,${fs.readFileSync(logoPath).toString('base64')}`
    } catch {
      logo = null
    }

    const printer = new PdfPrinter(fonts, fs as any, { resolve: () => {}, resolved: () => Promise.resolve() })
    const pdfDoc = await (printer as any).createPdfKitDocument(buildPlanPdfDefinition(input, logo))
    const chunks: Buffer[] = []
    pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk))
    const done = new Promise<Buffer>((resolve, reject) => {
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)))
      pdfDoc.on('error', reject)
    })
    pdfDoc.end()
    const pdf = await done

    ctx.response.header('Content-Type', 'application/pdf')
    ctx.response.header('Content-Disposition', `attachment; filename="${safeName}_lesson_plan.pdf"`)
    return ctx.response.send(pdf)
  }
}
