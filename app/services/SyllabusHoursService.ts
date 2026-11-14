import AcademicCalendarSetting from '#models/AcademicCalendarSetting'
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

/** Hours a subject owes: from its lecture lesson plan and/or its non-lecture plan. */
export type RequiredHours = { name: string; hours: number; nonLecture?: boolean }

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
export const getSessionRange = async (academicYear: number) => {
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

/**
 * Title of the academic calendar entry that closes the school on a date, or null on a working day.
 * Only entries marked non-working count. An entry for one year level closes a class of that level; one
 * for "All" closes everybody. The class is optional: without it only "All" entries apply.
 * `academicYears` are the calendar settings to check; without them the years around the date are used.
 */
export const getCalendarClosure = async (
  date: string,
  opts: { academicYears?: Array<number | null | undefined>; classId?: number | null; divisionId?: number | null } = {}
): Promise<string | null> => {
  const day = String(date || '').split('T')[0]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null

  let classId = opts.classId ? Number(opts.classId) : null
  if (!classId && opts.divisionId) {
    const division = await db.from('divisions').where('id', Number(opts.divisionId)).first()
    classId = division?.class_id ? Number(division.class_id) : null
  }
  let yearLevel = 'All'
  if (classId) {
    const cls = await db.from('classes').where('id', classId).first()
    yearLevel = normalizeYearLevel(cls?.class)
  }

  const dateYear = Number(day.slice(0, 4))
  const years = [...new Set((opts.academicYears || []).map(Number).filter((n) => Number.isFinite(n) && n > 0))]
  let settings = years.length ? await AcademicCalendarSetting.query().whereIn('academic_year', years) : []
  if (!settings.length) {
    settings = await AcademicCalendarSetting.query().whereIn('academic_year', [dateYear, dateYear - 1])
  }
  for (const setting of settings) {
    const raw = setting.non_working_dates
    if (!Array.isArray(raw)) continue
    for (const item of raw) {
      if (typeof item === 'string' && item.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(item)
          const level = normalizeYearLevel(parsed.applicableYear || parsed.year || parsed.targetYear)
          const applies = level === 'All' || level === yearLevel
          if (applies && parsed.isWorkingDay === false && String(parsed.date || '').split('T')[0] === day) {
            return String(parsed.title || 'a non-working day')
          }
        } catch {
          // skip malformed entry
        }
      } else if (item && String(item).split('T')[0] === day) {
        return 'a holiday'
      }
    }
  }
  return null
}

export type CalendarClosure = { date: string; title: string; level: string }

/** Every non-working calendar entry of a session, with the year level it applies to ("All" or e.g. "1st Year"). */
export const listCalendarClosures = async (academicYear: number): Promise<CalendarClosure[]> => {
  const setting = await AcademicCalendarSetting.findBy('academic_year', academicYear)
  const raw = setting?.non_working_dates
  if (!Array.isArray(raw)) return []

  const closures: CalendarClosure[] = []
  for (const item of raw) {
    if (typeof item === 'string' && item.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(item)
        if (parsed.date && parsed.isWorkingDay === false) {
          closures.push({
            date: String(parsed.date).split('T')[0],
            title: String(parsed.title || 'a non-working day'),
            level: normalizeYearLevel(parsed.applicableYear || parsed.year || parsed.targetYear),
          })
        }
      } catch {
        // skip malformed entry
      }
    } else if (item) {
      closures.push({ date: String(item).split('T')[0], title: 'a holiday', level: 'All' })
    }
  }
  return closures
}

/** Message shown when a teacher tries to log on a day the calendar has closed. */
export const closureMessage = (date: string, title: string) =>
  `Logging is not allowed on ${String(date).split('T')[0]}: the academic calendar marks it as non-working (${title}).`

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

const toDateKey = (value: unknown): string | null => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
  const s = String(value).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

/** Dates the calendar closes for a year level, and whether Saturdays are teaching days. */
export const getClosedDates = async (academicYear: number, yearLevel: string) => {
  const setting = await AcademicCalendarSetting.findBy('academic_year', academicYear)
  return {
    holidays: parseHolidays(setting?.non_working_dates, yearLevel),
    isSaturdayWorking: setting ? setting.is_saturday_working !== false : true,
  }
}

/** One weekly timetable and the dates it runs on: a saved version, or the live timetable of an unversioned session. */
export type AllocationSpan = {
  /** Where two spans overlap the later-saved one (higher priority) owns the day. */
  priority: number
  /** YYYY-MM-DD; null means the start / end of the session. */
  start: string | null
  end: string | null
  week: { day: WeekDay; periods: AllocationPeriod[] }[]
}

const MAX_SPAN_DAYS = 3660

/**
 * Hours allocated per subject over a session whose timetable changes over time (timetable history).
 * For every working day (no Sunday, no calendar holiday, Saturday only if working) the timetable of the
 * version covering that day is the one that runs, so each version contributes
 * lectures per weekday x working days of that weekday inside its own dates, and the versions add up.
 */
export const allocateAcrossSpans = (
  spans: AllocationSpan[],
  range: { start: Date; end: Date },
  closed: { holidays: Set<string>; isSaturdayWorking: boolean },
  subjectBySdm: Map<number, number>
) => {
  const rangeStart = range.start.toISOString().slice(0, 10)
  const rangeEnd = range.end.toISOString().slice(0, 10)
  const resolved = spans.map((s) => ({
    ...s,
    startKey: toDateKey(s.start) ?? rangeStart,
    endKey: toDateKey(s.end) ?? rangeEnd,
    counts: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0 } as WorkingDayCounts,
  }))

  if (resolved.length > 0) {
    const first = resolved.reduce((m, s) => (s.startKey < m ? s.startKey : m), resolved[0].startKey)
    const last = resolved.reduce((m, s) => (s.endKey > m ? s.endKey : m), resolved[0].endKey)
    const d = new Date(`${first}T00:00:00Z`)
    for (let i = 0; i < MAX_SPAN_DAYS; i++, d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10)
      if (key > last) break
      const day = DAY_BY_INDEX[d.getUTCDay()]
      if (!day) continue
      if (day === 'sat' && !closed.isSaturdayWorking) continue
      if (closed.holidays.has(key)) continue

      let owner: (typeof resolved)[number] | null = null
      for (const s of resolved) {
        if (s.startKey <= key && key <= s.endKey && (!owner || s.priority > owner.priority)) owner = s
      }
      if (owner) owner.counts[day]++
    }
  }

  const allocated = new Map<number, number>()
  for (const s of resolved) {
    for (const [subjectId, hours] of allocatedHoursBySubject(s.week, s.counts, subjectBySdm)) {
      allocated.set(subjectId, (allocated.get(subjectId) || 0) + hours)
    }
  }
  return {
    allocated,
    spans: resolved.map((s) => ({ priority: s.priority, start: s.startKey, end: s.endKey, working_days: s.counts })),
  }
}

/**
 * Total syllabus hours per subject, taken from the lesson plans of the academic session. A topic with
 * subtopics owes the sum of its subtopics' hours, otherwise its own hours. One summed query: loading every
 * topic and subtopic of every plan made this the slowest part of the hours check.
 */
export const getRequiredHoursBySubject = async (academicYear: number, schoolId?: number | null) => {
  const bindings: (number | null)[] = [academicYear]
  if (schoolId) bindings.push(schoolId)
  const [rows] = await db.rawQuery(
    `SELECT lp.subject_id AS subject_id,
            COALESCE(s.name, 'Unknown Subject') AS name,
            COALESCE(SUM(CASE WHEN COALESCE(st.cnt, 0) > 0 THEN st.hours ELSE t.required_hours END), 0) AS hours
       FROM lesson_plans lp
       LEFT JOIN subjects s ON s.id = lp.subject_id
       LEFT JOIN lesson_plan_topics t ON t.lesson_plan_id = lp.id
       LEFT JOIN (
         SELECT topic_id, COUNT(*) AS cnt, COALESCE(SUM(required_hours), 0) AS hours
           FROM lesson_plan_subtopics GROUP BY topic_id
       ) st ON st.topic_id = t.id
      WHERE lp.academic_year = ? ${schoolId ? 'AND lp.school_id = ?' : ''}
      GROUP BY lp.subject_id, s.name`,
    bindings
  )

  const bySubject = new Map<number, { name: string; hours: number }>()
  for (const row of rows as any[]) {
    bySubject.set(Number(row.subject_id), { name: String(row.name), hours: Number(row.hours) || 0 })
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

/**
 * Activity type(s) of each subject's non-lecture plans (e.g. "Seminar", "Practical"), so the timetable
 * can show what kind of session a non-lecture subject is wherever it is scheduled.
 */
export const activityTypesBySubject = (templates: NonLectureTemplate[]) => {
  const bySubject = new Map<number, string[]>()
  for (const template of templates) {
    const type = String(template.activityType || '').trim()
    if (!template.subjectId || !type) continue
    const key = Number(template.subjectId)
    const list = bySubject.get(key) || []
    if (!list.includes(type)) list.push(type)
    bySubject.set(key, list)
  }
  return bySubject
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
  const required = new Map<number, RequiredHours>()

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
      nonLecture: true,
    })
  }
  return required
}

/** Compares the allocated hours of a weekly timetable with the syllabus hours of every subject. */
/** ok / under / over for allocated against required hours, within the rounding tolerance. */
export const hoursStatus = (required: number, allocated: number): 'ok' | 'under' | 'over' =>
  allocated < required - TOLERANCE_HOURS ? 'under' : allocated > required + TOLERANCE_HOURS ? 'over' : 'ok'

/**
 * A lecture subject without syllabus hours is not checked. A subject with a non-lecture plan always is, even
 * when the plan owes 0 hours: hours given to it in the timetable are then over-allocation.
 */
export const compareWithSyllabus = (required: Map<number, RequiredHours>, allocated: Map<number, number>) => {
  const under: SubjectHoursIssue[] = []
  const over: SubjectHoursIssue[] = []

  for (const [subjectId, { name, hours, nonLecture }] of required) {
    if (hours <= 0 && !nonLecture) continue
    const allocatedHours = allocated.get(subjectId) || 0
    const issue = { subject_id: subjectId, name, required: hours, allocated: allocatedHours }
    const status = hoursStatus(hours, allocatedHours)
    if (status === 'under') under.push(issue)
    else if (status === 'over') over.push(issue)
  }
  return { under, over }
}

export { WEEKDAYS }
