import type { HttpContext } from '@adonisjs/core/http'
import NonLectureTemplate from '#models/non_lecture_template'
import NonLectureTemplateTopic from '#models/non_lecture_template_topic'
import NonLectureTeacherAssignment from '#models/non_lecture_teacher_assignment'
import NonLectureLog from '#models/non_lecture_log'
import NonLecturePlanRow from '#models/non_lecture_plan_row'
import DiaryLogPermission from '#models/DiaryLogPermission'
import Staff from '#models/Staff'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Access from '#services/access_control'
import { recalculateProgress } from '#services/non_lecture_plan'

/** Roles that may manage any teacher's non-lecture logs (Admin, Principal, IT Admin, Super Admin, HOD, Developer) */
const LOG_MANAGER_ROLE_IDS = [1, 2, 5, 8, 9, 11]

export default class NonLectureTemplatesController {
  /**
   * List all non-lecture templates for a school
   */
  async index({ request, response, auth }: HttpContext) {
    try {
      const schoolId = request.input('school_id') || auth?.user?.school_id
      const departmentId = request.input('department_id')
      const classId = request.input('class_id')
      const academicSessionId = request.input('academic_session_id')
      const includeInactive = request.input('include_inactive', false)

      let query = NonLectureTemplate.query()

      if (!includeInactive) {
        query = query.where('is_active', true)
      }

      if (schoolId) {
        query = query.where((q) => {
          q.where('school_id', schoolId).orWhereNull('school_id')
        })
      }

      if (departmentId) {
        query = query.where('department_id', departmentId)
      }

      if (classId) {
        query = query.where('class_id', classId)
      }

      if (academicSessionId) {
        query = query.where('academic_session_id', academicSessionId)
      }

      const templates = await query
        .preload('department')
        .preload('class')
        .preload('topics', (tQuery) => tQuery.orderBy('topic_order', 'asc'))
        .preload('assignments', (aQuery) => {
          aQuery.preload('staff')
          aQuery.preload('class')
          aQuery.preload('division')
          aQuery.preload('batch')
        })
        .preload('logs')
        .orderBy('created_at', 'desc')

      // Calculate stats for each template
      const formatted = templates.map((tmpl) => {
        const json = tmpl.toJSON()
        const totalLoggedHours = tmpl.logs?.reduce((sum, l) => sum + Number(l.hoursSpent || 0), 0) || 0
        return {
          ...json,
          topics_count: tmpl.topics?.length || 0,
          assignments_count: tmpl.assignments?.length || 0,
          logs_count: tmpl.logs?.length || 0,
          total_logged_hours: totalLoggedHours,
        }
      })

      return response.status(200).json({ success: true, data: formatted })
    } catch (error: any) {
      console.error('NonLectureTemplatesController.index error:', error)
      return response.status(500).json({ success: false, message: 'Failed to fetch templates: ' + error.message })
    }
  }

  /**
   * Create a new non-lecture template with optional initial topics
   */
  async store({ request, response, auth }: HttpContext) {
    const trx = await db.transaction()
    try {
      const body = { ...request.all(), ...request.body() }
      const {
        title,
        code,
        activity_type,
        activityType,
        total_hours,
        totalHours,
        description,
        department_id,
        departmentId,
        class_id,
        classId,
        academic_session_id,
        academicSessionId,
        is_active = true,
        isActive,
        topics = [],
      } = body

      if (!title) {
        await trx.rollback()
        return response.badRequest({ success: false, message: 'Template title is required' })
      }

      const finalSchoolId = body.school_id || body.schoolId || auth?.user?.school_id || 1
      const finalCode = code || title.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 30)
      const finalActivityType = activity_type || activityType || 'Clinical Posting'
      const finalIsActive = isActive !== undefined ? isActive : is_active
      const finalTotalHours = total_hours !== undefined ? total_hours : (totalHours || 0)

      const template = await NonLectureTemplate.create(
        {
          title,
          code: finalCode,
          activityType: finalActivityType,
          totalHours: Number(finalTotalHours),
          description: description || null,
          departmentId: department_id || departmentId || null,
          classId: class_id || classId || null,
          subjectId: Number(body.subject_id || body.subjectId) || null,
          academicSessionId: academic_session_id || academicSessionId || null,
          schoolId: finalSchoolId,
          isActive: finalIsActive,
          pdfConfig: body.pdf_config || body.pdfConfig || null,
        },
        { client: trx }
      )

      // Create initial topics if provided
      if (Array.isArray(topics) && topics.length > 0) {
        let order = 1
        for (const topic of topics) {
          if (!topic.title && !topic.name) continue
          await NonLectureTemplateTopic.create(
            {
              templateId: template.id,
              topicOrder: topic.topic_order || topic.topicOrder || order++,
              title: topic.title || topic.name,
              hours: Number(topic.hours || 1),
              activityType: topic.activity_type || topic.activityType || finalActivityType,
              learningObjectives: topic.learning_objectives || topic.learningObjectives || null,
              remarks: topic.remarks || null,
            },
            { client: trx }
          )
        }
      }

      await trx.commit()

      // Reload with relations
      const freshTemplate = await NonLectureTemplate.query()
        .where('id', template.id)
        .preload('department')
        .preload('class')
        .preload('topics', (tQuery) => tQuery.orderBy('topic_order', 'asc'))
        .firstOrFail()

      return response.status(201).json({
        success: true,
        message: 'Non-lecture template created successfully',
        data: freshTemplate,
      })
    } catch (error: any) {
      await trx.rollback()
      console.error('NonLectureTemplatesController.store error:', error)
      return response.status(500).json({ success: false, message: 'Failed to create template: ' + error.message })
    }
  }

  /**
   * Get single template details
   */
  async show({ params, response }: HttpContext) {
    try {
      const template = await NonLectureTemplate.query()
        .where('id', params.id)
        .preload('department')
        .preload('class')
        .preload('topics', (tQuery) => tQuery.orderBy('topic_order', 'asc'))
        .preload('assignments', (aQuery) => {
          aQuery.preload('staff')
          aQuery.preload('class')
          aQuery.preload('division')
          aQuery.preload('batch')
          aQuery.preload('assigner')
        })
        .preload('logs', (lQuery) => {
          lQuery.preload('staff')
          lQuery.preload('topic')
          lQuery.orderBy('date', 'desc')
        })
        .firstOrFail()

      return response.status(200).json({ success: true, data: template })
    } catch (error: any) {
      return response.status(404).json({ success: false, message: 'Template not found', error: error.message })
    }
  }

  /**
   * Update template metadata and topic contents
   */
  async update({ params, request, response }: HttpContext) {
    const trx = await db.transaction()
    try {
      const template = await NonLectureTemplate.findOrFail(params.id, { client: trx })
      const body = { ...request.all(), ...request.body() }
      const {
        title,
        code,
        activity_type,
        activityType,
        total_hours,
        totalHours,
        description,
        department_id,
        departmentId,
        class_id,
        classId,
        academic_session_id,
        academicSessionId,
        is_active,
        isActive,
        topics,
      } = body

      if (title !== undefined) template.title = title
      if (code !== undefined) template.code = code
      if (activity_type !== undefined || activityType !== undefined) {
        template.activityType = activity_type || activityType
      }
      if (total_hours !== undefined || totalHours !== undefined) {
        template.totalHours = Number(total_hours !== undefined ? total_hours : totalHours)
      }
      if (description !== undefined) template.description = description
      if (department_id !== undefined || departmentId !== undefined) {
        template.departmentId = department_id || departmentId || null
      }
      if (class_id !== undefined || classId !== undefined) {
        template.classId = class_id || classId || null
      }
      if (academic_session_id !== undefined || academicSessionId !== undefined) {
        template.academicSessionId = academic_session_id || academicSessionId || null
      }
      if (body.subject_id !== undefined || body.subjectId !== undefined) {
        template.subjectId = Number(body.subject_id ?? body.subjectId) || null
      }
      if (is_active !== undefined || isActive !== undefined) {
        template.isActive = isActive !== undefined ? isActive : is_active
      }
      if (body.pdf_config !== undefined || body.pdfConfig !== undefined) {
        template.pdfConfig = body.pdf_config !== undefined ? body.pdf_config : body.pdfConfig
      }

      await template.save()

      // If topics are passed, update or sync them
      if (Array.isArray(topics)) {
        // Keep existing topics that are in the list or replace
        const incomingIds = topics.filter((t) => t.id).map((t) => Number(t.id))
        
        // Remove topics not in incoming list
        await NonLectureTemplateTopic.query({ client: trx })
          .where('template_id', template.id)
          .whereNotIn('id', incomingIds.length > 0 ? incomingIds : [-1])
          .delete()

        let order = 1
        for (const t of topics) {
          if (!t.title && !t.name) continue
          const topicData = {
            templateId: template.id,
            topicOrder: t.topic_order || t.topicOrder || order++,
            title: t.title || t.name,
            hours: Number(t.hours || 1),
            activityType: t.activity_type || t.activityType || template.activityType,
            learningObjectives: t.learning_objectives || t.learningObjectives || null,
            remarks: t.remarks || null,
          }

          if (t.id) {
            const existingTopic = await NonLectureTemplateTopic.find(t.id, { client: trx })
            if (existingTopic && existingTopic.templateId === template.id) {
              existingTopic.merge(topicData)
              await existingTopic.save()
            }
          } else {
            await NonLectureTemplateTopic.create(topicData, { client: trx })
          }
        }
      }

      await trx.commit()

      const updated = await NonLectureTemplate.query()
        .where('id', template.id)
        .preload('department')
        .preload('class')
        .preload('topics', (tQuery) => tQuery.orderBy('topic_order', 'asc'))
        .firstOrFail()

      return response.status(200).json({
        success: true,
        message: 'Template updated successfully',
        data: updated,
      })
    } catch (error: any) {
      await trx.rollback()
      console.error('NonLectureTemplatesController.update error:', error)
      return response.status(500).json({ success: false, message: 'Failed to update template: ' + error.message })
    }
  }

  /**
   * Delete template
   */
  async destroy({ params, response }: HttpContext) {
    try {
      const template = await NonLectureTemplate.findOrFail(params.id)
      await template.delete()
      return response.status(200).json({ success: true, message: 'Template deleted successfully' })
    } catch (error: any) {
      return response.status(500).json({ success: false, message: 'Failed to delete template: ' + error.message })
    }
  }

  /**
   * Assign teacher(s) to a non-lecture template
   */
  async assignTeachers({ request, response, auth }: HttpContext) {
    const trx = await db.transaction()
    try {
      const body = { ...request.all(), ...request.body() }
      const {
        template_id,
        templateId,
        staff_ids,
        staffIds,
        staff_id,
        staffId,
        class_id,
        classId,
        division_id,
        divisionId,
        batch_id,
        batchId,
        batch_name,
        batchName,
        academic_session_id,
        academicSessionId,
        notes,
      } = body

      const finalTemplateId = template_id || templateId
      if (!finalTemplateId) {
        await trx.rollback()
        return response.badRequest({ success: false, message: 'Template ID is required' })
      }

      const targetStaffIds: number[] = []
      if (Array.isArray(staff_ids || staffIds)) {
        targetStaffIds.push(...(staff_ids || staffIds).map(Number))
      } else if (staff_id || staffId) {
        targetStaffIds.push(Number(staff_id || staffId))
      }

      if (targetStaffIds.length === 0) {
        await trx.rollback()
        return response.badRequest({ success: false, message: 'At least one staff/teacher must be selected' })
      }

      const createdAssignments: any[] = []

      for (const sId of targetStaffIds) {
        // Check if already assigned for this template and batch
        const existing = await NonLectureTeacherAssignment.query({ client: trx })
          .where('template_id', finalTemplateId)
          .where('staff_id', sId)
          .where('academic_session_id', academic_session_id || academicSessionId || null)
          .where('batch_name', batch_name || batchName || null)
          .first()

        if (!existing) {
          const assignment = await NonLectureTeacherAssignment.create(
            {
              templateId: finalTemplateId,
              staffId: sId,
              classId: class_id || classId || null,
              divisionId: division_id || divisionId || null,
              batchId: batch_id || batchId || null,
              batchName: batch_name || batchName || null,
              academicSessionId: academic_session_id || academicSessionId || null,
              assignedBy: auth?.user?.id || null,
              status: 'Active',
              notes: notes || null,
            },
            { client: trx }
          )
          createdAssignments.push(assignment)
        }
      }

      await trx.commit()

      return response.status(200).json({
        success: true,
        message: `Successfully assigned ${createdAssignments.length} teacher(s)`,
        data: createdAssignments,
      })
    } catch (error: any) {
      await trx.rollback()
      console.error('NonLectureTemplatesController.assignTeachers error:', error)
      return response.status(500).json({ success: false, message: 'Failed to assign teachers: ' + error.message })
    }
  }

  /**
   * Delete / remove a teacher assignment
   */
  async removeAssignment({ params, response }: HttpContext) {
    try {
      const assignment = await NonLectureTeacherAssignment.findOrFail(params.id)
      await assignment.delete()
      return response.status(200).json({ success: true, message: 'Teacher assignment removed successfully' })
    } catch (error: any) {
      return response.status(500).json({ success: false, message: 'Failed to remove assignment: ' + error.message })
    }
  }

  /**
   * Teacher view: Get all non-lecture sessions assigned to the logged-in teacher
   */
  async getMyAssignedSessions({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      let staffId = user.staff_id || request.input('staff_id')

      if (!staffId) {
        // Fallback: lookup staff by user email and school_id
        const staffQuery = Staff.query()
        if (user.school_id) {
          staffQuery.where('school_id', user.school_id)
        }
        if (user.email) {
          staffQuery.where('email', user.email)
        }
        const staffRec = await staffQuery.first()
        if (staffRec) {
          staffId = staffRec.id
        }
      }

      if (!staffId) {
        return response.status(200).json({
          success: true,
          data: [],
          message: 'No staff record found for current user',
        })
      }

      const academicSessionId = request.input('academic_session_id')

      let query = NonLectureTeacherAssignment.query()
        .where('staff_id', staffId)
        .where('status', 'Active')

      if (academicSessionId) {
        query = query.where((q) => {
          q.where('academic_session_id', academicSessionId).orWhereNull('academic_session_id')
        })
      }

      const assignments = await query
        .preload('template', (tQuery) => {
          tQuery.preload('department')
          tQuery.preload('class')
          tQuery.preload('topics', (tpQuery) => {
            tpQuery.orderBy('topic_order', 'asc')
            tpQuery.preload('rows', (rQuery) => rQuery.orderBy('row_order', 'asc'))
          })
        })
        .preload('class')
        .preload('division')
        .preload('batch')
        .preload('logs', (lQuery) => {
          lQuery.where('staff_id', staffId).preload('topic').orderBy('date', 'desc')
        })
        .orderBy('created_at', 'desc')

      // Calculate progress and completed hours for each assignment
      const formatted = assignments.map((assign) => {
        const json = assign.toJSON()
        const myLogs = assign.logs || []
        const loggedHours = myLogs.reduce((sum, l) => sum + Number(l.hoursSpent || 0), 0)
        const totalTargetHours = Number(assign.template?.totalHours || 0)
        const completionPercentage = totalTargetHours > 0 ? Math.min(100, Math.round((loggedHours / totalTargetHours) * 100)) : 0
        // syllabus rows this teacher/batch has already covered (so the log dialog can show them as done)
        const coveredRowIds = [...new Set(myLogs.flatMap((l) => (l.rowIds || []).map(Number)))]
        const allRows = (assign.template?.topics || []).flatMap((tp) => tp.rows || [])

        return {
          ...json,
          template_id: assign.templateId || assign.template?.id,
          templateId: assign.templateId || assign.template?.id,
          staff_id: assign.staffId,
          staffId: assign.staffId,
          batch_name: assign.batchName,
          class_id: assign.classId,
          logged_hours: loggedHours,
          target_hours: totalTargetHours,
          completion_percentage: completionPercentage,
          logged_sessions_count: myLogs.length,
          covered_row_ids: coveredRowIds,
          rows_total: allRows.length,
          rows_covered: allRows.filter((r) => coveredRowIds.includes(r.id)).length,
        }
      })

      return response.status(200).json({ success: true, data: formatted })
    } catch (error: any) {
      console.error('NonLectureTemplatesController.getMyAssignedSessions error:', error)
      return response.status(500).json({ success: false, message: 'Failed to fetch teacher sessions: ' + error.message })
    }
  }

  /**
   * Log non-lecture activity by teacher
   */
  async logActivity({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const body = { ...request.all(), ...request.body() }
      const templateId = Number(body.template_id || body.templateId)
      if (!templateId) {
        return response.badRequest({ success: false, message: 'Template ID is required' })
      }

      const template = await NonLectureTemplate.find(templateId)
      if (!template || (template.schoolId && Number(template.schoolId) !== Number(user.school_id))) {
        return response.notFound({ success: false, message: 'Template not found' })
      }

      let staffId = user.staff_id || body.staff_id || body.staffId
      if (!staffId) {
        const staffQuery = Staff.query()
        if (user.school_id) {
          staffQuery.where('school_id', user.school_id)
        }
        if (user.email) {
          staffQuery.where('email', user.email)
        }
        const staffRec = await staffQuery.first()
        staffId = staffRec?.id
      }
      if (!staffId) {
        return response.badRequest({ success: false, message: 'Staff identity could not be verified' })
      }

      const finalDate = body.date || new Date().toISOString().split('T')[0]

      // Same rule as the subject daily diary: teachers log for today unless they were given permission for that date
      if ([6, 10].includes(Number(user.role_id))) {
        const today = DateTime.now().toISODate()
        if (finalDate !== today) {
          const permission = await DiaryLogPermission.query()
            .where('staff_id', Number(staffId))
            .where('date', finalDate)
            .first()
          if (!permission) {
            return response.badRequest({
              success: false,
              message:
                'Daily diary can only be logged for the current day. Retrospective or future logging is not permitted unless granted permission.',
            })
          }
        }
      }

      // The topic and the syllabus rows must belong to this plan
      const topicIdInput = body.topic_id || body.topicId
      let topicId: number | null = null
      if (topicIdInput) {
        const topic = await NonLectureTemplateTopic.query()
          .where('id', Number(topicIdInput))
          .where('template_id', template.id)
          .first()
        if (!topic) {
          return response.badRequest({ success: false, message: 'The selected topic does not belong to this lesson plan.' })
        }
        if (
          [6, 10].includes(Number(user.role_id)) &&
          topic.assignedStaffIds.length > 0 &&
          !topic.assignedStaffIds.map(Number).includes(Number(staffId))
        ) {
          return response.forbidden({ success: false, message: 'This topic is assigned to another teacher.' })
        }
        topicId = topic.id
      }

      const rowIdsInput = body.row_ids ?? body.rowIds
      const requestedRowIds: number[] = Array.isArray(rowIdsInput)
        ? [...new Set(rowIdsInput.map(Number).filter((n: number) => Number.isFinite(n)))]
        : []
      let coveredRows: NonLecturePlanRow[] = []
      if (requestedRowIds.length) {
        const rowQuery = NonLecturePlanRow.query()
          .whereIn('id', requestedRowIds)
          .whereIn('topic_id', db.from('non_lecture_template_topics').where('template_id', template.id).select('id'))
        if (topicId) rowQuery.where('topic_id', topicId)
        coveredRows = await rowQuery.orderBy('row_order', 'asc')
        if (coveredRows.length !== requestedRowIds.length) {
          return response.badRequest({
            success: false,
            message: 'Some of the selected syllabus rows do not belong to this topic.',
          })
        }
      }

      const assignmentIdInput = body.assignment_id || body.assignmentId
      let assignmentId: number | null = null
      if (assignmentIdInput) {
        const assignment = await NonLectureTeacherAssignment.query()
          .where('id', Number(assignmentIdInput))
          .where('template_id', template.id)
          .first()
        if (!assignment) {
          return response.badRequest({ success: false, message: 'The assignment does not belong to this lesson plan.' })
        }
        assignmentId = assignment.id
      }

      // What was done: written by the teacher, or taken from the rows they ticked
      const writtenDetails = body.activity_details || body.activityDetails
      const finalActivityDetails =
        writtenDetails ||
        (coveredRows.length
          ? 'Covered: ' + coveredRows.map((r) => r.content || r.competency || r.slNo || '').filter(Boolean).join('; ')
          : '')
      if (!finalActivityDetails) {
        return response.badRequest({ success: false, message: 'Activity details / description is required' })
      }

      const hoursInput = body.hours_spent !== undefined ? body.hours_spent : body.hoursSpent || 1
      const lessonPlanNumber = body.lesson_plan_number ?? body.lessonPlanNumber ?? coveredRows[0]?.lessonPlanNumber ?? null

      const log = await NonLectureLog.create({
        templateId: template.id,
        assignmentId,
        topicId,
        staffId: Number(staffId),
        date: finalDate,
        hoursSpent: Number(hoursInput),
        batchName: body.batch_name || body.batchName || null,
        studentsCount: body.students_count || body.studentsCount ? Number(body.students_count || body.studentsCount) : null,
        activityDetails: finalActivityDetails,
        learningOutcomes: body.learning_outcomes || body.learningOutcomes || null,
        clinicalCases: body.clinical_cases || body.clinicalCases || null,
        remarks: body.remarks || null,
        rowIds: coveredRows.map((r) => r.id),
        conclusion: body.conclusion || null,
        referenceBook: body.reference_book || body.referenceBook || null,
        lessonPlanNumber: lessonPlanNumber ? String(lessonPlanNumber).slice(0, 30) : null,
        periodsConfigId: Number(body.periods_config_id || body.periodsConfigId) || null,
      })

      await recalculateProgress(template.id)

      const loadedLog = await NonLectureLog.query()
        .where('id', log.id)
        .preload('template')
        .preload('topic')
        .preload('staff')
        .firstOrFail()

      return response.status(201).json({
        success: true,
        message: 'Non-lecture activity logged successfully',
        data: loadedLog,
      })
    } catch (error: any) {
      console.error('NonLectureTemplatesController.logActivity error:', error)
      return response.status(500).json({ success: false, message: 'Failed to log non-lecture activity: ' + error.message })
    }
  }

  /**
   * Get logs list with filters (for reports or audit)
   */
  async getLogs({ request, response, auth }: HttpContext) {
    try {
      const templateId = request.input('template_id')
      const staffId = request.input('staff_id')
      const fromDate = request.input('from_date')
      const toDate = request.input('to_date')

      let query = NonLectureLog.query()
        .preload('template', (t) => t.preload('class').preload('department'))
        .preload('topic')
        .preload('staff')

      if (templateId) {
        query = query.where('template_id', templateId)
      }

      if (staffId) {
        query = query.where('staff_id', staffId)
      } else if (auth?.user?.staff_id && (auth.user.role_id === 6 || auth.user.role_id === 10)) {
        // Teacher role views only their own logs
        query = query.where('staff_id', auth.user.staff_id)
      }

      if (fromDate) {
        query = query.where('date', '>=', fromDate)
      }

      if (toDate) {
        query = query.where('date', '<=', toDate)
      }

      const logs = await query.orderBy('date', 'desc').orderBy('created_at', 'desc')

      return response.status(200).json({ success: true, data: logs })
    } catch (error: any) {
      return response.status(500).json({ success: false, message: 'Failed to fetch logs: ' + error.message })
    }
  }

  /**
   * Delete a log entry
   */
  async deleteLog({ params, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const log = await NonLectureLog.findOrFail(params.id)
      const template = await NonLectureTemplate.find(log.templateId)
      if (template?.schoolId && Number(template.schoolId) !== Number(user.school_id)) {
        return response.status(404).json({ success: false, message: 'Log not found' })
      }
      const isAuthor = !!user.staff_id && Number(log.staffId) === Number(user.staff_id)
      if (!isAuthor && !(await Access.allows(user, 'delete', 'LessonPlan', LOG_MANAGER_ROLE_IDS))) {
        return response.status(403).json({ success: false, message: 'You can only delete your own logs.' })
      }
      const templateId = log.templateId
      await log.delete()
      await recalculateProgress(templateId)
      return response.status(200).json({ success: true, message: 'Log deleted successfully' })
    } catch (error: any) {
      return response.status(500).json({ success: false, message: 'Failed to delete log: ' + error.message })
    }
  }

  /**
   * Get default PDF export settings
   */
  async getPdfSettings({ request, response, auth }: HttpContext) {
    try {
      const schoolId = request.input('school_id') || auth?.user?.school_id || 1
      const setting = await db
        .from('non_lecture_pdf_settings')
        .where('school_id', schoolId)
        .where('setting_key', 'default')
        .first()

      let config = null
      if (setting && setting.config) {
        try {
          config = typeof setting.config === 'string' ? JSON.parse(setting.config) : setting.config
        } catch {
          config = setting.config
        }
      }

      return response.status(200).json({ success: true, data: config })
    } catch (error: any) {
      return response.status(500).json({ success: false, message: 'Failed to get PDF settings: ' + error.message })
    }
  }

  /**
   * Save default PDF export settings
   */
  async savePdfSettings({ request, response, auth }: HttpContext) {
    try {
      const schoolId = request.input('school_id') || auth?.user?.school_id || 1
      const config = request.input('config')

      const existing = await db
        .from('non_lecture_pdf_settings')
        .where('school_id', schoolId)
        .where('setting_key', 'default')
        .first()

      const stringifiedConfig = typeof config === 'object' ? JSON.stringify(config) : config

      if (existing) {
        await db
          .from('non_lecture_pdf_settings')
          .where('id', existing.id)
          .update({
            config: stringifiedConfig,
            updated_at: new Date(),
          })
      } else {
        await db.table('non_lecture_pdf_settings').insert({
          school_id: schoolId,
          setting_key: 'default',
          config: stringifiedConfig,
          created_at: new Date(),
          updated_at: new Date(),
        })
      }

      return response.status(200).json({
        success: true,
        message: 'PDF export settings saved successfully',
        data: config,
      })
    } catch (error: any) {
      return response.status(500).json({ success: false, message: 'Failed to save PDF settings: ' + error.message })
    }
  }
}
