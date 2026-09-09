import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { ValidatorForMarkLectureAttendance } from '#validators/lectureAttendance'
import LectureAttendanceMaster from '#models/LectureAttendanceMaster'
import LectureAttendanceDetail from '#models/LectureAttendanceDetail'
import SubjectDivisionStaffMaster from '#models/SubjectDivisionStaffMaster'
import SubjectDivisionMaster from '#models/SubjectDivisionMaster'
import StudentEnrollments from '#models/StudentEnrollments'
import Divisions from '#models/Divisions'

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
  // GET /lecture-attendance/subjects
  // Returns subject+division assignments for the logged-in teacher
  // ──────────────────────────────────────────────────────────────────────────
  async getMySubjects(ctx: HttpContext) {
    try {
      const user = ctx.auth.user!
      const academic_year = ctx.request.qs().academic_session as number

      // Admin / Principal / Super Admin: return all subject-division mappings
      const isAdmin = [1, 2, 3, 6].includes(user.role_id as number)

      let subjectDivisionQuery = SubjectDivisionMaster.query()
        .preload('subject')
        .where('status', 'Active')

      if (academic_year) {
        subjectDivisionQuery = subjectDivisionQuery.where('academic_year', academic_year)
      }

      if (!isAdmin) {
        // Teacher: find their staff_enrollment_id first
        const staffId = user.staff_id
        if (!staffId) {
          return ctx.response.status(403).json({ message: 'No staff profile linked to this account.' })
        }

        // Get all subjects_division_id linked to this teacher's staff enrollments
        const staffAssignments = await SubjectDivisionStaffMaster.query()
          .whereHas('staff_enrollment', (q) => {
            q.where('staff_id', staffId)
          })
          .where('status', 'Active')
          .select('subjects_division_id')

        const assignedIds = staffAssignments.map((a) => a.subjects_division_id)
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

      const date = new Date(unix_date * 1000).toISOString().split('T')[0]

      // No future dates allowed
      if (DateTime.fromISO(date) > DateTime.now().startOf('day')) {
        return ctx.response.status(400).json({ message: "Cannot fetch attendance for future dates." })
      }

      // Resolve roll number column
      const division = await Divisions.query().where('id', division_id).preload('class').first()
      const rollColumn = division?.class ? this.getRollColumn(division.class.class) : 'first_year_roll_number'

      const existing = await LectureAttendanceMaster.query()
        .where('division_id', division_id)
        .where('subject_id', subject_id)
        .where('attendance_date', date)
        .where('academic_year', academic_year)
        .preload('attendance_details', (q) => {
          q.preload('student', (sq) =>
            sq.select('id', 'first_name', 'middle_name', 'last_name', rollColumn)
          )
        })
        .first()

      if (existing) {
        return ctx.response.status(200).json({
          date,
          division_id: Number(division_id),
          subject_id: Number(subject_id),
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

      const attendance_date = DateTime.fromJSDate(new Date(payload.date as any))
      const today = DateTime.now().startOf('day')

      if (attendance_date > today) {
        return ctx.response.status(400).json({ message: "Cannot mark attendance for future dates." })
      }

      const dateStr = attendance_date.toISODate()!

      // Duplicate check
      const duplicate = await LectureAttendanceMaster.query()
        .where('division_id', division_id)
        .where('subject_id', subject_id)
        .where('attendance_date', dateStr)
        .where('academic_year', academic_year)
        .first()

      if (duplicate) {
        return ctx.response.status(409).json({
          message: 'Attendance already marked for this subject and class on this date.',
        })
      }

      const trx = await db.transaction()
      try {
        const master = await LectureAttendanceMaster.create(
          {
            academic_year,
            division_id,
            subject_id,
            teacher_id: marked_by,
            attendance_date: dateStr,
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

      // Build CSV
      const rows: string[] = ['Date,Session Type,Student Name,Roll Number,Status,Remarks']
      for (const master of records) {
        const rollColumn = master.division?.class
          ? this.getRollColumn(master.division.class.class)
          : 'first_year_roll_number'
        for (const detail of master.attendance_details) {
          const rollNum = (detail.student as any)[rollColumn] ?? ''
          const name = `${detail.student.first_name} ${detail.student.last_name}`
          rows.push(
            [
              master.attendance_date,
              master.session_type,
              `"${name}"`,
              rollNum,
              detail.attendance_status,
              detail.remarks ? `"${detail.remarks}"` : '',
            ].join(',')
          )
        }
      }

      const subjectName = records[0]?.subject?.name ?? `subject_${subject_id}`
      const divisionName = records[0]?.division?.division ?? `div_${division_id}`
      const filename = `lecture_attendance_${subjectName}_${divisionName}.csv`
        .replace(/\s+/g, '_')
        .toLowerCase()

      ctx.response.header('Content-Type', 'text/csv')
      ctx.response.header('Content-Disposition', `attachment; filename="${filename}"`)
      return ctx.response.send(rows.join('\n'))
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
        for (const detail of master.attendance_details) {
          const entry = studentMap.get(detail.student_id)
          if (!entry) continue
          entry.records.push({
            date: master.attendance_date,
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

      return ctx.response.status(200).json({ data, sessions: masters.map((m) => ({ date: m.attendance_date, session_type: m.session_type })) })
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
        // Export class+subject: date-by-date per student
        const masters = await LectureAttendanceMaster.query()
          .where('division_id', division_id)
          .where('subject_id', subject_id)
          .where('academic_year', academic_year)
          .preload('subject')
          .preload('attendance_details')
          .orderBy('attendance_date', 'asc')

        const division = await Divisions.query().where('id', division_id).preload('class').first()
        const rollColumn = division?.class ? this.getRollColumn(division.class.class) : 'first_year_roll_number'
        const enrollments = await StudentEnrollments.query()
          .where('division_id', division_id).where('academic_year', academic_year)
          .whereIn('status', ['pursuing', 'onboarded'])
          .preload('student', (sq) => sq.select('id', 'first_name', 'last_name', rollColumn).orderBy(rollColumn, 'asc'))

        const dates = masters.map((m) => m.attendance_date)
        const header = ['Student Name', 'Roll No', ...dates, 'Present', 'Absent', 'Late', 'Attendance %'].join(',')

        const studentMap = new Map<number, { name: string; roll: string | null; records: Map<string, string> }>()
        for (const e of enrollments) {
          studentMap.set(e.student_id, {
            name: `${e.student.first_name} ${e.student.last_name}`,
            roll: (e.student as any)[rollColumn] ?? null,
            records: new Map(),
          })
        }
        for (const master of masters) {
          for (const detail of master.attendance_details) {
            studentMap.get(detail.student_id)?.records.set(master.attendance_date, detail.attendance_status)
          }
        }

        const rows = [header]
        for (const [, entry] of studentMap) {
          const statuses = dates.map((d) => entry.records.get(d) ?? '-')
          const present = statuses.filter((s) => s === 'present').length
          const absent = statuses.filter((s) => s === 'absent').length
          const late = statuses.filter((s) => s === 'late').length
          const total = statuses.filter((s) => s !== '-').length
          const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 0
          rows.push([`"${entry.name}"`, entry.roll ?? '', ...statuses, present, absent, late, `${pct}%`].join(','))
        }

        const subName = masters[0]?.subject?.name ?? `subject_${subject_id}`
        const filename = `report_${subName}_div${division_id}.csv`.replace(/\s+/g, '_').toLowerCase()
        ctx.response.header('Content-Type', 'text/csv')
        ctx.response.header('Content-Disposition', `attachment; filename="${filename}"`)
        return ctx.response.send(rows.join('\n'))
      }

      // Export class-wide: student × subject % table
      const masters = await LectureAttendanceMaster.query()
        .where('division_id', division_id)
        .where('academic_year', academic_year)
        .preload('subject')
        .preload('attendance_details')

      const subjectIds = [...new Set(masters.map((m) => m.subject_id))]
      const subjectNames = new Map<number, string>()
      for (const m of masters) subjectNames.set(m.subject_id, m.subject?.name ?? `subject_${m.subject_id}`)

      const division = await Divisions.query().where('id', division_id).preload('class').first()
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

      const subjectColHeaders = subjectIds.map((sid) => `"${subjectNames.get(sid)}"`)
      const header = ['Student Name', 'Roll No', ...subjectColHeaders, 'Overall %'].join(',')
      const rows = [header]
      for (const [, entry] of studentSubjectMap) {
        const subCols = subjectIds.map((sid) => {
          const s = entry.subjects.get(sid)
          if (!s || s.total === 0) return '0%'
          return `${Math.round(((s.present + s.late) / s.total) * 100)}%`
        })
        const totPresent = subjectIds.reduce((acc, sid) => acc + (entry.subjects.get(sid)?.present ?? 0) + (entry.subjects.get(sid)?.late ?? 0), 0)
        const totTotal = subjectIds.reduce((acc, sid) => acc + (entry.subjects.get(sid)?.total ?? 0), 0)
        const overallPct = totTotal > 0 ? Math.round((totPresent / totTotal) * 100) : 0
        rows.push([`"${entry.name}"`, entry.roll ?? '', ...subCols, `${overallPct}%`].join(','))
      }

      const filename = `class_report_div${division_id}.csv`
      ctx.response.header('Content-Type', 'text/csv')
      ctx.response.header('Content-Disposition', `attachment; filename="${filename}"`)
      return ctx.response.send(rows.join('\n'))
    } catch (error) {
      return ctx.response.status(500).json({ message: 'Error exporting report', error: error.message })
    }
  }
}
