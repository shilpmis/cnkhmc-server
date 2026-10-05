import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import * as path from 'node:path'
import * as fs from 'node:fs'
// @ts-ignore
import PdfPrinterPkg from 'pdfmake/js/Printer.js'
import { ValidatorForMarkLectureAttendance } from '#validators/lectureAttendance'
import LectureAttendanceMaster from '#models/LectureAttendanceMaster'
import LectureAttendanceDetail from '#models/LectureAttendanceDetail'
import SubjectDivisionMaster from '#models/SubjectDivisionMaster'
import StudentEnrollments from '#models/StudentEnrollments'
import Divisions from '#models/Divisions'

const PdfPrinter = PdfPrinterPkg.default || PdfPrinterPkg

const fonts = {
  Roboto: {
    normal: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Regular.ttf'),
    bold: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Medium.ttf'),
    italics: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Italic.ttf'),
    bolditalics: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-MediumItalic.ttf')
  }
}

export default class LectureAttendanceController {
  // ──────────────────────────────────────────────────────────────────────────
  // HELPER — resolve roll number column from class name
  // ──────────────────────────────────────────────────────────────────────────
  private getRollColumn(className: string): string {
    const name = className.toLowerCase()
    if (name.includes('2nd') || name.includes('second') || name.includes('2')) return 'second_year_roll_number'
    if (name.includes('3rd') || name.includes('third') || name.includes('3')) return 'third_year_roll_number'
    if (name.includes('4th') || name.includes('fourth') || name.includes('4')) return 'fourth_year_roll_number'
    return 'first_year_roll_number'
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HELPER — resolve teacher names by staff/user IDs
  // ──────────────────────────────────────────────────────────────────────────
  private async getTeacherNamesMap(teacherIds: number[]): Promise<Map<number, string>> {
    const teacherMap = new Map<number, string>()
    const uniqueIds = [...new Set(teacherIds)].filter(Boolean)
    if (uniqueIds.length === 0) return teacherMap

    try {
      const staffRecords = await db.from('staff')
        .whereIn('id', uniqueIds)
        .select('id', 'first_name', 'middle_name', 'last_name', 'title')

      for (const s of staffRecords) {
        const parts = [s.title, s.first_name, s.middle_name, s.last_name].filter(Boolean)
        teacherMap.set(s.id, parts.join(' '))
      }

      const missingIds = uniqueIds.filter((id) => !teacherMap.has(id))
      if (missingIds.length > 0) {
        const userRecords = await db.from('users')
          .whereIn('id', missingIds)
          .select('id', 'name', 'staff_id')

        const staffIdsToFetch: number[] = []
        const userToStaffMap = new Map<number, number>()

        for (const u of userRecords) {
          if (u.staff_id) {
            staffIdsToFetch.push(u.staff_id)
            userToStaffMap.set(u.id, u.staff_id)
          } else if (u.name) {
            teacherMap.set(u.id, u.name)
          }
        }

        if (staffIdsToFetch.length > 0) {
          const extraStaff = await db.from('staff')
            .whereIn('id', staffIdsToFetch)
            .select('id', 'first_name', 'middle_name', 'last_name', 'title')

          const extraStaffMap = new Map<number, string>()
          for (const s of extraStaff) {
            const parts = [s.title, s.first_name, s.middle_name, s.last_name].filter(Boolean)
            extraStaffMap.set(s.id, parts.join(' '))
          }

          for (const [userId, staffId] of userToStaffMap) {
            if (extraStaffMap.has(staffId)) {
              teacherMap.set(userId, extraStaffMap.get(staffId)!)
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching teacher names:', err)
    }

    return teacherMap
  }

  private formatDateString(val: any): string {
    if (!val) return 'N/A'
    if (typeof val === 'string') {
      if (val.includes('T')) {
        const parsed = DateTime.fromISO(val)
        return parsed.isValid ? parsed.toFormat('dd-MM-yyyy') : val.split('T')[0]
      }
      return val
    }
    if (val.toFormat && typeof val.toFormat === 'function') {
      return val.toFormat('dd-MM-yyyy')
    }
    if (val instanceof Date) {
      return DateTime.fromJSDate(val).toFormat('dd-MM-yyyy')
    }
    return String(val)
  }

  private formatDateTimeString(val: any): string {
    if (!val) return 'N/A'
    if (val.toFormat && typeof val.toFormat === 'function') {
      return val.toFormat('dd-MM-yyyy hh:mm a')
    }
    if (typeof val === 'string') {
      const parsed = DateTime.fromISO(val)
      return parsed.isValid ? parsed.toFormat('dd-MM-yyyy hh:mm a') : val
    }
    if (val instanceof Date) {
      return DateTime.fromJSDate(val).toFormat('dd-MM-yyyy hh:mm a')
    }
    return String(val)
  }

  private getCollegeLogo(): string | null {
    try {
      const logoPath = path.resolve(process.cwd(), 'resources/logo.jpg')
      if (fs.existsSync(logoPath)) {
        const logoData = fs.readFileSync(logoPath)
        return `data:image/jpeg;base64,${logoData.toString('base64')}`
      }
    } catch (err) {
      console.error('Error loading logo:', err)
    }
    return null
  }

  private buildHeaderBlock(reportTitle: string, subTitleText?: string, isLandscape = false): any[] {
    const logoImage = this.getCollegeLogo()
    const lineWidth = isLandscape ? 770 : 515

    const logoElement = logoImage
      ? { image: logoImage, width: 60, height: 60, alignment: 'center' }
      : {
          canvas: [
            { type: 'circle', x: 30, y: 30, r: 26, lineWidth: 1.5, lineColor: '#1e3a8a' },
            { type: 'circle', x: 30, y: 30, r: 22, lineWidth: 0.8, lineColor: '#1e3a8a' },
            { type: 'line', x1: 30, y1: 16, x2: 30, y2: 44, lineWidth: 2, lineColor: '#1e3a8a' },
            { type: 'line', x1: 16, y1: 30, x2: 44, y2: 30, lineWidth: 2, lineColor: '#1e3a8a' }
          ],
          width: 60,
          height: 60
        }

    return [
      {
        columns: [
          { width: 75, stack: [logoElement] },
          {
            width: '*',
            stack: [
              { text: 'C. N. KOTHARI HOMOEOPATHIC MEDICAL COLLEGE', style: 'collegeTitle', alignment: 'center' },
              { text: '& RESEARCH CENTRE - VYARA', style: 'collegeTitle', alignment: 'center' },
              { text: reportTitle, style: 'reportTitle', alignment: 'center' },
              ...(subTitleText ? [{ text: subTitleText, style: 'subHeader', alignment: 'center' }] : [])
            ],
            margin: [0, 2, 0, 0]
          }
        ],
        margin: [0, 0, 0, 5]
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: lineWidth, y2: 0, lineWidth: 1.5, lineColor: '#1e3a8a' }], margin: [0, 5, 0, 15] }
    ]
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET /lecture-attendance/subjects
  // Returns subject+division assignments for the logged-in teacher
  // ──────────────────────────────────────────────────────────────────────────
  async getMySubjects(ctx: HttpContext) {
    try {
      const user = ctx.auth.user!
      const academic_year = ctx.request.qs().academic_session as number

      // Admin / Principal / Super Admin / Org Admin: return all subject-division mappings
      const isAdmin = [1, 2, 7, 8].includes(user.role_id as number)

      let subjectDivisionQuery = SubjectDivisionMaster.query()
        .preload('subject')
        .where('status', 'Active')

      if (academic_year) {
        subjectDivisionQuery = subjectDivisionQuery.where('academic_year', academic_year)
      }

      if (!isAdmin) {
        let staffId = user.staff_id
        if (!staffId && user.email) {
          const staffRec = await db.from('staff').where('email', user.email).first()
          if (staffRec) staffId = staffRec.id
        }

        if (!staffId) {
          return ctx.response.status(403).json({ message: 'No staff profile linked to this account.' })
        }

        // Priority 1: Timetable period assignments for this teacher
        const periodAssignments = await db.from('periods_config as pc')
          .join('staff_enrollments as se', 'pc.staff_enrollment_id', 'se.id')
          .where('se.staff_id', staffId)
          .whereNotNull('pc.subjects_division_masters_id')
          .select('pc.subjects_division_masters_id as subjects_division_id')

        let assignedIds = [...new Set(periodAssignments.map((a: any) => a.subjects_division_id))].filter(Boolean)

        // Priority 2: Fallback to Subject-Staff Master mapping if no timetable periods configured
        if (assignedIds.length === 0) {
          const staffAssignments = await db.from('subjects_division_staff_masters as sdsm')
            .join('staff_enrollments as se', 'sdsm.staff_enrollment_id', 'se.id')
            .where('se.staff_id', staffId)
            .where('sdsm.status', 'Active')
            .select('sdsm.subjects_division_id')

          assignedIds = [...new Set(staffAssignments.map((a: any) => a.subjects_division_id))].filter(Boolean)
        }

        if (assignedIds.length === 0) return ctx.response.status(200).json({ data: [] })

        subjectDivisionQuery = subjectDivisionQuery.whereIn('id', assignedIds)
      }

      const assignments = await subjectDivisionQuery

      // Preload division info
      const divisionIds = [...new Set(assignments.map((a) => a.division_id))]
      const divisions = await Divisions.query()
        .whereIn('id', divisionIds)
        .preload('class')

      const divisionMap = new Map(divisions.map((d) => [d.id, d]))

      const data = assignments.map((a) => {
        const div = divisionMap.get(a.division_id)
        return {
          subjects_division_id: a.id,
          division_id: a.division_id,
          division_name: div ? `${div.class?.class ?? ''} - ${div.division}` : `Division ${a.division_id}`,
          subject_id: a.subject_id,
          subject_name: a.subject?.name ?? '',
          subject_code: a.subject?.code ?? '',
          session_type: a.code_for_division?.toLowerCase().includes('lab') ? 'lab' : 'lecture',
        }
      })

      return ctx.response.status(200).json({ data })
    } catch (error) {
      return ctx.response.status(500).json({ message: 'Error fetching subjects', error: error.message })
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET /lecture-attendance/:division_id/:subject_id/:unix_date
  // Returns existing attendance or fresh student list for marking
  // ──────────────────────────────────────────────────────────────────────────
  async getAttendanceForDate(ctx: HttpContext) {
    try {
      const { division_id, subject_id, unix_date } = ctx.params
      const academic_year = ctx.request.qs().academic_session as number

      const user = ctx.auth.user!
      const isAdmin = [1, 2, 7, 8].includes(user.role_id as number)

      if (!isAdmin) {
        let staffId = user.staff_id
        if (!staffId && user.email) {
          const staffRec = await db.from('staff').where('email', user.email).first()
          if (staffRec) staffId = staffRec.id
        }

        if (staffId) {
          const periodAssignments = await db.from('periods_config as pc')
            .join('staff_enrollments as se', 'pc.staff_enrollment_id', 'se.id')
            .where('se.staff_id', staffId)
            .whereNotNull('pc.subjects_division_masters_id')
            .select('pc.subjects_division_masters_id as subjects_division_id')

          let assignedSubDivIds = [...new Set(periodAssignments.map((a: any) => a.subjects_division_id))].filter(Boolean)

          if (assignedSubDivIds.length === 0) {
            const staffAssignments = await db.from('subjects_division_staff_masters as sdsm')
              .join('staff_enrollments as se', 'sdsm.staff_enrollment_id', 'se.id')
              .where('se.staff_id', staffId)
              .where('sdsm.status', 'Active')
              .select('sdsm.subjects_division_id')

            assignedSubDivIds = [...new Set(staffAssignments.map((a: any) => a.subjects_division_id))].filter(Boolean)
          }

          if (assignedSubDivIds.length > 0) {
            const isAssigned = await SubjectDivisionMaster.query()
              .whereIn('id', assignedSubDivIds)
              .where('division_id', division_id)
              .where('subject_id', subject_id)
              .first()

            if (!isAssigned) {
              return ctx.response.status(403).json({
                message: 'You are only authorized to view or take attendance for subjects and classes assigned to you.'
              })
            }
          }
        }
      }

      const targetLectureNum = Number(ctx.request.qs().lecture_number) || 1

      const date = new Date(unix_date * 1000).toISOString().split('T')[0]

      // No future dates allowed
      if (DateTime.fromISO(date) > DateTime.now().startOf('day')) {
        return ctx.response.status(400).json({ message: "Cannot fetch attendance for future dates." })
      }

      // Resolve roll number column
      const division = await Divisions.query().where('id', division_id).preload('class').first()
      const rollColumn = division?.class ? this.getRollColumn(division.class.class) : 'first_year_roll_number'

      const allExisting = await LectureAttendanceMaster.query()
        .where('division_id', division_id)
        .where('subject_id', subject_id)
        .where('attendance_date', date)
        .where('academic_year', academic_year)
        .preload('attendance_details', (q) => {
          q.preload('student', (sq) =>
            sq.select('id', 'first_name', 'middle_name', 'last_name', rollColumn)
          )
        })
        .orderBy('lecture_number', 'asc')

      const existingSessions = allExisting.map((m) => m.lecture_number || 1)
      const existing = allExisting.find((m) => (m.lecture_number || 1) === targetLectureNum)

      if (existing) {
        return ctx.response.status(200).json({
          date,
          division_id: Number(division_id),
          subject_id: Number(subject_id),
          lecture_number: targetLectureNum,
          existing_sessions: existingSessions,
          is_marked: true,
          marked_by: existing.teacher_id,
          session_type: existing.session_type,
          attendance_data: existing.attendance_details.map((d) => ({
            student_id: d.student_id,
            student_name: `${d.student.first_name} ${d.student.last_name}`,
            roll_number: (d.student as any)[rollColumn] ?? null,
            status: d.attendance_status,
            remarks: d.remarks,
          })),
        })
      }

      // Fresh — return students enrolled in this division
      const enrollments = await StudentEnrollments.query()
        .where('division_id', division_id)
        .where('academic_year', academic_year)
        .whereIn('status', ['pursuing', 'onboarded'])
        .preload('student', (sq) =>
          sq.select('id', 'first_name', 'middle_name', 'last_name', rollColumn).orderBy(rollColumn, 'asc')
        )

      return ctx.response.status(200).json({
        date,
        division_id: Number(division_id),
        subject_id: Number(subject_id),
        lecture_number: targetLectureNum,
        existing_sessions: existingSessions,
        is_marked: false,
        marked_by: null,
        session_type: null,
        attendance_data: enrollments.map((e) => ({
          student_id: e.student.id,
          student_name: `${e.student.first_name} ${e.student.last_name}`,
          roll_number: (e.student as any)[rollColumn] ?? null,
          status: null,
          remarks: null,
        })),
      })
    } catch (error) {
      return ctx.response.status(500).json({ message: 'Error fetching attendance', error: error.message })
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // POST /lecture-attendance
  // Mark attendance — blocks duplicates with 409
  // ──────────────────────────────────────────────────────────────────────────
  async markAttendance(ctx: HttpContext) {
    try {
      const payload = await ValidatorForMarkLectureAttendance.validate(ctx.request.body())
      const { division_id, subject_id, academic_year, session_type, marked_by, attendance_data } = payload
      const lecture_number = payload.lecture_number || 1

      const attendance_date = DateTime.fromJSDate(new Date(payload.date as any))
      const today = DateTime.now().startOf('day')

      if (attendance_date > today) {
        return ctx.response.status(400).json({ message: "Cannot mark attendance for future dates." })
      }

      const dateStr = attendance_date.toISODate()!

      // Duplicate check for specific lecture session
      let dupQuery = LectureAttendanceMaster.query()
        .where('subject_id', subject_id)
        .where('attendance_date', dateStr)
        .where('lecture_number', lecture_number)

      if (division_id) {
        dupQuery = dupQuery.where('division_id', division_id)
      }

      if (academic_year) {
        dupQuery = dupQuery.where('academic_year', academic_year)
      }

      const duplicate = await dupQuery.first()

      if (duplicate) {
        return ctx.response.status(409).json({
          message: `Attendance already marked for Lecture ${lecture_number} of this subject on this date.`,
        })
      }

      const trx = await db.transaction()
      try {
        const master = await LectureAttendanceMaster.create(
          {
            academic_year: academic_year ?? 1,
            division_id: division_id ?? undefined,
            subject_id,
            teacher_id: marked_by,
            attendance_date: dateStr,
            lecture_number,
            periods_config_id: (payload as any).periods_config_id || null,
            session_type,
          },
          { client: trx }
        )

        const details = attendance_data.map((d) => ({
          lecture_attendance_master_id: master.id,
          student_id: d.student_id,
          attendance_status: d.status,
          remarks: d.remarks ?? null,
        }))

        await LectureAttendanceDetail.createMany(details, { client: trx })
        await trx.commit()

        return ctx.response.status(201).json({
          message: 'Attendance marked successfully.',
          data: master,
        })
      } catch (err) {
        await trx.rollback()
        throw err
      }
    } catch (error) {
      if (error.status === 409) throw error
      return ctx.response.status(500).json({ message: 'Error marking attendance', error: error.message })
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET /lecture-attendance/history/:division_id/:subject_id
  // All past sessions with summary counts
  // ──────────────────────────────────────────────────────────────────────────
  async getHistory(ctx: HttpContext) {
    try {
      const { division_id, subject_id } = ctx.params
      const academic_year = ctx.request.qs().academic_session as number

      const records = await LectureAttendanceMaster.query()
        .where('division_id', division_id)
        .where('subject_id', subject_id)
        .where('academic_year', academic_year)
        .preload('attendance_details', (q) => q.select('attendance_status'))
        .orderBy('attendance_date', 'desc')

      const data = records.map((r) => {
        const details = r.attendance_details
        const present = details.filter((d) => d.attendance_status === 'present').length
        const absent = details.filter((d) => d.attendance_status === 'absent').length
        const late = details.filter((d) => d.attendance_status === 'late').length
        const half_day = details.filter((d) => d.attendance_status === 'half_day').length
        return {
          id: r.id,
          attendance_date: r.attendance_date,
          lecture_number: r.lecture_number || 1,
          session_type: r.session_type,
          total: details.length,
          present,
          absent,
          late,
          half_day,
        }
      })

      return ctx.response.status(200).json({ data })
    } catch (error) {
      return ctx.response.status(500).json({ message: 'Error fetching history', error: error.message })
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET /lecture-attendance/export/history/:division_id/:subject_id
  // Export history as CSV
  // ──────────────────────────────────────────────────────────────────────────
  async exportHistory(ctx: HttpContext) {
    try {
      const { division_id, subject_id } = ctx.params
      const academic_year = ctx.request.qs().academic_session as number

      const records = await LectureAttendanceMaster.query()
        .where('division_id', division_id)
        .where('subject_id', subject_id)
        .where('academic_year', academic_year)
        .preload('subject')
        .preload('division', (q) => q.preload('class'))
        .preload('attendance_details', (q) => {
          q.preload('student', (sq) =>
            sq.select('id', 'first_name', 'last_name', 'first_year_roll_number', 'second_year_roll_number', 'third_year_roll_number', 'fourth_year_roll_number')
          )
        })
        .orderBy('attendance_date', 'asc')
        .orderBy('lecture_number', 'asc')

      if (records.length === 0) {
        const docDefinition: any = {
          content: [
            { text: 'C. N. KOTHARI HOMOEOPATHIC MEDICAL COLLEGE & RESEARCH CENTRE, VYARA', style: 'collegeTitle', alignment: 'center' },
            { text: 'LECTURE ATTENDANCE REPORT', style: 'reportTitle', alignment: 'center' },
            { text: 'No attendance records found for this subject and division.', margin: [0, 20, 0, 0], alignment: 'center' }
          ],
          styles: {
            collegeTitle: { fontSize: 13, bold: true, color: '#1e3a8a' },
            reportTitle: { fontSize: 10, bold: true, color: '#475569', margin: [0, 4, 0, 0] }
          },
          defaultStyle: { font: 'Roboto', fontSize: 9 }
        }
        const printer = new PdfPrinter(fonts, fs as any, { resolve: () => {}, resolved: () => Promise.resolve() })
        const pdfDoc = await (printer as any).createPdfKitDocument(docDefinition)
        pdfDoc.end()
        ctx.response.header('Content-Type', 'application/pdf')
        ctx.response.header('Content-Disposition', 'attachment; filename="lecture_attendance.pdf"')
        return ctx.response.stream(pdfDoc)
      }

      const teacherIds = records.map((r) => r.teacher_id)
      const teacherMap = await this.getTeacherNamesMap(teacherIds)

      const subjectObj = records[0]?.subject
      const subjectName = subjectObj ? `${subjectObj.name}${subjectObj.code ? ` (${subjectObj.code})` : ''}` : `Subject ${subject_id}`
      const divisionObj = records[0]?.division
      const divisionName = divisionObj ? `${divisionObj.class?.class ?? ''} - ${divisionObj.division}` : `Division ${division_id}`

      const content: any[] = []

      // College Header Banner with Logo
      content.push(
        ...this.buildHeaderBlock(
          'LECTURE ATTENDANCE HISTORY REPORT',
          `Subject: ${subjectName}   |   Class: ${divisionName}`,
          false
        )
      )

      for (let index = 0; index < records.length; index++) {
        const master = records[index]
        const rollColumn = master.division?.class
          ? this.getRollColumn(master.division.class.class)
          : 'first_year_roll_number'

        const teacherName = teacherMap.get(master.teacher_id) || `Staff #${master.teacher_id}`
        const lectureDate = this.formatDateString(master.attendance_date)
        const markedDate = this.formatDateTimeString(master.createdAt || (master as any).created_at)

        const details = master.attendance_details
        const presentCount = details.filter((d) => d.attendance_status === 'present').length
        const absentCount = details.filter((d) => d.attendance_status === 'absent').length
        const lateCount = details.filter((d) => d.attendance_status === 'late').length
        const halfDayCount = details.filter((d) => d.attendance_status === 'half_day').length
        const totalCount = details.length

        const sessionBlock: any[] = [
          // Clear Details Card mentioning Subject Name, Teacher Name, Lecture Date, Date Attendance Marked
          {
            table: {
              widths: ['*', '*'],
              body: [
                [
                  {
                    text: [
                      { text: 'Subject Name: ', bold: true }, subjectName, '\n',
                      { text: 'Class & Division: ', bold: true }, divisionName, '\n',
                      { text: 'Session Type: ', bold: true },
                      `${master.session_type ? master.session_type.toUpperCase() : 'LECTURE'}${master.lecture_number && master.lecture_number > 1 ? ` (Lecture ${master.lecture_number})` : ''}`
                    ],
                    fillColor: '#f8fafc', margin: [6, 6, 6, 6]
                  },
                  {
                    text: [
                      { text: 'Teacher Name: ', bold: true }, teacherName, '\n',
                      { text: 'Date Lecture Taken: ', bold: true }, lectureDate, '\n',
                      { text: 'Date Attendance Marked: ', bold: true }, markedDate
                    ],
                    fillColor: '#f8fafc', margin: [6, 6, 6, 6]
                  }
                ]
              ]
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#cbd5e1',
              vLineColor: () => '#cbd5e1'
            },
            margin: [0, 0, 0, 8]
          },
          // Summary text bar
          {
            text: `Total Students: ${totalCount}  |  Present: ${presentCount}  |  Absent: ${absentCount}  |  Late: ${lateCount}  |  Half Day: ${halfDayCount}`,
            style: 'summaryBar',
            margin: [0, 0, 0, 8]
          }
        ]

        // Student Table
        const tableBody: any[] = [
          [
            { text: '#', style: 'tableHeader' },
            { text: 'Roll No', style: 'tableHeader' },
            { text: 'Student Name', style: 'tableHeader' },
            { text: 'Status', style: 'tableHeader' },
            { text: 'Remarks', style: 'tableHeader' }
          ]
        ]

        details.forEach((d, idx) => {
          const rollNum = (d.student as any)[rollColumn] ?? '-'
          const studentName = `${d.student.first_name} ${d.student.last_name}`
          const status = (d.attendance_status || '').toLowerCase()

          let statusText = status.toUpperCase()
          let statusColor = '#334155'
          if (status === 'present') statusColor = '#15803d'
          else if (status === 'absent') statusColor = '#b91c1c'
          else if (status === 'late') statusColor = '#c2410c'
          else if (status === 'half_day') statusColor = '#1d4ed8'

          tableBody.push([
            { text: String(idx + 1), alignment: 'center' },
            { text: String(rollNum), alignment: 'center' },
            { text: studentName },
            { text: statusText, bold: true, color: statusColor, alignment: 'center' },
            { text: d.remarks || '-' }
          ])
        })

        sessionBlock.push({
          table: {
            headerRows: 1,
            widths: [25, 55, '*', 80, 110],
            body: tableBody
          },
          layout: {
            hLineWidth: (i: number) => (i === 0 || i === 1 ? 1 : 0.5),
            vLineWidth: () => 0.5,
            hLineColor: () => '#cbd5e1',
            vLineColor: () => '#cbd5e1',
            fillColor: (rowIndex: number) => (rowIndex === 0 ? '#1e3a8a' : rowIndex % 2 === 0 ? '#f8fafc' : null)
          },
          margin: [0, 0, 0, 15]
        })

        content.push({
          stack: sessionBlock,
          unbreakable: true,
          pageBreak: index < records.length - 1 ? 'after' : undefined
        })
      }

      const docDefinition: any = {
        content,
        styles: {
          collegeTitle: { fontSize: 13, bold: true, color: '#1e3a8a' },
          reportTitle: { fontSize: 11, bold: true, color: '#0f172a', margin: [0, 3, 0, 0] },
          subHeader: { fontSize: 9, bold: true, color: '#475569', margin: [0, 3, 0, 0] },
          summaryBar: { fontSize: 9, bold: true, color: '#1e293b' },
          tableHeader: { bold: true, fontSize: 8, color: '#ffffff', alignment: 'center' }
        },
        defaultStyle: { font: 'Roboto', fontSize: 8 }
      }

      const printer = new PdfPrinter(fonts, fs as any, { resolve: () => {}, resolved: () => Promise.resolve() })
      const pdfDoc = await (printer as any).createPdfKitDocument(docDefinition)
      pdfDoc.end()

      const safeSubject = subjectName.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase()
      const safeDivision = divisionName.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase()
      const filename = `lecture_attendance_${safeSubject}_${safeDivision}.pdf`

      ctx.response.header('Content-Type', 'application/pdf')
      ctx.response.header('Content-Disposition', `attachment; filename="${filename}"`)
      return ctx.response.stream(pdfDoc)
    } catch (error) {
      return ctx.response.status(500).json({ message: 'Error exporting history', error: error.message })
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET /lecture-attendance/report/student/:student_id
  // One student — attendance % across all subjects
  // ──────────────────────────────────────────────────────────────────────────
  async getStudentReport(ctx: HttpContext) {
    try {
      const { student_id } = ctx.params
      const academic_year = ctx.request.qs().academic_session as number

      // Get all lecture_attendance_details for this student
      const details = await LectureAttendanceDetail.query()
        .where('student_id', student_id)
        .preload('master', (q) => {
          q.where('academic_year', academic_year).preload('subject')
        })

      // Group by subject_id
      const subjectMap = new Map<number, {
        subject_id: number
        subject_name: string
        subject_code: string
        present: number
        absent: number
        late: number
        half_day: number
        total: number
      }>()

      for (const d of details) {
        if (!d.master) continue
        const sid = d.master.subject_id
        if (!subjectMap.has(sid)) {
          subjectMap.set(sid, {
            subject_id: sid,
            subject_name: d.master.subject?.name ?? '',
            subject_code: d.master.subject?.code ?? '',
            present: 0, absent: 0, late: 0, half_day: 0, total: 0,
          })
        }
        const entry = subjectMap.get(sid)!
        entry.total++
        if (d.attendance_status === 'present') entry.present++
        else if (d.attendance_status === 'absent') entry.absent++
        else if (d.attendance_status === 'late') entry.late++
        else if (d.attendance_status === 'half_day') entry.half_day++
      }

      const data = [...subjectMap.values()].map((s) => ({
        ...s,
        attendance_percentage: s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100 * 10) / 10 : 0,
      }))

      return ctx.response.status(200).json({ data })
    } catch (error) {
      return ctx.response.status(500).json({ message: 'Error fetching student report', error: error.message })
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET /lecture-attendance/report/student/:student_id/subject/:subject_id
  // One student — date-by-date for one subject
  // ──────────────────────────────────────────────────────────────────────────
  async getStudentSubjectReport(ctx: HttpContext) {
    try {
      const { student_id, subject_id } = ctx.params
      const academic_year = ctx.request.qs().academic_session as number

      const details = await LectureAttendanceDetail.query()
        .where('student_id', student_id)
        .preload('master', (q) => {
          q.where('subject_id', subject_id).where('academic_year', academic_year)
        })
        .orderBy('created_at', 'asc')

      const data = details
        .filter((d) => d.master)
        .map((d) => ({
          date: d.master.attendance_date,
          session_type: d.master.session_type,
          status: d.attendance_status,
          remarks: d.remarks,
        }))

      const present = data.filter((d) => d.status === 'present').length
      const absent = data.filter((d) => d.status === 'absent').length
      const late = data.filter((d) => d.status === 'late').length
      const total = data.length

      return ctx.response.status(200).json({
        data,
        summary: {
          total,
          present,
          absent,
          late,
          attendance_percentage: total > 0 ? Math.round(((present + late) / total) * 100 * 10) / 10 : 0,
        },
      })
    } catch (error) {
      return ctx.response.status(500).json({ message: 'Error fetching student subject report', error: error.message })
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET /lecture-attendance/report/class/:division_id
  // All students — attendance % per subject + overall
  // ──────────────────────────────────────────────────────────────────────────
  async getClassReport(ctx: HttpContext) {
    try {
      const { division_id } = ctx.params
      const academic_year = ctx.request.qs().academic_session as number

      // Get all masters for this division
      const masters = await LectureAttendanceMaster.query()
        .where('division_id', division_id)
        .where('academic_year', academic_year)
        .preload('subject')
        .preload('attendance_details')

      // Get all enrolled students
      const division = await Divisions.query().where('id', division_id).preload('class').first()
      const rollColumn = division?.class ? this.getRollColumn(division.class.class) : 'first_year_roll_number'

      const enrollments = await StudentEnrollments.query()
        .where('division_id', division_id)
        .where('academic_year', academic_year)
        .whereIn('status', ['pursuing', 'onboarded'])
        .preload('student', (sq) =>
          sq.select('id', 'first_name', 'last_name', rollColumn).orderBy(rollColumn, 'asc')
        )

      // Build: student → subject → counts
      type SubjectStats = { subject_name: string; subject_code: string; present: number; absent: number; late: number; total: number }
      const studentSubjectMap = new Map<number, { student_name: string; roll_number: string | null; subjects: Map<number, SubjectStats> }>()

      for (const e of enrollments) {
        studentSubjectMap.set(e.student_id, {
          student_name: `${e.student.first_name} ${e.student.last_name}`,
          roll_number: (e.student as any)[rollColumn] ?? null,
          subjects: new Map(),
        })
      }

      for (const master of masters) {
        for (const detail of master.attendance_details) {
          const studentEntry = studentSubjectMap.get(detail.student_id)
          if (!studentEntry) continue
          if (!studentEntry.subjects.has(master.subject_id)) {
            studentEntry.subjects.set(master.subject_id, {
              subject_name: master.subject?.name ?? '',
              subject_code: master.subject?.code ?? '',
              present: 0, absent: 0, late: 0, total: 0,
            })
          }
          const subEntry = studentEntry.subjects.get(master.subject_id)!
          subEntry.total++
          if (detail.attendance_status === 'present') subEntry.present++
          else if (detail.attendance_status === 'absent') subEntry.absent++
          else if (detail.attendance_status === 'late') subEntry.late++
        }
      }

      const data = [...studentSubjectMap.entries()].map(([student_id, entry]) => {
        const subjects = [...entry.subjects.entries()].map(([subject_id, s]) => ({
          subject_id,
          subject_name: s.subject_name,
          subject_code: s.subject_code,
          total_lectures: s.total,
          present: s.present,
          absent: s.absent,
          late: s.late,
          attendance_percentage: s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100 * 10) / 10 : 0,
        }))

        const totalLectures = subjects.reduce((sum, s) => sum + s.total_lectures, 0)
        const totalPresent = subjects.reduce((sum, s) => sum + s.present + s.late, 0)
        const overall_percentage = totalLectures > 0 ? Math.round((totalPresent / totalLectures) * 100 * 10) / 10 : 0

        return {
          student_id,
          student_name: entry.student_name,
          roll_number: entry.roll_number,
          subjects,
          overall_percentage,
        }
      })

      return ctx.response.status(200).json({ data })
    } catch (error) {
      return ctx.response.status(500).json({ message: 'Error fetching class report', error: error.message })
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET /lecture-attendance/report/class/:division_id/subject/:subject_id
  // All students — date-by-date for one subject
  // ──────────────────────────────────────────────────────────────────────────
  async getClassSubjectReport(ctx: HttpContext) {
    try {
      const { division_id, subject_id } = ctx.params
      const academic_year = ctx.request.qs().academic_session as number

      const masters = await LectureAttendanceMaster.query()
        .where('division_id', division_id)
        .where('subject_id', subject_id)
        .where('academic_year', academic_year)
        .preload('attendance_details')
        .orderBy('attendance_date', 'asc')

      const division = await Divisions.query().where('id', division_id).preload('class').first()
      const rollColumn = division?.class ? this.getRollColumn(division.class.class) : 'first_year_roll_number'

      const enrollments = await StudentEnrollments.query()
        .where('division_id', division_id)
        .where('academic_year', academic_year)
        .whereIn('status', ['pursuing', 'onboarded'])
        .preload('student', (sq) =>
          sq.select('id', 'first_name', 'last_name', rollColumn).orderBy(rollColumn, 'asc')
        )

      type DateRecord = { date: string; session_type: string; status: string; remarks: string | null }
      const studentMap = new Map<number, { student_name: string; roll_number: string | null; records: DateRecord[] }>()

      for (const e of enrollments) {
        studentMap.set(e.student_id, {
          student_name: `${e.student.first_name} ${e.student.last_name}`,
          roll_number: (e.student as any)[rollColumn] ?? null,
          records: [],
        })
      }

      for (const master of masters) {
        const formattedDate = this.formatDateString(master.attendance_date)
        for (const detail of master.attendance_details) {
          const entry = studentMap.get(detail.student_id)
          if (!entry) continue
          entry.records.push({
            date: formattedDate,
            session_type: master.session_type,
            status: detail.attendance_status,
            remarks: detail.remarks,
          })
        }
      }

      const data = [...studentMap.entries()].map(([student_id, entry]) => {
        const present = entry.records.filter((r) => r.status === 'present').length
        const absent = entry.records.filter((r) => r.status === 'absent').length
        const late = entry.records.filter((r) => r.status === 'late').length
        const total = entry.records.length
        return {
          student_id,
          student_name: entry.student_name,
          roll_number: entry.roll_number,
          records: entry.records,
          present,
          absent,
          late,
          total,
          attendance_percentage: total > 0 ? Math.round(((present + late) / total) * 100 * 10) / 10 : 0,
        }
      })

      return ctx.response.status(200).json({ data, sessions: masters.map((m) => ({ date: this.formatDateString(m.attendance_date), session_type: m.session_type })) })
    } catch (error) {
      return ctx.response.status(500).json({ message: 'Error fetching class subject report', error: error.message })
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET /lecture-attendance/export/report/:division_id?subject_id=
  // Export class report as CSV
  // ──────────────────────────────────────────────────────────────────────────
  async exportReport(ctx: HttpContext) {
    try {
      const { division_id } = ctx.params
      const { academic_session: academic_year, subject_id } = ctx.request.qs()

      if (subject_id) {
        // Export class+subject date-by-date matrix report in PDF
        const masters = await LectureAttendanceMaster.query()
          .where('division_id', division_id)
          .where('subject_id', subject_id)
          .where('academic_year', academic_year)
          .preload('subject')
          .preload('division', (q) => q.preload('class'))
          .preload('attendance_details')
          .orderBy('attendance_date', 'asc')
          .orderBy('lecture_number', 'asc')

        const teacherIds = masters.map((m) => m.teacher_id)
        const teacherMap = await this.getTeacherNamesMap(teacherIds)
        const teacherNamesList = [...new Set(teacherIds.map((id) => teacherMap.get(id)).filter(Boolean))].join(', ') || 'N/A'

        const division = await Divisions.query().where('id', division_id).preload('class').first()
        const rollColumn = division?.class ? this.getRollColumn(division.class.class) : 'first_year_roll_number'
        const enrollments = await StudentEnrollments.query()
          .where('division_id', division_id).where('academic_year', academic_year)
          .whereIn('status', ['pursuing', 'onboarded'])
          .preload('student', (sq) => sq.select('id', 'first_name', 'last_name', rollColumn).orderBy(rollColumn, 'asc'))

        // Create unique session column headers (e.g., "01/10/2026 (Lec 2)" if lecture_number > 1 or multiple sessions)
        const sessions = masters.map((m) => {
          const formattedDate = this.formatDateString(m.attendance_date)
          const isMulti = masters.filter((other) => other.attendance_date === m.attendance_date).length > 1
          const label = isMulti || m.lecture_number > 1 ? `${formattedDate} (Lec ${m.lecture_number})` : formattedDate
          return { id: String(m.id), label, dateStr: formattedDate }
        })

        const dates = sessions.map((s) => s.label)
        const markedDates = masters.map((m) => this.formatDateTimeString(m.createdAt || (m as any).created_at))

        const subjectObj = masters[0]?.subject
        const subjectName = subjectObj ? `${subjectObj.name}${subjectObj.code ? ` (${subjectObj.code})` : ''}` : `Subject ${subject_id}`
        const divisionName = division ? `${division.class?.class ?? ''} - ${division.division}` : `Division ${division_id}`

        const studentMap = new Map<number, { name: string; roll: string | null; records: Map<string, string> }>()
        for (const e of enrollments) {
          studentMap.set(e.student_id, {
            name: `${e.student.first_name} ${e.student.last_name}`,
            roll: (e.student as any)[rollColumn] ?? null,
            records: new Map(),
          })
        }
        for (const master of masters) {
          const sessionLabel = sessions.find((s) => s.id === String(master.id))?.label || this.formatDateString(master.attendance_date)
          for (const detail of master.attendance_details) {
            studentMap.get(detail.student_id)?.records.set(sessionLabel, detail.attendance_status)
          }
        }

        const isLandscape = dates.length > 4
        const maxDatesPerBatch = isLandscape ? 12 : 5
        const dateBatches: string[][] = []

        for (let i = 0; i < dates.length; i += maxDatesPerBatch) {
          dateBatches.push(dates.slice(i, i + maxDatesPerBatch))
        }

        const reportContent: any[] = [
          ...this.buildHeaderBlock('SUBJECT LECTURE ATTENDANCE REPORT', undefined, isLandscape),
          {
            table: {
              widths: ['*', '*'],
              body: [
                [
                  {
                    text: [
                      { text: 'Subject Name: ', bold: true }, subjectName, '\n',
                      { text: 'Class & Division: ', bold: true }, divisionName, '\n',
                      { text: 'Academic Session: ', bold: true }, String(academic_year || '')
                    ],
                    fillColor: '#f8fafc', margin: [6, 6, 6, 6]
                  },
                  {
                    text: [
                      { text: 'Teacher Name(s): ', bold: true }, teacherNamesList, '\n',
                      { text: 'Date(s) Lecture Taken: ', bold: true }, dates.length > 0 ? dates.join(', ') : 'N/A', '\n',
                      { text: 'Date(s) Attendance Marked: ', bold: true }, markedDates.length > 0 ? markedDates.join('; ') : 'N/A'
                    ],
                    fillColor: '#f8fafc', margin: [6, 6, 6, 6]
                  }
                ]
              ]
            },
            layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#cbd5e1', vLineColor: () => '#cbd5e1' },
            margin: [0, 8, 0, 10]
          }
        ]

        dateBatches.forEach((batchDates, bIdx) => {
          if (dateBatches.length > 1) {
            reportContent.push({
              text: `Lectures Batch ${bIdx + 1} of ${dateBatches.length} (${batchDates[0]} to ${batchDates[batchDates.length - 1]})`,
              style: 'subHeader',
              margin: [0, 6, 0, 6]
            })
          }

          const tableBody: any[] = [
            [
              { text: '#', style: 'tableHeader' },
              { text: 'Roll No', style: 'tableHeader' },
              { text: 'Student Name', style: 'tableHeader' },
              ...batchDates.map((d) => ({ text: d, style: 'tableHeader' })),
              { text: 'Present', style: 'tableHeader' },
              { text: 'Absent', style: 'tableHeader' },
              { text: 'Late', style: 'tableHeader' },
              { text: 'Att. %', style: 'tableHeader' }
            ]
          ]

          let idx = 1
          for (const [, entry] of studentMap) {
            const allStatuses = dates.map((d) => entry.records.get(d) ?? '-')
            const present = allStatuses.filter((s) => s === 'present').length
            const absent = allStatuses.filter((s) => s === 'absent').length
            const late = allStatuses.filter((s) => s === 'late').length
            const total = allStatuses.filter((s) => s !== '-').length
            const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 0

            const batchStatuses = batchDates.map((d) => entry.records.get(d) ?? '-')
            const statusCells = batchStatuses.map((s) => {
              if (s === 'present') return { text: 'P', color: '#15803d', bold: true, alignment: 'center' }
              if (s === 'absent') return { text: 'A', color: '#b91c1c', bold: true, alignment: 'center' }
              if (s === 'late') return { text: 'L', color: '#c2410c', bold: true, alignment: 'center' }
              if (s === 'half_day') return { text: 'H', color: '#1d4ed8', bold: true, alignment: 'center' }
              return { text: '-', color: '#94a3b8', alignment: 'center' }
            })

            tableBody.push([
              { text: String(idx++), alignment: 'center' },
              { text: entry.roll ?? '-', alignment: 'center' },
              { text: entry.name },
              ...statusCells,
              { text: String(present), alignment: 'center', bold: true, color: '#15803d' },
              { text: String(absent), alignment: 'center', bold: true, color: '#b91c1c' },
              { text: String(late), alignment: 'center', bold: true, color: '#c2410c' },
              { text: `${pct}%`, alignment: 'center', bold: true }
            ])
          }

          const dateColsWidth = batchDates.map(() => '*')
          const colWidths = [20, 45, '*', ...dateColsWidth, 35, 35, 30, 40]

          reportContent.push({
            table: {
              headerRows: 1,
              widths: colWidths,
              body: tableBody
            },
            layout: {
              hLineWidth: (i: number) => (i === 0 || i === 1 ? 1 : 0.5),
              vLineWidth: () => 0.5,
              hLineColor: () => '#cbd5e1',
              vLineColor: () => '#cbd5e1',
              fillColor: (rowIndex: number) => (rowIndex === 0 ? '#1e3a8a' : rowIndex % 2 === 0 ? '#f8fafc' : null)
            },
            margin: [0, 0, 0, 15]
          })
        })

        const docDefinition: any = {
          pageOrientation: isLandscape ? 'landscape' : 'portrait',
          content: reportContent,
          styles: {
            collegeTitle: { fontSize: 13, bold: true, color: '#1e3a8a' },
            reportTitle: { fontSize: 11, bold: true, color: '#0f172a', margin: [0, 3, 0, 0] },
            tableHeader: { bold: true, fontSize: 8, color: '#ffffff', alignment: 'center' }
          },
          defaultStyle: { font: 'Roboto', fontSize: 8 }
        }

        const printer = new PdfPrinter(fonts, fs as any, { resolve: () => {}, resolved: () => Promise.resolve() })
        const pdfDoc = await (printer as any).createPdfKitDocument(docDefinition)
        pdfDoc.end()

        const safeSubject = subjectName.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase()
        const filename = `subject_report_${safeSubject}_div${division_id}.pdf`
        ctx.response.header('Content-Type', 'application/pdf')
        ctx.response.header('Content-Disposition', `attachment; filename="${filename}"`)
        return ctx.response.stream(pdfDoc)
      }

      // Export class-wide overall report in PDF
      const masters = await LectureAttendanceMaster.query()
        .where('division_id', division_id)
        .where('academic_year', academic_year)
        .preload('subject')
        .preload('division', (q) => q.preload('class'))
        .preload('attendance_details')

      const teacherIds = masters.map((m) => m.teacher_id)
      const teacherMap = await this.getTeacherNamesMap(teacherIds)
      const allTeachersList = [...new Set(teacherIds.map((id) => teacherMap.get(id)).filter(Boolean))].join(', ') || 'N/A'

      const subjectIds = [...new Set(masters.map((m) => m.subject_id))]
      const subjectNames = new Map<number, string>()
      for (const m of masters) subjectNames.set(m.subject_id, m.subject?.name ?? `Subject ${m.subject_id}`)

      const division = await Divisions.query().where('id', division_id).preload('class').first()
      const divisionName = division ? `${division.class?.class ?? ''} - ${division.division}` : `Division ${division_id}`
      const rollColumn = division?.class ? this.getRollColumn(division.class.class) : 'first_year_roll_number'

      const enrollments = await StudentEnrollments.query()
        .where('division_id', division_id).where('academic_year', academic_year)
        .whereIn('status', ['pursuing', 'onboarded'])
        .preload('student', (sq) => sq.select('id', 'first_name', 'last_name', rollColumn).orderBy(rollColumn, 'asc'))

      type SubStats = { present: number; late: number; total: number }
      const studentSubjectMap = new Map<number, { name: string; roll: string | null; subjects: Map<number, SubStats> }>()
      for (const e of enrollments) {
        studentSubjectMap.set(e.student_id, { name: `${e.student.first_name} ${e.student.last_name}`, roll: (e.student as any)[rollColumn] ?? null, subjects: new Map() })
      }
      for (const master of masters) {
        for (const detail of master.attendance_details) {
          const se = studentSubjectMap.get(detail.student_id)
          if (!se) continue
          if (!se.subjects.has(master.subject_id)) se.subjects.set(master.subject_id, { present: 0, late: 0, total: 0 })
          const ss = se.subjects.get(master.subject_id)!
          ss.total++
          if (detail.attendance_status === 'present') ss.present++
          else if (detail.attendance_status === 'late') ss.late++
        }
      }

      const tableBody: any[] = [
        [
          { text: '#', style: 'tableHeader' },
          { text: 'Roll No', style: 'tableHeader' },
          { text: 'Student Name', style: 'tableHeader' },
          ...subjectIds.map((sid) => ({ text: subjectNames.get(sid) ?? '', style: 'tableHeader' })),
          { text: 'Overall %', style: 'tableHeader' }
        ]
      ]

      let idx = 1
      for (const [, entry] of studentSubjectMap) {
        const subCols = subjectIds.map((sid) => {
          const s = entry.subjects.get(sid)
          if (!s || s.total === 0) return { text: '0%', alignment: 'center' }
          const pct = Math.round(((s.present + s.late) / s.total) * 100)
          return { text: `${pct}%`, alignment: 'center' }
        })
        const totPresent = subjectIds.reduce((acc, sid) => acc + (entry.subjects.get(sid)?.present ?? 0) + (entry.subjects.get(sid)?.late ?? 0), 0)
        const totTotal = subjectIds.reduce((acc, sid) => acc + (entry.subjects.get(sid)?.total ?? 0), 0)
        const overallPct = totTotal > 0 ? Math.round((totPresent / totTotal) * 100) : 0

        tableBody.push([
          { text: String(idx++), alignment: 'center' },
          { text: entry.roll ?? '-', alignment: 'center' },
          { text: entry.name },
          ...subCols,
          { text: `${overallPct}%`, alignment: 'center', bold: true }
        ])
      }

      const subColsWidth = subjectIds.map(() => '*')
      const colWidths = [20, 50, '*', ...subColsWidth, 55]

      const docDefinition: any = {
        pageOrientation: subjectIds.length > 3 ? 'landscape' : 'portrait',
        content: [
          ...this.buildHeaderBlock('CLASS-WIDE LECTURE ATTENDANCE SUMMARY REPORT', undefined, subjectIds.length > 3),
          {
            table: {
              widths: ['*', '*'],
              body: [
                [
                  {
                    text: [
                      { text: 'Class & Division: ', bold: true }, divisionName, '\n',
                      { text: 'Academic Session: ', bold: true }, String(academic_year || '')
                    ],
                    fillColor: '#f8fafc', margin: [6, 6, 6, 6]
                  },
                  {
                    text: [
                      { text: 'Faculty / Teachers: ', bold: true }, allTeachersList, '\n',
                      { text: 'Report Generated Date: ', bold: true }, DateTime.now().toFormat('dd-MM-yyyy hh:mm a')
                    ],
                    fillColor: '#f8fafc', margin: [6, 6, 6, 6]
                  }
                ]
              ]
            },
            layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#cbd5e1', vLineColor: () => '#cbd5e1' },
            margin: [0, 8, 0, 10]
          },
          {
            table: {
              headerRows: 1,
              widths: colWidths,
              body: tableBody
            },
            layout: {
              hLineWidth: (i: number) => (i === 0 || i === 1 ? 1 : 0.5),
              vLineWidth: () => 0.5,
              hLineColor: () => '#cbd5e1',
              vLineColor: () => '#cbd5e1',
              fillColor: (rowIndex: number) => (rowIndex === 0 ? '#1e3a8a' : rowIndex % 2 === 0 ? '#f8fafc' : null)
            }
          }
        ],
        styles: {
          collegeTitle: { fontSize: 13, bold: true, color: '#1e3a8a' },
          reportTitle: { fontSize: 11, bold: true, color: '#0f172a', margin: [0, 3, 0, 0] },
          tableHeader: { bold: true, fontSize: 8, color: '#ffffff', alignment: 'center' }
        },
        defaultStyle: { font: 'Roboto', fontSize: 8 }
      }

      const printer = new PdfPrinter(fonts, fs as any, { resolve: () => {}, resolved: () => Promise.resolve() })
      const pdfDoc = await (printer as any).createPdfKitDocument(docDefinition)
      pdfDoc.end()

      const filename = `class_report_div${division_id}.pdf`
      ctx.response.header('Content-Type', 'application/pdf')
      ctx.response.header('Content-Disposition', `attachment; filename="${filename}"`)
      return ctx.response.stream(pdfDoc)
    } catch (error) {
      return ctx.response.status(500).json({ message: 'Error exporting report', error: error.message })
    }
  }
}
