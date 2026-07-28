import type { HttpContext } from '@adonisjs/core/http'
import DailyDiary from '#models/DailyDiary'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class DailyDiariesController {
  
  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    console.log('DailyDiary Store - User:', { id: user.id, staff_id: user.staff_id, role_id: user.role_id })
    
    const inputData = request.only([
      'periodsConfigId', 
      'date', 
      'topicCovered', 
      'resourcesUsed', 
      'attendanceRemarks',
      'topicIds',
      'subtopicIds',
      'conclusion',
      'referenceBook',
      'attendance'
    ])
    console.log('DailyDiary Store - Input:', inputData)

    // Enforce that school teachers (role 6) can only log daily diaries on the current day
    if (user.role_id === 6 || user.role_id === 10) {
      const todayStr = DateTime.now().toISODate() // 'YYYY-MM-DD'
      if (inputData.date !== todayStr) {
        return response.badRequest({
          message: 'Daily diary can only be logged for the current day. Retrospective or future logging is not permitted.'
        })
      }
    }

    // Find period details
    const periodDetails = await db.from('periods_config as pc')
      .join('class_day_config as cdc', 'pc.class_day_config_id', 'cdc.id')
      .join('school_timetable_config as stc', 'cdc.school_timetable_config_id', 'stc.id')
      .where('pc.id', inputData.periodsConfigId)
      .select(
        'stc.academic_year',
        'pc.staff_enrollment_id',
        'pc.subjects_division_masters_id'
      )
      .first()

    console.log('DailyDiary Store - Period Details:', periodDetails)

    if (!periodDetails) {
      console.log('DailyDiary Store - Error: Period not found', { periodsConfigId: inputData.periodsConfigId })
      return response.badRequest({ message: 'Period not found in timetable configuration' })
    }

    let targetStaffEnrollmentId: number | null = null

    // STRATEGY 1: Current user's own enrollment in this session
    if (user.staff_id) {
      let staffEnrollment = await db.from('staff_enrollments')
        .where('staff_id', user.staff_id)
        .where('academic_year', periodDetails.academic_year)
        .first()
        
      if (!staffEnrollment) {
        // Fallback: get the most recent enrollment if academic_year doesn't match
        staffEnrollment = await db.from('staff_enrollments')
          .where('staff_id', user.staff_id)
          .orderBy('id', 'desc')
          .first()
      }
      
      if (staffEnrollment) {
        targetStaffEnrollmentId = staffEnrollment.id
        console.log('DailyDiary Store - Strategy 1 (Self Enrollment) Success:', targetStaffEnrollmentId)
      }
    } 
    
    // STRATEGY 2: Admin Bypass - Use period assigned teacher
    if (!targetStaffEnrollmentId && [1, 7, 8].includes(user.role_id)) {
      if (periodDetails.staff_enrollment_id) {
        targetStaffEnrollmentId = periodDetails.staff_enrollment_id
        console.log('DailyDiary Store - Strategy 2 (Period Assigned Teacher) Success:', targetStaffEnrollmentId)
      }
    }

    // STRATEGY 3: Admin Bypass - Use subject-teacher mapping if period is missing assignment
    if (!targetStaffEnrollmentId && [1, 7, 8].includes(user.role_id)) {
      if (periodDetails.subjects_division_masters_id) {
        const subjectStaff = await db.from('subjects_division_staff_masters')
          .where('subjects_division_id', periodDetails.subjects_division_masters_id)
          .first()
        
        if (subjectStaff) {
          targetStaffEnrollmentId = subjectStaff.staff_enrollment_id
          console.log('DailyDiary Store - Strategy 3 (Subject Mapping) Success:', targetStaffEnrollmentId)
        }
      }
    }

    // STRATEGY 4: Admin Bypass - Use ANY enrollment for the current user if they have a staff record
    if (!targetStaffEnrollmentId && [1, 7, 8].includes(user.role_id) && user.staff_id) {
      const anyEnrollment = await db.from('staff_enrollments')
        .where('staff_id', user.staff_id)
        .first()
      
      if (anyEnrollment) {
        targetStaffEnrollmentId = anyEnrollment.id
        console.log('DailyDiary Store - Strategy 4 (Admin Any Enrollment) Success:', targetStaffEnrollmentId)
      }
    }

    if (!targetStaffEnrollmentId) {
      console.log('DailyDiary Store - Authorization Failure: No valid enrollment found.')
      return response.forbidden({ 
        message: 'You are not authorized to log for this period. No teacher is assigned to this period in the timetable, and no default teacher was found for this subject.',
        debug: {
          role_id: user.role_id,
          staff_id: user.staff_id,
          period_session_id: periodDetails.academic_year,
          period_assigned_teacher: periodDetails.staff_enrollment_id,
          subject_master_id: periodDetails.subjects_division_masters_id
        }
      })
    }

    const data = {
      periodsConfigId: inputData.periodsConfigId,
      date: inputData.date,
      topicCovered: inputData.topicCovered,
      resourcesUsed: inputData.resourcesUsed,
      attendanceRemarks: inputData.attendanceRemarks,
      conclusion: inputData.conclusion || null,
      referenceBook: inputData.referenceBook || null,
      attendance: inputData.attendance || null,
      staffEnrollmentId: targetStaffEnrollmentId,
      topicIds: inputData.topicIds || [],
      subtopicIds: inputData.subtopicIds || []
    }

    // Upsert logic
    const existing = await DailyDiary.query()
      .where('periodsConfigId', data.periodsConfigId)
      .where('date', data.date)
      .first()

    let diary: DailyDiary
    let isCreated = false

    if (existing) {
      existing.merge(data)
      await existing.save()
      diary = existing
      console.log('DailyDiary Store - Updated existing log:', existing.id)
    } else {
      diary = await DailyDiary.create(data)
      isCreated = true
      console.log('DailyDiary Store - Created new log:', diary.id)
    }

    // Mark subtopics as completed
    if (inputData.subtopicIds && Array.isArray(inputData.subtopicIds)) {
      await db.from('lesson_plan_subtopics')
        .whereIn('id', inputData.subtopicIds)
        .update({ is_completed: true })
    }

    return response.status(isCreated ? 201 : 200).json(diary)
  }

  async getLogsByDateRange({ request, response, auth }: HttpContext) {
    const { startDate, endDate, staffId } = request.qs()
    const user = auth.user!
    await user.load('role')
    const userRole = user.role?.role || 'UNKNOWN'
    
    let query = DailyDiary.query()
      .preload('periodConfig', (p) => {
        p.preload('period_config_subject', (s) => s.preload('subject'))
        p.preload('period_config_class_day', (d) => d.preload('class'))
      })
      .preload('staffEnrollment', (se) => se.preload('staff'))
    
    if (startDate && endDate) {
      query.whereBetween('date', [startDate, endDate])
    }

    // Determine if we should filter by staff
    let targetStaffId: number | undefined = undefined

    if (user.role_id === 6 || user.role_id === 10) {
      targetStaffId = user.staff_id || undefined
    } else if (staffId) {
      // If staffId is explicitly provided in request, use it
      targetStaffId = Number(staffId)
    } else if (userRole === 'SCHOOL_TEACHER' || userRole === 'HEAD_TEACHER') {
      // If it's a teacher and no staffId provided, default to their own logs
      targetStaffId = user.staff_id || undefined
    }

    if (targetStaffId) {
      query.whereHas('staffEnrollment', (sq) => {
        sq.where('staff_id', targetStaffId)
      })
    }

    // Filter by school_id
    if (user.school_id) {
      query.whereHas('periodConfig', (pq) => {
        pq.whereHas('period_config_class_day', (cq) => {
          cq.whereHas('class', (cl) => {
            cl.where('school_id', user.school_id!)
          })
        })
      })
    }

    console.log('DailyDiary getLogs - SQL:', query.toSQL().toNative())
    const logs = await query.orderBy('date', 'desc')
    console.log(`DailyDiary getLogs - Found ${logs.length} logs for school ${user.school_id}, role: ${userRole}, targetStaffId: ${targetStaffId}`)
    
    const allSubtopicIds = new Set<number>()
    logs.forEach(log => {
      if (log.subtopicIds && Array.isArray(log.subtopicIds)) {
        log.subtopicIds.forEach(id => allSubtopicIds.add(id))
      }
    })

    let subtopicsMetadata: Record<number, any> = {}
    if (allSubtopicIds.size > 0) {
      const subtopics = await db.from('lesson_plan_subtopics')
        .whereIn('id', Array.from(allSubtopicIds))
        .select('id', 'required_hours', 'lesson_plan_number', 'name', 'code', 'competency', 'outcome')
      
      subtopics.forEach(s => {
        subtopicsMetadata[s.id] = s
      })
    }

    const logsWithMetadata = logs.map(log => {
      const logJson = log.toJSON()
      if (log.subtopicIds && Array.isArray(log.subtopicIds)) {
        logJson.subtopics = log.subtopicIds.map(id => subtopicsMetadata[id]).filter(Boolean)
      } else {
        logJson.subtopics = []
      }
      return logJson
    })

    return response.json({
      data: logsWithMetadata,
      debug: {
        sql: query.toSQL().toNative(),
        count: logs.length,
        school_id: user.school_id,
        user_role: userRole,
        targetStaffId: targetStaffId
      }
    })
  }
}