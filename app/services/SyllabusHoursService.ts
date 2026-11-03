import AcademicCalendarSetting from '#models/AcademicCalendarSetting'
import LessonPlan from '#models/LessonPlan'
import NonLectureTemplate from '#models/non_lecture_template'
import SubjectDivisionMaster from '#models/SubjectDivisionMaster'
import db from '@adonisjs/lucid/services/db'

export type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
export type WorkingDayCounts = Record<WeekDay, number>

export type AllocationPeriod = {
  start_time?: string | null
  end_time?: string | null
  is_break?: boolean | null
  is_pt?: boolean | null
  is_free_period?: boolean | null
  is_library?: boolean | null
  is_seminar?: boolean | null
  subjects_division_masters_id?: number | null
  batch_name?: string | null
}

export type SubjectHoursIssue = {
  subject_id: number
  name: string
  required: number
  allocated: number
}

const WEEKDAYS: WeekDay[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const DAY_BY_INDEX: (WeekDay | null)[] = [null, 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const TOLERANCE_HOURS = 0.1

/** Maps a class name such as "3rd BHMS" to the year level used by the academic calendar. */
export const normalizeYearLevel = (raw: unknown): string => {
  if (!raw) return 'All'
  const s = String(raw).trim().toLowerCase()
  if (s.includes('1st') || s === '1' || s.includes('first')) return '1st Year'
  if (s.includes('2nd') || s === '2' || s.includes('second')) return '2nd Year'
  if (s.includes('3rd') || s === '3' || s.includes('third')) return '3rd Year'
  if (s.includes('4th') || s === '4' || s.includes('fourth')) return '4th Year'
  return 'All'
}

const extractMonthIndex = (monthString: string): number => {
  if (!monthString) return 0
  if (monthString.includes('-')) {
    const parts = monthString.split('-')
    const monthPart = parts.find((p) => p.length <= 2) || parts[1]
    return (Number.parseInt(monthPart) || 1) - 1
  }
  return (Number.parseInt(monthString) || 1) - 1
}

/**
 * First and last day of the academic session. Sessions are identified by their start year; one that
 * was never saved falls back to the same window the sessions list offers (January to December).
 */
const getSessionRange = async (academicYear: number) => {
  const row = await db.from('academic_sessions').where('start_year', academicYear).first()
  const startYear = row ? Number(row.start_year) : academicYear
  const endYear = row ? Number(row.end_year) : academicYear + 1
  const startMonth = row ? String(row.start_month) : `01-${academicYear}`
  const endMonth = row ? String(row.end_month) : `12-${academicYear}`

  const start = new Date(Date.UTC(startYear, extractMonthIndex(startMonth), 1))
  const end = new Date(Date.UTC(endYear, extractMonthIndex(endMonth) + 1, 0))
  return { start, end }
}

/**
 * Dates the calendar marks as non-working for a year level. Entries are plain YYYY-MM-DD strings
 * (old records) or JSON strings such as {"date":"2026-10-20","isWorkingDay":false,"applicableYear":"All"}.
 */
const parseHolidays = (raw: unknown, yearLevel: string): Set<string> => {
  const dates = new Set<string>()
  if (!Array.isArray(raw)) return dates

  for (const item of raw) {
    if (typeof item === 'string' && item.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(item)
        const level = normalizeYearLevel(parsed.applicableYear || parsed.year || parsed.targetYear)
        const appliesToClass = level === 'All' || level === yearLevel
        if (parsed.date && parsed.isWorkingDay === false && appliesToClass) {
          dates.add(String(parsed.date).split('T')[0])
        }
      } catch {
        // skip malformed entry
      }
    } else if (item) {
      dates.add(String(item).split('T')[0])
    }
  }
  return dates
}

/** Number of teaching days per weekday in the session for a class, after holidays and Sundays. */
export const getWorkingDayCounts = async (
  academicYear: number,
  yearLevel: string,
  configuredDays: string[]
): Promise<{ counts: WorkingDayCounts; isSaturdayWorking: boolean }> => {
  const counts: WorkingDayCounts = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0 }
  const setting = await AcademicCalendarSetting.findBy('academic_year', academicYear)
  const isSaturdayWorking = setting ? setting.is_saturday_working !== false : true
  const holidays = parseHolidays(setting?.non_working_dates, yearLevel)
  const { start, end } = await getSessionRange(academicYear)

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = DAY_BY_INDEX[d.getUTCDay()]
    if (!day) continue
    if (day === 'sat' && !isSaturdayWorking) continue
    if (holidays.has(d.toISOString().split('T')[0])) continue
    if (configuredDays.includes(day)) counts[day]++
  }
  return { counts, isSaturdayWorking }
}

/** Total syllabus hours per subject, taken from the lesson plans of the academic session. */
export const getRequiredHoursBySubject = async (academicYear: number, schoolId?: number | null) => {
  const query = LessonPlan.query().where('academic_year', academicYear)
  if (schoolId) query.where('school_id', schoolId)

  const lessonPlans = await query
    .preload('subject')
    .preload('topics', (q) => q.preload('subtopics'))

  const bySubject = new Map<number, { name: string; hours: number }>()
  for (const lp of lessonPlans) {
    let hours = 0
    for (const topic of lp.topics || []) {
      if (topic.subtopics && topic.subtopics.length > 0) {
        for (const st of topic.subtopics) hours += Number(st.requiredHours) || 0
      } else {
        hours += Number(topic.requiredHours) || 0
      }
    }
    const current = bySubject.get(lp.subjectId)
    bySubject.set(lp.subjectId, {
      name: lp.subject?.name || current?.name || 'Unknown Subject',
      hours: (current?.hours || 0) + hours,
    })
  }
  return bySubject
}

const toMinutes = (time?: string | null) => {
  if (!time) return 0
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Hours allocated per subject in a weekly timetable: each lecture slot repeats on every working day
 * of its weekday. Parallel batches run at the same time, so only the longest batch counts.
 */
export const allocatedHoursBySubject = (
  week: { day: WeekDay; periods: AllocationPeriod[] }[],
  counts: WorkingDayCounts,
  subjectBySdm: Map<number, number>
) => {
  const lectureMinutes = new Map<number, number>()
  const batchMinutes = new Map<number, Map<string, number>>()
  const seenSlots = new Set<string>()

  for (const { day, periods } of week) {
    for (const p of periods) {
      const sdmId = p.subjects_division_masters_id
      if (!sdmId || p.is_break || p.is_pt || p.is_free_period || p.is_library || p.is_seminar) continue

      const slotKey = `${sdmId}-${day}-${p.start_time}-${p.end_time}-${p.batch_name || 'lecture'}`
      if (seenSlots.has(slotKey)) continue
      seenSlots.add(slotKey)

      const minutes = Math.max(0, toMinutes(p.end_time) - toMinutes(p.start_time)) * (counts[day] || 0)
      if (p.batch_name) {
        const batches = batchMinutes.get(sdmId) || new Map<string, number>()
        batches.set(p.batch_name, (batches.get(p.batch_name) || 0) + minutes)
        batchMinutes.set(sdmId, batches)
      } else {
        lectureMinutes.set(sdmId, (lectureMinutes.get(sdmId) || 0) + minutes)
      }
    }
  }

  const hoursBySubject = new Map<number, number>()
  const sdmIds = new Set([...lectureMinutes.keys(), ...batchMinutes.keys()])
  for (const sdmId of sdmIds) {
    const subjectId = subjectBySdm.get(sdmId)
    if (!subjectId) continue
    const longestBatch = Math.max(0, ...(batchMinutes.get(sdmId)?.values() || []))
    const minutes = (lectureMinutes.get(sdmId) || 0) + longestBatch
    hoursBySubject.set(subjectId, (hoursBySubject.get(subjectId) || 0) + minutes / 60)
  }
  return hoursBySubject
}

/** Active subjects taught in the division for the session: subjects_division_masters id -> subject id. */
export const getSubjectBySdm = async (divisionId: number, academicYear: number) => {
  const rows = await SubjectDivisionMaster.query()
    .where('division_id', divisionId)
    .where('academic_year', academicYear)
    .where('status', 'Active')
  return new Map<number, number>(rows.map((r) => [r.id, r.subject_id]))
}

/**
 * Non-lecture lesson plans (templates linked to a subject) that apply to a class in a session. A plan
 * without a class or session applies to every class or session.
 */
export const getNonLectureTemplatesForClass = async (
  classId: number,
  academicYear: number,
  schoolId?: number | null
) => {
  return NonLectureTemplate.query()
    .whereNotNull('subject_id')
    .where('is_active', true)
    .where((q) => q.whereNull('class_id').orWhere('class_id', classId))
    .where((q) => q.whereNull('academic_session_id').orWhere('academic_session_id', academicYear))
    .if(schoolId, (q) => q.where((w) => w.where('school_id', Number(schoolId)).orWhereNull('school_id')))
}

/** Hours the timetable owes a non-lecture plan: the allotted teaching hours, else the plan's own total. */
export const teachingHoursOf = (template: NonLectureTemplate) =>
  Number(template.teachingHours ?? template.totalHours ?? 0)

/** Syllabus hours of the subjects this division actually studies, lecture and non-lecture. */
export const requiredHoursForDivision = async (
  subjectBySdm: Map<number, number>,
  academicYear: number,
  classId: number,
  schoolId?: number | null
) => {
  const divisionSubjects = new Set(subjectBySdm.values())
  const required = new Map<number, { name: string; hours: number }>()

  const lectureHours = await getRequiredHoursBySubject(academicYear, schoolId)
  for (const [subjectId, value] of lectureHours) {
    if (divisionSubjects.has(subjectId)) required.set(subjectId, { ...value })
  }

  const templates = await getNonLectureTemplatesForClass(classId, academicYear, schoolId)
  const subjectNames = new Map<number, string>()
  if (templates.length) {
    const rows = await db.from('subjects').whereIn('id', [...new Set(templates.map((t) => Number(t.subjectId)))])
    rows.forEach((r) => subjectNames.set(Number(r.id), String(r.name)))
  }
  for (const template of templates) {
    const subjectId = Number(template.subjectId)
    if (!divisionSubjects.has(subjectId)) continue
    const current = required.get(subjectId)
    required.set(subjectId, {
      name: current?.name || subjectNames.get(subjectId) || template.title,
      hours: (current?.hours || 0) + teachingHoursOf(template),
    })
  }
  return required
}

/** Compares the allocated hours of a weekly timetable with the syllabus hours of every subject. */
export const compareWithSyllabus = (
  required: Map<number, { name: string; hours: number }>,
  allocated: Map<number, number>
) => {
  const under: SubjectHoursIssue[] = []
  const over: SubjectHoursIssue[] = []

  for (const [subjectId, { name, hours }] of required) {
    if (hours <= 0) continue
    const allocatedHours = allocated.get(subjectId) || 0
    const issue = { subject_id: subjectId, name, required: hours, allocated: allocatedHours }
    if (allocatedHours < hours - TOLERANCE_HOURS) under.push(issue)
    else if (allocatedHours > hours + TOLERANCE_HOURS) over.push(issue)
  }
  return { under, over }
}

export { WEEKDAYS }
