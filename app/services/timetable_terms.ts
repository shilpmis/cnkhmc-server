import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import ClassDayConfig from '#models/ClassDayConfig'
import Divisions from '#models/Divisions'
import PeriodsConfig from '#models/PeriodsConfig'
import SchoolTimeTableConfig from '#models/SchoolTimeTableConfig'
import AcademicTerm from '#models/academic_term'
import TimetableVersion from '#models/timetable_version'

const IST = 'Asia/Kolkata'

export const todayKey = () => DateTime.now().setZone(IST).toISODate() as string

export const dateOnly = (value: unknown): string | null => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
  if (typeof value === 'object' && typeof (value as any).toISODate === 'function') return (value as any).toISODate()
  const s = String(value).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

export const parseVersionPeriods = (version: TimetableVersion): any[] => {
  try {
    const raw = version.version_data as unknown
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Loads a saved timetable into the live timetable of its division and makes it the active version.
 * The live timetable is what attendance, diaries and the dashboards read, so this is what changes the
 * timetable for every user.
 */
export const applyVersionToLive = async (version: TimetableVersion) => {
  const periods = parseVersionPeriods(version)

  const division = await Divisions.query().where('id', version.division_id).first()
  if (!division) throw new Error('Associated division not found')

  const schoolConfig = await SchoolTimeTableConfig.query().where('academic_year', version.academic_year).first()
  if (!schoolConfig) throw new Error('School timetable config not found for this academic session')

  const dayConfigs = await ClassDayConfig.query()
    .where('school_timetable_config_id', schoolConfig.id)
    .andWhere('class_id', division.class_id)

  const dayConfigMap = new Map<string, number>()
  const dayConfigIdSet = new Set(dayConfigs.map((d) => d.id))
  dayConfigs.forEach((d) => dayConfigMap.set(d.day, d.id))

  const trx = await db.transaction()
  try {
    await PeriodsConfig.query()
      .where('division_id', version.division_id)
      .whereIn('class_day_config_id', Array.from(dayConfigIdSet))
      .useTransaction(trx)
      .delete()

    let restored = 0
    for (const p of periods) {
      let classDayConfigId = p.class_day_config_id
      if (!classDayConfigId || !dayConfigIdSet.has(classDayConfigId)) {
        if (p.day && dayConfigMap.has(p.day)) {
          classDayConfigId = dayConfigMap.get(p.day)!
        } else if (p.period_config_class_day?.day && dayConfigMap.has(p.period_config_class_day.day)) {
          classDayConfigId = dayConfigMap.get(p.period_config_class_day.day)!
        }
      }
      if (!classDayConfigId || !dayConfigIdSet.has(classDayConfigId)) continue

      await PeriodsConfig.create(
        {
          class_day_config_id: classDayConfigId,
          division_id: version.division_id,
          period_order: p.period_order,
          start_time: p.start_time,
          end_time: p.end_time,
          is_break: !!p.is_break,
          subjects_division_masters_id: p.subjects_division_masters_id || null,
          staff_enrollment_id: p.staff_enrollment_id || null,
          lab_id: p.lab_id || null,
          is_pt: !!p.is_pt,
          is_free_period: !!p.is_free_period,
          is_library: !!p.is_library,
          is_seminar: !!p.is_seminar,
          batch_name: p.batch_name || null,
        },
        { client: trx }
      )
      restored++
    }

    await TimetableVersion.query()
      .where('division_id', version.division_id)
      .andWhere('academic_year', version.academic_year)
      .useTransaction(trx)
      .update({ is_active: false })

    version.is_active = true
    await version.useTransaction(trx).save()
    await trx.commit()
    return restored
  } catch (error) {
    await trx.rollback()
    throw error
  }
}

export const listTerms = (classId: number, academicYear: number) =>
  AcademicTerm.query()
    .where('class_id', classId)
    .andWhere('academic_year', academicYear)
    .orderBy('term_number', 'asc')

/** The term of a class that contains a date, if terms are configured. */
export const termOn = async (classId: number, academicYear: number, date: string) => {
  const terms = await listTerms(classId, academicYear)
  return terms.find((t) => dateOnly(t.start_date)! <= date && date <= dateOnly(t.end_date)!) || null
}

let lastSwitchDay: string | null = null

/**
 * Once a day (first request after midnight) the timetable of the term that today falls in becomes the live
 * timetable of every division that has one. Divisions whose term has no timetable yet are left as they are.
 */
export const switchToCurrentTerms = async (force = false) => {
  const today = todayKey()
  if (!force && lastSwitchDay === today) return 0
  lastSwitchDay = today

  const terms = await AcademicTerm.query().where('start_date', '<=', today).andWhere('end_date', '>=', today)
  let switched = 0
  for (const term of terms) {
    const divisions = await Divisions.query().where('class_id', term.class_id)
    for (const division of divisions) {
      try {
        const version = await TimetableVersion.query()
          .where('division_id', division.id)
          .andWhere('academic_year', term.academic_year)
          .andWhere('term_id', term.id)
          .first()
        if (version && !version.is_active) {
          await applyVersionToLive(version)
          switched++
        }
      } catch (error) {
        console.error(`Term switch failed for division ${division.id}:`, error)
      }
    }
  }
  return switched
}

/**
 * Teachers log nothing for a date before its term has started. When terms are configured for the class, a date
 * outside every term (before the first term, or in a gap between terms) is refused; a date after the last term
 * is left alone. Returns the message to show, or null when logging is allowed.
 */
export const termNotStartedMessage = async (
  classId: number | null | undefined,
  academicYear: number | null | undefined,
  date: string
): Promise<string | null> => {
  if (!classId || !academicYear) return null
  const day = dateOnly(date)
  if (!day) return null
  const terms = await listTerms(Number(classId), Number(academicYear))
  if (terms.length === 0) return null
  if (terms.some((t) => dateOnly(t.start_date)! <= day && day <= dateOnly(t.end_date)!)) return null
  const next = terms.find((t) => dateOnly(t.start_date)! > day)
  if (!next) return null
  const when = DateTime.fromISO(dateOnly(next.start_date)!).toFormat('dd LLL yyyy')
  return `${next.name} starts on ${when}. Activity cannot be logged before the term starts.`
}
