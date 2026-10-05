import type { HttpContext } from '@adonisjs/core/http'
import DailyDiary from '#models/DailyDiary'
import DailyDiaryManualEntry from '#models/DailyDiaryManualEntry'
import DiaryLogPermission from '#models/DiaryLogPermission'
import LessonPlanTopic from '#models/LessonPlanTopic'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import path from 'node:path'
import fs from 'node:fs'
// @ts-ignore
import PdfPrinterPkg from 'pdfmake/js/Printer.js'
const PdfPrinter = PdfPrinterPkg.default || PdfPrinterPkg

const fonts = {
  Roboto: {
    normal: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Regular.ttf'),
    bold: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Medium.ttf'),
    italics: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Italic.ttf'),
    bolditalics: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-MediumItalic.ttf')
  }
}

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
      'topicDurations',
      'conclusion',
      'referenceBook',
      'attendance'
    ])
    console.log('DailyDiary Store - Input:', inputData)

    // Enforce that school teachers (role 6) can only log daily diaries on the current day
    if (user.role_id === 6 || user.role_id === 10) {
      const todayStr = DateTime.now().toISODate() // 'YYYY-MM-DD'
      if (inputData.date !== todayStr) {
        let hasPermission = false
        if (user.staff_id) {
          const permission = await DiaryLogPermission.query()
            .where('staff_id', user.staff_id)
            .where('date', inputData.date)
            .first()
          if (permission) {
            hasPermission = true
          }
        }
        
        if (!hasPermission) {
          return response.badRequest({
            message: 'Daily diary can only be logged for the current day. Retrospective or future logging is not permitted unless granted permission.'
          })
        }
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
      subtopicIds: inputData.subtopicIds || [],
      topicDurations: inputData.topicDurations || {}
    }

    const inputTopicDurations = data.topicDurations || {}
    const topicDiffs = new Map<number, number>()

    for (const [topicIdStr, newDuration] of Object.entries(inputTopicDurations)) {
      const topicId = Number(topicIdStr)
      const duration = Number(newDuration)
      if (isNaN(duration) || isNaN(topicId) || duration <= 0) continue

      topicDiffs.set(topicId, duration)
    }

    const topicsToUpdate: Array<{ topic: LessonPlanTopic; diff: number; realRequired: number }> = []
    for (const [topicId, diff] of topicDiffs.entries()) {
      const topic = await LessonPlanTopic.find(topicId)
      if (!topic) continue

      // Calculate real required hours from subtopics if present
      const subtopics = await db.from('lesson_plan_subtopics').where('topic_id', topicId)
      const subtopicsSum = subtopics.reduce((acc, st) => acc + (Number(st.required_hours) || 0), 0)
      const realRequired = subtopics.length > 0 && subtopicsSum > 0 ? subtopicsSum : topic.requiredHours

      // Calculate remaining allowed hours
      const remaining = Math.max(0, realRequired - topic.completedHours)

      // Cap diff to remaining so slight rounding or defaults don't fail the request
      let actualDiff = diff
      if (diff > remaining && remaining > 0) {
        actualDiff = remaining
      }

      if (topic.completedHours + actualDiff > realRequired + 0.01) {
        return response.badRequest({
          message: `Cannot log additional ${diff} hour(s) for topic "${topic.name}". It exceeds the required ${realRequired} hours (currently ${topic.completedHours}h completed).`
        })
      }

      topicsToUpdate.push({ topic, diff: actualDiff, realRequired })
    }

    // Apply updates to topics and subtopics
    for (const update of topicsToUpdate) {
      update.topic.completedHours = Math.round((update.topic.completedHours + update.diff) * 100) / 100
      update.topic.requiredHours = update.realRequired
      const isTopicDone = update.topic.completedHours >= (update.realRequired - 0.01)
      update.topic.isCompleted = isTopicDone
      await update.topic.save()

      // Only mark subtopics as completed if the total required hours for the topic are completed
      if (isTopicDone) {
        await db.from('lesson_plan_subtopics')
          .where('topic_id', update.topic.id)
          .update({ is_completed: true })
      } else {
        await db.from('lesson_plan_subtopics')
          .where('topic_id', update.topic.id)
          .update({ is_completed: false })
      }
    }

    const diary = await DailyDiary.create(data)
    console.log('DailyDiary Store - Created new log:', diary.id)

    return response.status(201).json(diary)
  }

  async storeManual({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const body = request.body()
    const rawEntries = Array.isArray(body) ? body : (body.entries || [body])

    if (!rawEntries || rawEntries.length === 0) {
      return response.badRequest({ message: 'No entries provided' })
    }

    let targetStaffId = user.staff_id
    if (!targetStaffId && [1, 7, 8].includes(user.role_id) && body.staffId) {
      targetStaffId = Number(body.staffId)
    }

    if (!targetStaffId) {
      return response.forbidden({ message: 'No staff ID associated with user' })
    }

    const createdEntries = []
    for (const item of rawEntries) {
      if (!item.date || !item.time || !item.description) {
        continue
      }
      const entry = await DailyDiaryManualEntry.create({
        staffId: targetStaffId,
        date: item.date,
        time: item.time,
        description: item.description,
      })
      createdEntries.push(entry)
    }

    return response.status(201).json({
      message: `${createdEntries.length} manual entry(ies) logged successfully`,
      data: createdEntries,
    })
  }

  async getManualLogs({ request, response, auth }: HttpContext) {
    const { startDate, endDate, staffId } = request.qs()
    const user = auth.user!
    await user.load('role')
    const userRole = user.role?.role || 'UNKNOWN'

    let targetStaffId: number | undefined = undefined
    if (user.role_id === 6 || user.role_id === 10) {
      targetStaffId = user.staff_id || undefined
    } else if (staffId) {
      targetStaffId = Number(staffId)
    } else if (userRole === 'SCHOOL_TEACHER' || userRole === 'HEAD_TEACHER') {
      targetStaffId = user.staff_id || undefined
    }

    let query = DailyDiaryManualEntry.query().preload('staff')
    if (targetStaffId) {
      query.where('staff_id', targetStaffId)
    }
    if (startDate && endDate) {
      query.whereBetween('date', [startDate, endDate])
    }

    const logs = await query.orderBy('date', 'desc').orderBy('id', 'desc')
    return response.json({ data: logs })
  }

  async deleteManualLog({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const log = await DailyDiaryManualEntry.find(params.id)
    if (!log) {
      return response.notFound({ message: 'Manual entry not found' })
    }

    if ((user.role_id === 6 || user.role_id === 10) && log.staffId !== user.staff_id) {
      return response.forbidden({ message: 'You are not authorized to delete this log' })
    }

    await log.delete()
    return response.json({ message: 'Manual entry deleted successfully' })
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
    const logs = await query.orderBy('date', 'desc').orderBy('id', 'desc')
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
        .select('id', 'topic_id', 'required_hours', 'lesson_plan_number', 'name', 'code', 'competency', 'outcome')
      
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

    let manualQuery = DailyDiaryManualEntry.query().preload('staff')
    if (targetStaffId) {
      manualQuery.where('staff_id', targetStaffId)
    }
    if (startDate && endDate) {
      manualQuery.whereBetween('date', [startDate, endDate])
    }
    const manualEntries = await manualQuery.orderBy('date', 'desc').orderBy('id', 'desc')

    return response.json({
      data: logsWithMetadata,
      manualEntries: manualEntries.map((m) => m.toJSON()),
      debug: {
        sql: query.toSQL().toNative(),
        count: logs.length,
        school_id: user.school_id,
        user_role: userRole,
        targetStaffId: targetStaffId
      }
    })
  }

  async exportPDF({ request, response, auth }: HttpContext) {
    const { startDate, endDate, staffId } = request.qs()
    const user = auth.user!
    await user.load('role')
    const userRole = user.role?.role || 'UNKNOWN'

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

    let query = DailyDiary.query()
      .preload('periodConfig', (p) => {
        p.preload('period_config_subject', (s) => s.preload('subject'))
        p.preload('period_config_class_day', (d) => d.preload('class'))
      })
      .preload('staffEnrollment', (se) => se.preload('staff'))

    if (startDate && endDate) {
      query.whereBetween('date', [startDate, endDate])
    }

    let targetStaffId: number | undefined = undefined
    if (user.role_id === 6 || user.role_id === 10) {
      targetStaffId = user.staff_id || undefined
    } else if (staffId) {
      targetStaffId = Number(staffId)
    } else if (userRole === 'SCHOOL_TEACHER' || userRole === 'HEAD_TEACHER') {
      targetStaffId = user.staff_id || undefined
    }

    if (targetStaffId) {
      query.whereHas('staffEnrollment', (sq) => {
        sq.where('staff_id', targetStaffId)
      })
    }

    if (user.school_id) {
      query.whereHas('periodConfig', (pq) => {
        pq.whereHas('period_config_class_day', (cq) => {
          cq.whereHas('class', (cl) => {
            cl.where('school_id', user.school_id!)
          })
        })
      })
    }

    const logs = await query.orderBy('date', 'desc').orderBy('id', 'desc')

    let manualQuery = DailyDiaryManualEntry.query().preload('staff')
    if (targetStaffId) {
      manualQuery.where('staff_id', targetStaffId)
    }
    if (startDate && endDate) {
      manualQuery.whereBetween('date', [startDate, endDate])
    }
    const manualLogs = await manualQuery.orderBy('date', 'desc').orderBy('id', 'desc')

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
        .select('id', 'topic_id', 'required_hours', 'lesson_plan_number', 'name', 'code')

      subtopics.forEach(s => {
        subtopicsMetadata[s.id] = s
      })
    }

    const flatRows: any[] = []
    logs.forEach(log => {
      let dateStr = '-'
      if (log.date) {
        const rawObj = log.date as any
        if (rawObj instanceof Date && !isNaN(rawObj.getTime())) {
          const day = String(rawObj.getDate()).padStart(2, '0')
          const month = String(rawObj.getMonth() + 1).padStart(2, '0')
          const year = rawObj.getFullYear()
          dateStr = `${day}-${month}-${year}`
        } else if (typeof rawObj === 'object' && 'toFormat' in rawObj && typeof rawObj.toFormat === 'function') {
          dateStr = rawObj.toFormat('dd-MM-yyyy')
        } else {
          const str = String(log.date).trim()
          const clean = str.split('T')[0]
          const parts = clean.split('-')
          if (parts.length === 3 && parts[0].length === 4) {
            dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`
          } else {
            const parsed = new Date(str)
            if (!isNaN(parsed.getTime())) {
              const day = String(parsed.getDate()).padStart(2, '0')
              const month = String(parsed.getMonth() + 1).padStart(2, '0')
              const year = parsed.getFullYear()
              dateStr = `${day}-${month}-${year}`
            } else {
              dateStr = str
            }
          }
        }
      }

      const subjectName = log.periodConfig?.period_config_subject?.subject?.name || '-'
      const className = log.periodConfig?.period_config_class_day?.class?.class || '-'
      const teacherName = log.staffEnrollment?.staff ? `${log.staffEnrollment.staff.first_name} ${log.staffEnrollment.staff.last_name}` : '-'
      const resources = [log.resourcesUsed, log.attendanceRemarks].filter(Boolean).join(' | ') || '-'

      const durationsObj = log.topicDurations
      let loggedHours = '-'
      if (durationsObj && typeof durationsObj === 'object') {
        const vals = Object.values(durationsObj)
        if (vals.length > 0) {
          const total = vals.reduce((acc: number, val: any) => acc + (Number(val) || 0), 0)
          if (total > 0) loggedHours = `${total}`
        }
      }

      let lpNoStr = '-'
      if (log.subtopicIds && Array.isArray(log.subtopicIds) && log.subtopicIds.length > 0) {
        const lpSet = new Set<string>()
        log.subtopicIds.forEach(subId => {
          const sub = subtopicsMetadata[subId]
          if (sub && sub.lesson_plan_number) lpSet.add(sub.lesson_plan_number)
        })
        if (lpSet.size > 0) lpNoStr = Array.from(lpSet).join(', ')
      }

      flatRows.push([
        { text: dateStr, alignment: 'center', fontSize: 7 },
        { text: className, alignment: 'center', fontSize: 7 },
        { text: subjectName, fontSize: 7 },
        { text: teacherName, fontSize: 7 },
        { text: log.topicCovered || '-', fontSize: 7 },
        { text: lpNoStr, alignment: 'center', fontSize: 7 },
        { text: loggedHours !== '-' ? `${loggedHours}h` : '-', alignment: 'center', fontSize: 7 },
        { text: resources, fontSize: 7 }
      ])
    })

    const manualFlatRows: any[] = []
    manualLogs.forEach(m => {
      let dateStr = '-'
      if (m.date) {
        const rawObj = m.date as any
        if (rawObj instanceof Date && !isNaN(rawObj.getTime())) {
          const day = String(rawObj.getDate()).padStart(2, '0')
          const month = String(rawObj.getMonth() + 1).padStart(2, '0')
          const year = rawObj.getFullYear()
          dateStr = `${day}-${month}-${year}`
        } else if (typeof rawObj === 'object' && 'toFormat' in rawObj && typeof rawObj.toFormat === 'function') {
          dateStr = rawObj.toFormat('dd-MM-yyyy')
        } else {
          const str = String(m.date).trim()
          const clean = str.split('T')[0]
          const parts = clean.split('-')
          if (parts.length === 3 && parts[0].length === 4) {
            dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`
          } else {
            dateStr = str
          }
        }
      }

      const teacherName = m.staff ? `${m.staff.first_name} ${m.staff.last_name}` : '-'
      manualFlatRows.push([
        { text: dateStr, alignment: 'center', fontSize: 7 },
        { text: m.time || '-', alignment: 'center', fontSize: 7 },
        { text: m.description || '-', fontSize: 7 },
        { text: teacherName, fontSize: 7 }
      ])
    })

    const gridBody: any[] = [
      [
        { text: 'Date', style: 'tableHeader', alignment: 'center' },
        { text: 'Class', style: 'tableHeader', alignment: 'center' },
        { text: 'Subject', style: 'tableHeader' },
        { text: 'Teacher', style: 'tableHeader' },
        { text: 'Topic / Subtopic Covered', style: 'tableHeader' },
        { text: 'LP No.', style: 'tableHeader', alignment: 'center' },
        { text: 'Hours', style: 'tableHeader', alignment: 'center' },
        { text: 'Resources / Remarks', style: 'tableHeader' }
      ],
      ...flatRows
    ]

    const docDefinition: any = {
      pageOrientation: 'landscape',
      pageMargins: [30, 30, 30, 30],
      content: [
        {
          columns: [
            {
              width: 70,
              stack: [logoImage ? { image: logoImage, width: 60, height: 60, alignment: 'center' } : {
                canvas: [
                  { type: 'circle', x: 35, y: 30, r: 28, lineWidth: 1.5, lineColor: '#1e293b' },
                  { type: 'circle', x: 35, y: 30, r: 24, lineWidth: 0.8, lineColor: '#1e293b' }
                ],
                width: 70,
                height: 62
              }]
            },
            {
              width: '*',
              stack: [
                { text: 'C. N. Kothari Homoeopathic Medical College', style: 'collegeTitle', alignment: 'center' },
                { text: '& Research Centre - VYARA', style: 'collegeTitle', alignment: 'center' },
                { text: 'DAILY DIARY / TEACHER LOGS REPORT', style: 'reportTitle', alignment: 'center' }
              ],
              margin: [-30, 5, 0, 0]
            }
          ],
          margin: [0, 0, 0, 8]
        },
        {
          table: {
            headerRows: 1,
            widths: [55, 50, 90, 100, '*', 45, 40, 100],
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
          margin: [0, 0, 0, 12]
        },
        ...(manualFlatRows.length > 0 ? [
          { text: 'WORK DONE NOT ON CALENDAR (MANUAL ENTRIES)', style: 'sectionHeader', margin: [0, 8, 0, 4] },
          {
            table: {
              headerRows: 1,
              widths: [65, 100, '*', 120],
              body: [
                [
                  { text: 'Date', style: 'tableHeader', alignment: 'center' },
                  { text: 'Time', style: 'tableHeader', alignment: 'center' },
                  { text: 'Description of Work Done', style: 'tableHeader' },
                  { text: 'Teacher', style: 'tableHeader' }
                ],
                ...manualFlatRows
              ]
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
            margin: [0, 0, 0, 12]
          }
        ] : []),
        {
          stack: [
            {
              columns: [
                { text: `Total Scheduled Entries: ${flatRows.length} | Manual Non-Calendar Entries: ${manualFlatRows.length}`, bold: true, fontSize: 8, color: '#1e293b' },
                { text: 'HOD Signature: __________________', bold: true, fontSize: 8, alignment: 'right', color: '#b91c1c' }
              ],
              margin: [0, 10, 0, 0]
            }
          ],
          unbreakable: true
        }
      ],
      styles: {
        collegeTitle: { fontSize: 13, bold: true, color: '#1e293b' },
        reportTitle: { fontSize: 10, bold: true, color: '#b91c1c', margin: [0, 4, 0, 0] },
        sectionHeader: { fontSize: 9, bold: true, color: '#1e293b' },
        tableHeader: { bold: true, fontSize: 8, color: '#0f172a', fillColor: '#f1f5f9' }
      },
      defaultStyle: { font: 'Roboto', fontSize: 8 }
    }

    const printer = new PdfPrinter(fonts, fs as any, { resolve: () => { }, resolved: () => Promise.resolve() })
    const pdfDoc = await (printer as any).createPdfKitDocument(docDefinition)
    pdfDoc.end()

    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', `attachment; filename="Daily_Diary_Report.pdf"`)
    return response.stream(pdfDoc)
  }
}