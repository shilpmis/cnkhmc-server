import type { HttpContext } from '@adonisjs/core/http'
import LessonPlan from '#models/LessonPlan'
import LessonPlanTopic from '#models/LessonPlanTopic'
import LessonPlanSubtopic from '#models/LessonPlanSubtopic'
import DailyDiary from '#models/DailyDiary'
import Subjects from '#models/Subjects'
import db from '@adonisjs/lucid/services/db'
import ExcelJS from 'exceljs'
import path from 'node:path'
import app from '@adonisjs/core/services/app'
// @ts-ignore
import PdfPrinterPkg from 'pdfmake/js/printer.js'
const PdfPrinter = PdfPrinterPkg.default || PdfPrinterPkg
import fs from 'node:fs'

const fonts = {
  Roboto: {
    normal: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Regular.ttf'),
    bold: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Medium.ttf'),
    italics: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Italic.ttf'),
    bolditalics: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-MediumItalic.ttf')
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Safely extracts a string value from an ExcelJS cell.
 * Handles plain strings, numbers, richText objects, and formula results.
 */
function getCellValue(cell: ExcelJS.Cell): string {
  // If the cell is a merged child cell, its value is technically the master cell's value,
  // but we want to ignore it to prevent duplicating values (like Hours) across rows.
  if (cell.isMerged && cell.master && cell.master.address !== cell.address) return ''
  const val = cell.value
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val.trim()
  if (typeof val === 'number' || typeof val === 'boolean') return String(val).trim()
  if (typeof val === 'object') {
    // Rich text
    if ('richText' in val && Array.isArray((val as any).richText)) {
      return (val as any).richText.map((r: any) => r.text || '').join('').trim()
    }
    // Formula result
    if ('result' in val) {
      const res = (val as any).result
      if (res === null || res === undefined) return ''
      if (typeof res === 'string') return res.trim()
      return String(res).trim()
    }
    // Date
    if (val instanceof Date) return val.toISOString()
  }
  return String(val).trim()
}

/**
 * Normalises a header string: lowercase, strip spaces/punctuation.
 * "Bloom/Guilbert" → "bloomguilbert", "TL MM" → "tlmm"
 */
function cleanHeader(val: string): string {
  return val.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Formats an array of strings with commas and a final ampersand.
 * ['A'] → 'A'  |  ['A','B'] → 'A & B'  |  ['A','B','C'] → 'A, B & C'
 */
function joinWithAmpersand(items: string[]): string {
  if (items.length === 0) return 'N/A'
  if (items.length === 1) return items[0]
  return items.slice(0, -1).join(', ') + ' & ' + items[items.length - 1]
}

/**
 * Formats a date string as DD/MM/YY.
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

// ─── Controller ─────────────────────────────────────────────────────────────

export default class LessonPlanController {
  // ── 1. Bulk Upload Syllabus ────────────────────────────────────────────────
  public async bulkUploadSyllabus({ request, response, auth }: HttpContext) {
    const subjectId = request.input('subjectId') || request.input('subject_id') || request.input('subject')
    const academicYear = request.input('academicYear') || request.input('academic_year') || request.input('academicSessionId') || request.input('academic_session_id')
    const schoolId = auth.user?.school_id || request.header('schoolId')

    if (!schoolId) return response.badRequest({ message: 'School reference missing' })
    if (!subjectId || !academicYear)
      return response.badRequest({ message: 'subjectId and academicYear are required' })

    const file = request.file('file', { extnames: ['xlsx', 'xls'], size: '20mb' })
    if (!file) return response.badRequest({ message: 'Excel file is required' })
    if (!file.isValid) return response.badRequest({ message: file.errors })

    const uploadDir = path.join(app.tmpPath(), 'uploads')
    await file.move(uploadDir)
    const filePath = path.join(uploadDir, file.clientName)

    const trx = await db.transaction()

    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.readFile(filePath)

      const worksheet = workbook.worksheets.find(ws => ws.rowCount > 1) || workbook.worksheets[0]
      if (!worksheet || worksheet.rowCount <= 1) {
        await trx.rollback()
        return response.badRequest({ message: 'Excel file is empty or has no data rows' })
      }
      console.log(`[Upload Syllabus] Worksheet '${worksheet.name}' found with ${worksheet.rowCount} rows. Scanning headers…`)

      // ── Locate header row (scan first 7 rows) ──────────────────────────────
      const HEADER_KEYWORDS = ['content', 'topic', 'competency', 'slo', 'miller', 'bloom',
        'assessment', 'integration', 'priority', 'hours', 'tlmm', 'tlmethods',
        'teachingmethod', 'methods', 'lesson', 'lession', 'lp']

      let headerRowNum = 1
      let colMap: Record<string, number> = {}

      for (let r = 1; r <= Math.min(7, worksheet.rowCount); r++) {
        const row = worksheet.getRow(r)
        const tmpMap: Record<string, number> = {}
        let hits = 0
        let contentCol = 0

        for (let c = 1; c <= 20; c++) {
          const raw = getCellValue(row.getCell(c))
          if (!raw) continue
          const clean = cleanHeader(raw)
          if (HEADER_KEYWORDS.some(k => clean.includes(k))) hits++

          // Map semantic columns – order matters (most specific first)
          if (['sino', 'slno', 'srno', 'code', 'sno'].some(k => clean === k))         tmpMap.code = c
          if (['topic', 'topicname', 'subjectarea'].some(k => clean.includes(k)))      tmpMap.topicName = c
          if (clean.includes('content'))                                                 tmpMap.content = c
          if (['competency', 'domainofcompetency'].some(k => clean.includes(k)))       tmpMap.competency = c
          if (['slo', 'specificlearningobjective', 'outcome', 'detail'].some(k => clean.includes(k))) tmpMap.outcome = c
          if (['hours', 'hour', 'nohrs', 'nofhrs'].some(k => clean.includes(k)))      tmpMap.hours = c
          if (['lp', 'lesson', 'lession'].some(k => clean.includes(k)))               tmpMap.lpNumber = c
          if (clean.includes('miller'))                                                  tmpMap.miller = c
          if (clean.includes('bloom') || clean.includes('guilbert'))                    tmpMap.bloom = c
          if (clean.includes('priority'))                                                tmpMap.priority = c
          if (['tlmm', 'tlmethods', 'teachingmethod', 'methods'].some(k => clean.includes(k))) tmpMap.tlMm = c
          if (clean.includes('assessment') || clean.includes('formative') || clean.includes('summative')) {
            if (!tmpMap.assessment) tmpMap.assessment = c
            else tmpMap.assessment2 = c
          }
          if (clean.includes('integration'))                                             tmpMap.integration = c
        }

        if (hits >= 2 || (r === 1 && Object.keys(tmpMap).length >= 1)) {
          headerRowNum = r
          colMap = tmpMap
          if (!colMap.topicName && colMap.content) {
            colMap.topicName = colMap.content
          }
          console.log(`[Upload Syllabus] Header row detected at row ${r}:`, colMap)
          break
        }
      }

      if (Object.keys(colMap).length === 0) {
        console.log(`[Upload Syllabus] Positional fallback column mapping applied (1: code, 2: topic, 3: competency, 4: outcome, 5: hours, 6: lp)`)
        colMap = {
          code: 1,
          topicName: 2,
          competency: 3,
          outcome: 4,
          hours: 5,
          lpNumber: 6
        }
      }

      // ── Get or create LessonPlan (clean slate) ─────────────────────────────
      const targetSubject = await Subjects.find(subjectId)
      const resolvedYear = targetSubject?.academic_year || (isNaN(Number(academicYear)) ? 2026 : Number(academicYear)) || 2026

      let lp = await LessonPlan.query({ client: trx })
        .where('subject_id', subjectId)
        .where('school_id', schoolId)
        .first()

      if (lp) {
        // Delete all existing topics and subtopics for a clean import
        console.log(`[Upload Syllabus] Existing LP found (id=${lp.id}). Clearing topics/subtopics…`)
        const oldTopics = await LessonPlanTopic.query({ client: trx }).where('lesson_plan_id', lp.id)
        const oldTopicIds = oldTopics.map(t => t.id)
        if (oldTopicIds.length > 0) {
          await LessonPlanSubtopic.query({ client: trx }).whereIn('topic_id', oldTopicIds).delete()
        }
        await LessonPlanTopic.query({ client: trx }).where('lesson_plan_id', lp.id).delete()
        lp.academicYear = resolvedYear
        lp.totalRequiredHours = 0
        await lp.useTransaction(trx).save()
      } else {
        lp = await LessonPlan.create({
          subjectId: Number(subjectId),
          academicYear: resolvedYear,
          schoolId: Number(schoolId),
          totalRequiredHours: 0
        }, { client: trx })
        console.log(`[Upload Syllabus] Created new LP id=${lp.id}`)
      }

      // ── Parse data rows ───────────────────────────────────────────────────
      const parsedRows: any[] = []
      let lastCompetency = ''
      for (let rowNum = headerRowNum + 1; rowNum <= worksheet.rowCount; rowNum++) {
        const row = worksheet.getRow(rowNum)

        const getCol = (key: string) => colMap[key] ? getCellValue(row.getCell(colMap[key])) : ''

        const code       = getCol('code')
        const topicName  = getCol('topicName')
        const content    = getCol('content')
        let competency   = getCol('competency') || content
        const outcome    = getCol('outcome')
        const hoursRaw   = getCol('hours')
        const hours      = parseFloat(hoursRaw) || 0
        const lpNumber   = getCol('lpNumber')
        const miller     = getCol('miller')
        const bloom      = getCol('bloom')
        const priority   = getCol('priority')
        const tlMm       = getCol('tlMm')
        const assess1    = getCol('assessment')
        const assess2    = colMap['assessment2'] ? getCellValue(row.getCell(colMap['assessment2'])) : ''
        // Merge two assessment columns if both exist (e.g. Formative + Summative)
        let assessment   = ''
        if (assess1 && assess2) {
          assessment = `${assess1} | ${assess2}`
        } else {
          assessment = assess1 || assess2
        }
        const integration = getCol('integration')

        // Skip completely empty rows
        const rowHasContent = topicName || competency || content || outcome || hours > 0 || code
        if (!rowHasContent) continue

        // Propagate competency
        if (competency) {
          lastCompetency = competency
        } else if (topicName || outcome || hours > 0) {
          competency = lastCompetency
        }

        parsedRows.push({
          code,
          topicName,
          content,
          competency,
          outcome,
          hours,
          lpNumber,
          miller,
          bloom,
          priority,
          tlMm,
          assessment,
          integration,
          rowNum
        })
      }

      // ── Write to Database ─────────────────────────────────────────────────
      let currentTopic: LessonPlanTopic | null = null
      let topicOrder = 1
      let subtopicOrder = 1
      let processedCount = 0
      let subtopicsToCreate: any[] = []

      const saveCurrentTopicAndSubtopics = async () => {
        if (currentTopic) {
          await currentTopic.useTransaction(trx).save()
          if (subtopicsToCreate.length > 0) {
            subtopicsToCreate.forEach(st => st.topic_id = currentTopic!.id)
            await db.table('lesson_plan_subtopics').useTransaction(trx).multiInsert(subtopicsToCreate)
            subtopicsToCreate = []
          }
        }
      }

      for (const item of parsedRows) {
        processedCount++
        if (processedCount % 50 === 0) {
          console.log(`[Upload Syllabus] Processing data row ${processedCount}`)
        }

        const isNewTopicHeader = item.topicName && !item.competency && !item.outcome
        const isNewTopicGroup = item.topicName && currentTopic && item.topicName !== currentTopic.name

        if (isNewTopicHeader || isNewTopicGroup || (item.topicName && !currentTopic)) {
          await saveCurrentTopicAndSubtopics()

          currentTopic = await LessonPlanTopic.create({
            lessonPlanId: lp.id,
            name: item.topicName,
            code: item.code || null,
            requiredHours: 0,
            isCompleted: false,
            order: topicOrder++
          }, { client: trx })

          if (isNewTopicHeader) {
            continue
          }
        }

        if (!currentTopic) {
          currentTopic = await LessonPlanTopic.create({
            lessonPlanId: lp.id,
            name: item.topicName || item.competency || item.outcome || 'General Syllabus',
            code: item.code || null,
            requiredHours: 0,
            isCompleted: false,
            order: topicOrder++
          }, { client: trx })
        }

        const subtopicName = item.competency || item.content || item.outcome || item.topicName || item.code || `Row ${item.rowNum}`
        subtopicsToCreate.push({
          name: subtopicName,
          code: item.code || null,
          detail: item.outcome || null,
          competency: item.competency || null,
          outcome: item.outcome || null,
          required_hours: item.hours,
          lesson_plan_number: item.lpNumber || null,
          is_completed: false,
          order: subtopicOrder++,
          miller: item.miller || null,
          bloom: item.bloom || null,
          priority: item.priority || null,
          tl_mm: item.tlMm || null,
          assessment: item.assessment || null,
          integration: item.integration || null,
          created_at: new Date(),
          updated_at: new Date()
        })

        currentTopic.requiredHours = (currentTopic.requiredHours || 0) + item.hours
      }

      await saveCurrentTopicAndSubtopics()

      // ── Update total hours on LP ───────────────────────────────────────────
      const allTopics = await LessonPlanTopic.query({ client: trx }).where('lesson_plan_id', lp.id)
      lp.totalRequiredHours = allTopics.reduce((acc, t) => acc + (Number(t.requiredHours) || 0), 0)
      await lp.useTransaction(trx).save()

      console.log(`[Upload Syllabus] Done. ${processedCount} rows processed. Committing…`)
      await trx.commit()
      return response.ok({ message: 'Syllabus uploaded successfully', rows: processedCount })
    } catch (error) {
      console.error(`[Upload Syllabus] Error, rolling back:`, error)
      await trx.rollback()
      return response.internalServerError({ message: 'Failed to process Excel file', error: error.message })
    }
  }

  // ── 2. Index ──────────────────────────────────────────────────────────────
  public async index({ request, response, auth }: HttpContext) {
    const schoolId = auth.user?.school_id || request.header('schoolId')
    const academicYear = request.input('academicYear')

    const lessonPlans = await LessonPlan.query()
      .where('school_id', schoolId!)
      .where('academic_year', academicYear)
      .preload('subject')

    return response.ok(lessonPlans)
  }

  // ── 3. Get by Subject ─────────────────────────────────────────────────────
  public async getBySubject({ request, response }: HttpContext) {
    try {
      const subjectId = request.param('subjectId')
      const subject = await Subjects.find(subjectId)

      let matchingIds: number[] = [Number(subjectId)]
      if (subject) {
        const cleanName = subject.name.trim().toLowerCase()
        const matchingSubjects = await Subjects.query()
          .whereRaw('LOWER(name) = ?', [cleanName])
        matchingIds = matchingSubjects.map(s => s.id)
      }

      // Fetch the latest lesson plan for the subject
      let lp = await LessonPlan.query()
        .whereIn('subject_id', matchingIds)
        .preload('topics', (q) => {
          q.orderBy('id', 'asc')
          q.preload('subtopics', (sq) => {
            sq.orderBy('id', 'asc')
          })
        })
        .orderBy('id', 'desc')
        .first()

      return response.ok(lp || null)
    } catch (error: any) {
      console.error('Error in getBySubject:', error)
      return response.status(500).json({ message: 'Failed to fetch lesson plan', error: error?.message || String(error) })
    }
  }

  // ── 3b. Assign Topic to Teacher ──────────────────────────────────────────
  public async assignTopicToTeacher({ request, response }: HttpContext) {
    try {
      const topicId = request.param('id')
      const { staff_ids } = request.body()
      const topic = await LessonPlanTopic.findOrFail(topicId)
      topic.assignedStaffIds = Array.isArray(staff_ids) ? staff_ids.map(Number) : null
      await topic.save()

      return response.ok(topic)
    } catch (error: any) {
      return response.badRequest({ message: 'Failed to assign topic to teacher', error: error.message })
    }
  }

  // ── 3c. Assign Subtopic to Teacher ───────────────────────────────────────
  public async assignSubtopicToTeacher({ request, response }: HttpContext) {
    try {
      const subtopicId = request.param('id')
      const { staff_ids } = request.body()
      const subtopic = await LessonPlanSubtopic.findOrFail(subtopicId)
      subtopic.assignedStaffIds = Array.isArray(staff_ids) ? staff_ids.map(Number) : null
      await subtopic.save()

      return response.ok(subtopic)
    } catch (error: any) {
      return response.badRequest({ message: 'Failed to assign subtopic to teacher', error: error.message })
    }
  }

  // ── 4. Delete by Subject ──────────────────────────────────────────────────
  public async deleteBySubject({ request, response, auth }: HttpContext) {
    const subjectId = request.param('subjectId')
    const academicYear =
      request.input('academic_session_id') ||
      request.input('academic_year') ||
      request.input('academicYear') ||
      request.input('academicSessionId') ||
      request.input('academic_session')
    const schoolId = auth.user?.school_id || request.header('schoolId')

    if (!schoolId) return response.badRequest({ message: 'School reference missing' })
    if (!subjectId || !academicYear)
      return response.badRequest({ message: 'subjectId and academicYear are required' })

    const trx = await db.transaction()
    try {
      const lp = await LessonPlan.query({ client: trx })
        .where('subject_id', subjectId)
        .where('academic_year', academicYear)
        .where('school_id', schoolId)
        .first()

      if (!lp) {
        await trx.rollback()
        return response.notFound({ message: 'Syllabus not found for this subject' })
      }

      const topics = await LessonPlanTopic.query({ client: trx }).where('lesson_plan_id', lp.id)
      const topicIds = topics.map(t => t.id)
      if (topicIds.length > 0) {
        await LessonPlanSubtopic.query({ client: trx }).whereIn('topic_id', topicIds).delete()
      }
      await LessonPlanTopic.query({ client: trx }).where('lesson_plan_id', lp.id).delete()
      await lp.useTransaction(trx).delete()

      await trx.commit()
      return response.ok({ message: 'Syllabus deleted successfully' })
    } catch (error) {
      await trx.rollback()
      console.error(`[Delete Syllabus] Error:`, error)
      return response.internalServerError({ message: 'Failed to delete syllabus', error: error.message })
    }
  }

  // ── 5. Store (manual) ─────────────────────────────────────────────────────
  public async store({ request, response, auth }: HttpContext) {
    const schoolId = auth.user?.school_id || request.header('schoolId')
    const payload = request.body()
    payload.schoolId = schoolId
    const lp = await LessonPlan.create(payload)
    return response.created(lp)
  }

  // ── 6. Add Topic ──────────────────────────────────────────────────────────
  public async addTopic({ request, response }: HttpContext) {
    const lessonPlanId = request.param('id')
    const payload = request.body()
    payload.lessonPlanId = lessonPlanId
    const topic = await LessonPlanTopic.create(payload)
    return response.created(topic)
  }

  // ── 7. Coverage Report ────────────────────────────────────────────────────
  public async getCoverageReport({ request, response, auth }: HttpContext) {
    try {
      const academicYear =
        request.param('academicSessionId') ||
        request.param('academicYear') ||
        request.param('academic_year') ||
        request.input('academicSessionId') ||
        request.input('academic_session_id') ||
        request.input('academicYear') ||
        request.input('academic_year')

      const subjectId = request.input('subjectId') || request.input('subject_id')
      const schoolId = auth.user?.school_id || request.header('schoolId')

      const query = LessonPlan.query()

      if (subjectId) {
        query.where('subject_id', subjectId)
      } else if (academicYear) {
        query.where('academic_year', academicYear)
      }

      if (schoolId) {
        query.where('school_id', schoolId)
      }

      const lessonPlans = await query
        .preload('subject')
        .preload('topics', (q) => { q.preload('subtopics') })

      const report = (lessonPlans || []).map(lp => {
        const topics = lp.topics || []
        let totalSubtopics = 0, completedSubtopics = 0, totalHours = 0, completedHours = 0

        topics.forEach(topic => {
          if (topic.subtopics && topic.subtopics.length > 0) {
            topic.subtopics.forEach(st => {
              totalSubtopics++
              totalHours += Number(st.requiredHours) || 0
              if (st.isCompleted) { completedSubtopics++; completedHours += Number(st.requiredHours) || 0 }
            })
          } else {
            totalSubtopics++
            totalHours += Number(topic.requiredHours) || 0
            if (topic.isCompleted) { completedSubtopics++; completedHours += Number(topic.requiredHours) || 0 }
          }
        })

        return {
          subjectId: lp.subjectId,
          subjectName: lp.subject?.name || 'Unknown Subject',
          totalSubtopics,
          completedSubtopics,
          totalHours,
          completedHours,
          coveragePercentage: totalSubtopics > 0 ? Math.round((completedSubtopics / totalSubtopics) * 100) : 0
        }
      })

      return response.ok(report)
    } catch (error) {
      console.error('Error in getCoverageReport:', error)
      return response.ok([])
    }
  }

  // ── 8. Update Topic Status ────────────────────────────────────────────────
  public async updateTopicStatus({ request, response }: HttpContext) {
    const topicId = request.param('id')
    const { isCompleted } = request.body()
    const topic = await LessonPlanTopic.findOrFail(topicId)
    topic.isCompleted = isCompleted
    await topic.save()
    return response.ok(topic)
  }

  // ── 9. Update Subtopic Status ─────────────────────────────────────────────
  public async updateSubtopicStatus({ request, response }: HttpContext) {
    const subtopicId = request.param('id')
    const { isCompleted } = request.body()
    const subtopic = await LessonPlanSubtopic.findOrFail(subtopicId)
    subtopic.isCompleted = isCompleted
    await subtopic.save()
    return response.ok(subtopic)
  }

  // ── 10. Export all LPs as coverage PDF ───────────────────────────────────
  public async exportPDF({ request, response, auth }: HttpContext) {
    const academicYear =
      request.param('academicSessionId') ||
      request.param('academicYear') ||
      request.param('academic_year') ||
      request.input('academicSessionId') ||
      request.input('academic_session_id') ||
      request.input('academicYear') ||
      request.input('academic_year')

    const schoolId = auth.user?.school_id || request.header('schoolId')

    const query = LessonPlan.query()
    if (academicYear) query.where('academic_year', academicYear)
    if (schoolId) query.where('school_id', schoolId)

    const lessonPlans = await query
      .preload('subject')
      .preload('topics', (q) => { q.preload('subtopics') })

    const body: any[] = [[
      { text: 'Subject', style: 'tableHeader' },
      { text: 'Topic', style: 'tableHeader' },
      { text: 'Required Hours', style: 'tableHeader' },
      { text: 'Status', style: 'tableHeader' }
    ]]

    lessonPlans.forEach(lp => {
      let isFirst = true
      lp.topics.forEach(topic => {
        if (topic.subtopics && topic.subtopics.length > 0) {
          topic.subtopics.forEach(subtopic => {
            body.push([
              { text: isFirst ? (lp.subject?.name || '') : '' },
              { text: `${topic.name} - ${subtopic.name}` },
              { text: (subtopic.requiredHours || 0).toString() },
              { text: subtopic.isCompleted ? 'Completed' : 'Pending' }
            ])
            isFirst = false
          })
        } else {
          body.push([
            { text: isFirst ? (lp.subject?.name || '') : '' },
            { text: topic.name },
            { text: (topic.requiredHours || 0).toString() },
            { text: topic.isCompleted ? 'Completed' : 'Pending' }
          ])
          isFirst = false
        }
      })
    })

    const docDefinition: any = {
      content: [
        { text: 'Curriculum Coverage Report', style: 'header' },
        { table: { headerRows: 1, widths: ['*', '*', 'auto', 'auto'], body } }
      ],
      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
        tableHeader: { bold: true, fontSize: 13, color: 'black' }
      },
      defaultStyle: { font: 'Roboto', fontSize: 10 }
    }

    const printer = new PdfPrinter(fonts, fs as any, { resolve: () => { }, resolved: () => Promise.resolve() })
    const pdfDoc = await (printer as any).createPdfKitDocument(docDefinition)
    pdfDoc.end()
    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', 'attachment; filename="coverage-report.pdf"')
    return response.stream(pdfDoc)
  }

  // ── 11. Export Single Lesson Plan PDF (the main one) ─────────────────────
  public async exportLP({ request, response, auth }: HttpContext) {
    const subjectId = request.param('subjectId')
    const lpNumber = request.param('lpNumber')
    const academicYear = request.input('academicYear') || request.input('academicSessionId') || request.param('academicYear')
    const schoolId = auth.user?.school_id

    if (!schoolId) return response.badRequest({ message: 'School reference missing' })

    let logoImage: string | null = null
    try {
      const logoPath = path.resolve(process.cwd(), 'resources/logo.jpg')
      if (fs.existsSync(logoPath)) {
        const logoData = fs.readFileSync(logoPath)
        logoImage = `data:image/jpeg;base64,${logoData.toString('base64')}`
      }
    } catch (err) {
      console.error('Error loading logo:', err)
    }

    // ── A. Load lesson plan ────────────────────────────────────────────────
    let lp: any
    try {
      lp = await LessonPlan.query()
        .where('subject_id', subjectId)
        .where('academic_year', academicYear)
        .where('school_id', schoolId)
        .preload('subject')
        .preload('school')
        .firstOrFail()
    } catch {
      return response.notFound({ message: `No lesson plan found for subject ${subjectId} in academic year ${academicYear}` })
    }

    // ── B. Load subtopics for this LP number ──────────────────────────────
    const topics = await LessonPlanTopic.query().where('lesson_plan_id', lp.id)
    const topicIds = topics.map(t => t.id)

    const subtopics = topicIds.length > 0
      ? await LessonPlanSubtopic.query()
          .whereIn('topic_id', topicIds)
          .where('lesson_plan_number', lpNumber)
          .preload('topic')
          .orderBy('order', 'asc')
      : []

    // ── C. Department name (from subject's department) ────────────────────
    // Department lookup removed (department heading not used in PDF output)
    // Use subject name for the "Department of …" heading — matches user's requirement
    const subjectName = lp.subject?.name || 'Subject'
    // const departmentHeading = department?.name ? `Department of ${department.name}` : `Department of ${subjectName}`

    // ── D. Batch name resolution ──────────────────────────────────────────
    // subjects_division_masters → divisions → classes → batches
    let batchName = ''
    const divMaster = await db.from('subjects_division_masters')
      .where('subject_id', subjectId)
      .where('academic_year', academicYear)
      .first()

    if (divMaster) {
      const division = await db.from('divisions').where('id', divMaster.division_id).first()
      if (division) {
        const classRow = await db.from('classes').where('id', division.class_id).first()
        if (classRow?.batch_id) {
          const batch = await db.from('batches').where('id', classRow.batch_id).first()
          batchName = batch?.name || ''
        }
      }
    }

    // ── E. Daily diary logs → teachers + dates ────────────────────────────
    let dailyLogs: DailyDiary[] = []
    if (subtopics.length > 0) {
      const subtopicIds = subtopics.map(st => st.id)
      dailyLogs = await DailyDiary.query()
        .where(q => {
          for (const id of subtopicIds) {
            q.orWhereRaw('JSON_CONTAINS(subtopic_ids, ?)', [JSON.stringify(id)])
          }
        })
        .preload('staffEnrollment', se => { se.preload('staff') })
    }

    // Chronological unique dates
    const rawDates = dailyLogs
      .map(log => log.date)
      .filter(Boolean)
    const uniqueSortedDates = [...new Set(rawDates)]
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    const formattedDates = uniqueSortedDates.map(d => formatDate(d))
    const datesText = joinWithAmpersand(formattedDates)

    // Unique teacher names
    const teacherNames = [...new Set(
      dailyLogs
        .map(log => {
          const staff = log.staffEnrollment?.staff
          if (!staff) return ''
          const parts = [staff.first_name, staff.middle_name, staff.last_name].filter(Boolean)
          return parts.join(' ').trim()
        })
        .filter(Boolean)
    )]
    const teachersText = joinWithAmpersand(teacherNames)

    // ── F. Student attendance count ───────────────────────────────────────
    // Average number of present students on diary-logged dates
    let studentCount = 0
    if (divMaster && uniqueSortedDates.length > 0) {
      // Get attendance masters for this class on the diary dates
      const divisionRow = divMaster.division_id
        ? await db.from('divisions').where('id', divMaster.division_id).first()
        : null
      const classId = divisionRow?.class_id

      if (classId) {
        const attendanceData = await db.from('attendance_masters as am')
          .join('attendance_details as ad', 'ad.attendance_master_id', 'am.id')
          .where('am.class_id', classId)
          .where('am.academic_year', academicYear)
          .whereIn('am.attendance_date', uniqueSortedDates)
          .whereIn('ad.attendance_status', ['present', 'late', 'half_day'])
          .groupBy('am.attendance_date')
          .select(db.raw('COUNT(ad.id) as present_count'))

        if (attendanceData.length > 0) {
          const total = attendanceData.reduce((sum: number, row: any) => sum + Number(row.present_count), 0)
          studentCount = Math.round(total / attendanceData.length)
        }
      }
    }

    // Fallback: total enrolled students
    if (studentCount === 0 && divMaster) {
      const countRes = await db.from('student_enrollments')
        .where('division_id', divMaster.division_id)
        .where('academic_year', academicYear)
        .count('* as total')
      studentCount = Number((countRes[0] as any).total || 0)
    }

    // ── G. Build detail strings ───────────────────────────────────────────
    const parentTopicName = subtopics[0]?.topic?.name || 'N/A'
    const subtopicNameHeader = subtopics.map(st => st.name).join(', ')
    const competencyHeader = subtopics[0]?.competency || 'N/A'
    const conclusionText = dailyLogs.map(log => log.conclusion).filter(Boolean).join('\n') || 'N/A'
    const referenceBookText = dailyLogs.map(log => log.referenceBook).filter(Boolean).join('\n') || 'N/A'
    const attendanceText = dailyLogs.map(log => log.attendance).filter(Boolean).join(', ') || 'N/A'

    // Subject + batch string for the boxed detail
    const batchSuffix = batchName ? ` - Batch: ${batchName}` : ''
    const subjectDetailLine = `${subjectName}${batchSuffix}`

    // ── H. Build grid rows (11 columns for 1st Year, 10 columns for others) ───
    const is1stYear = lp.subject?.year === '1st Year'

    let gridHeader: any[] = []
    let gridWidths: string[] = []

    if (is1stYear) {
      gridHeader = [
        { text: 'SI No',                 style: 'tableHeader', alignment: 'center' },
        { text: 'Domain of\nCompetency', style: 'tableHeader', alignment: 'center' },
        { text: 'Subject Area',          style: 'tableHeader', alignment: 'center' },
        { text: 'Miller',                style: 'tableHeader', alignment: 'center' },
        { text: 'Content',               style: 'tableHeader', alignment: 'center' },
        { text: 'SLO',                   style: 'tableHeader', alignment: 'center' },
        { text: 'Bloom/\nGuilbert',      style: 'tableHeader', alignment: 'center' },
        { text: 'Priority',              style: 'tableHeader', alignment: 'center' },
        { text: 'TL MM',                 style: 'tableHeader', alignment: 'center' },
        { text: 'Assessment',            style: 'tableHeader', alignment: 'center' },
        { text: 'Integration',           style: 'tableHeader', alignment: 'center' }
      ]
      gridWidths = ['5%', '12%', '10%', '6%', '10%', '21%', '7%', '6%', '9%', '8%', '6%']
    } else {
      gridHeader = [
        { text: 'SI No',                 style: 'tableHeader', alignment: 'center' },
        { text: 'Domain of\nCompetency', style: 'tableHeader', alignment: 'center' },
        { text: 'Miller',                style: 'tableHeader', alignment: 'center' },
        { text: 'Content',               style: 'tableHeader', alignment: 'center' },
        { text: 'SLO',                   style: 'tableHeader', alignment: 'center' },
        { text: 'Bloom/\nGuilbert',      style: 'tableHeader', alignment: 'center' },
        { text: 'Priority',              style: 'tableHeader', alignment: 'center' },
        { text: 'TL MM',                 style: 'tableHeader', alignment: 'center' },
        { text: 'Assessment',            style: 'tableHeader', alignment: 'center' },
        { text: 'Integration',           style: 'tableHeader', alignment: 'center' }
      ]
      gridWidths = ['6%', '12%', '6%', '11%', '25%', '7%', '6%', '10%', '9%', '8%']
    }

    const gridBody: any[] = [gridHeader]
    subtopics.forEach((st, idx) => {
      const rowData: any[] = [
        { text: st.code || String(idx + 1), alignment: 'center', fontSize: 7 },
        { text: st.competency || '',                            fontSize: 7 }
      ]

      if (is1stYear) {
        rowData.push({ text: st.topic?.name || '',              fontSize: 7 })
      }

      rowData.push(
        { text: st.miller     || '',        alignment: 'center', fontSize: 7 },
        { text: st.name       || '',                             fontSize: 7 },
        { text: st.detail     || st.outcome || '',               fontSize: 7 },
        { text: st.bloom      || '',        alignment: 'center', fontSize: 7 },
        { text: st.priority   || '',        alignment: 'center', fontSize: 7 },
        { text: st.tlMm       || '',        alignment: 'center', fontSize: 7 },
        { text: st.assessment || '',        alignment: 'center', fontSize: 7 },
        { text: st.integration|| '',        alignment: 'center', fontSize: 7 }
      )

      gridBody.push(rowData)
    })

    // ── I. Build PDF document definition ──────────────────────────────────
    const docDefinition: any = {
      pageOrientation: 'landscape',
      pageMargins: [30, 30, 30, 30],
      content: [
        // 1. Header: logo + college name
        {
          columns: [
            {
              width: 70,
              stack: [logoImage ? { image: logoImage, width: 60, height: 60, alignment: 'center' } : {
                canvas: [
                  { type: 'circle', x: 35, y: 30, r: 28, lineWidth: 1.5, lineColor: '#1e293b' },
                  { type: 'circle', x: 35, y: 30, r: 24, lineWidth: 0.8, lineColor: '#1e293b' },
                  { type: 'line', x1: 35, y1: 16, x2: 35, y2: 44, lineWidth: 2, lineColor: '#1e293b' },
                  { type: 'line', x1: 21, y1: 30, x2: 49, y2: 30, lineWidth: 2, lineColor: '#1e293b' }
                ],
                width: 70,
                height: 62
              }]
            },
            {
              width: '*',
              stack: [
                { text: 'C. N. Kothari Homoeopathic Medical College', style: 'collegeTitle', alignment: 'center' },
                { text: '&', style: 'collegeAmpersand', alignment: 'center' },
                { text: 'Research Centre - VYARA', style: 'collegeTitle', alignment: 'center' }
              ],
              margin: [-30, 10, 0, 0]
            }
          ],
          margin: [0, 0, 0, 4]
        },
        // Divider
        {
          canvas: [
            { type: 'rect', x: 0, y: 0, w: 781, h: 1.5, color: '#1e293b' },
            { type: 'rect', x: 0, y: 4, w: 781, h: 0.5, color: '#1e293b' }
          ],
          margin: [0, 4, 0, 8]
        },
        // 2. Boxed details section
        {
          table: {
            widths: ['100%'],
            body: [[{
              stack: [
                { text: subjectDetailLine, style: 'detailsSubject', alignment: 'center' },
                { text: 'Lecture', style: 'detailsLecture', alignment: 'center' },
                {
                  text: [
                    { text: 'Lesson Plan Number:- ', bold: true, color: '#b91c1c' },
                    { text: lpNumber || 'N/A', bold: true, color: '#b91c1c' }
                  ],
                  alignment: 'center', margin: [0, 2, 0, 2], fontSize: 9
                },
                {
                  text: [
                    { text: 'Attendance:- ', bold: true, color: '#b91c1c' },
                    { text: attendanceText, bold: true, color: '#b91c1c' }
                  ],
                  alignment: 'center', margin: [0, 2, 0, 4], fontSize: 9
                },
                {
                  columns: [
                    {
                      text: [
                        { text: 'Date:- ', bold: true, color: '#b91c1c' },
                        { text: datesText, bold: true, color: '#b91c1c' }
                      ],
                      fontSize: 8
                    },
                    {
                      text: [
                        { text: 'Teachers:- ', bold: true, color: '#b91c1c' },
                        { text: teachersText, bold: true, color: '#b91c1c' }
                      ],
                      alignment: 'right', fontSize: 8
                    }
                  ],
                  margin: [0, 4, 0, 4]
                },
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 755, y2: 0, lineWidth: 0.5, lineColor: '#cbd5e1' }], margin: [0, 4, 0, 4] },
                {
                  text: [{ text: 'Topic: ', bold: true }, { text: parentTopicName }],
                  margin: [0, 2, 0, 4], fontSize: 8
                },
                {
                  table: {
                    widths: ['100%'],
                    body: [[{
                      text: `Sub Topic - ${subtopicNameHeader || 'N/A'}`,
                      bold: true, fontSize: 8, margin: [5, 2, 5, 2]
                    }]]
                  },
                  layout: {
                    hLineWidth: () => 1, vLineWidth: () => 1,
                    hLineColor: () => '#16a34a', vLineColor: () => '#16a34a',
                    paddingLeft: () => 0, paddingRight: () => 0,
                    paddingTop: () => 0, paddingBottom: () => 0
                  },
                  margin: [0, 3, 0, 5]
                },
                {
                  text: [{ text: 'Specific Competancies:- ', bold: true }, { text: competencyHeader }],
                  margin: [0, 2, 0, 2], fontSize: 8
                }
              ],
              margin: [8, 6, 8, 6]
            }]]
          },
          layout: {
            hLineWidth: () => 1, vLineWidth: () => 1,
            hLineColor: () => '#94a3b8', vLineColor: () => '#94a3b8'
          },
          margin: [0, 0, 0, 10]
        },
        // 3. Grid table
        {
          table: {
            headerRows: 1,
            widths: gridWidths,
            body: gridBody
          },
          layout: {
            hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
            vLineWidth: (i: number, node: any) => (i === 0 || i === node.table.widths.length) ? 1 : 0.5,
            hLineColor: () => '#475569',
            vLineColor: () => '#475569',
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 4,
            paddingBottom: () => 4
          },
          margin: [0, 0, 0, 8]
        },
        // 4. Conclusion
        {
          text: [
            { text: 'Conclusion:- ', bold: true, color: '#b91c1c' },
            { text: conclusionText, color: '#b91c1c' }
          ],
          margin: [0, 6, 0, 4], fontSize: 8
        },
        // 5. Reference Book
        {
          table: {
            widths: ['100%'],
            body: [[{
              stack: [
                { text: 'Reference Book:-', bold: true, fontSize: 7, margin: [0, 0, 0, 2] },
                { text: referenceBookText, fontSize: 7 }
              ],
              margin: [5, 3, 5, 3]
            }]]
          },
          layout: {
            hLineWidth: () => 0.5, vLineWidth: () => 0.5,
            hLineColor: () => '#cbd5e1', vLineColor: () => '#cbd5e1'
          },
          margin: [0, 4, 0, 8]
        },
        // 6. HOD signature
        { text: 'HOD:-', bold: true, color: '#b91c1c', alignment: 'right', margin: [0, 4, 20, 8], fontSize: 8 }
      ],
      styles: {
        collegeTitle:    { fontSize: 13, bold: true, color: '#1e293b' },
        collegeAmpersand:{ fontSize: 11, bold: true, color: '#1e293b' },
        departmentTitle: { fontSize: 10, bold: true, color: '#1e293b', margin: [0, 3, 0, 0] },
        detailsSubject:  { fontSize: 11, bold: true, color: '#1e293b' },
        detailsLecture:  { fontSize: 9,  bold: true, color: '#1e293b', margin: [0, 1, 0, 1] },
        tableHeader:     { bold: true, fontSize: 8, color: '#0f172a', fillColor: '#f1f5f9' }
      },
      defaultStyle: { font: 'Roboto', fontSize: 8 }
    }

    const printer = new PdfPrinter(fonts, fs as any, { resolve: () => { }, resolved: () => Promise.resolve() })
    const pdfDoc = await (printer as any).createPdfKitDocument(docDefinition)
    pdfDoc.end()

    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', `attachment; filename="LP-${subjectName.replace(/\s+/g, '_')}-${lpNumber}.pdf"`)
    return response.stream(pdfDoc)
  }

}
