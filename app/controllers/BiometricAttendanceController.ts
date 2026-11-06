import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Staff from '#models/Staff'
import User from '#models/User'
import accessControl from '#services/access_control'
import {
  BIOMETRIC_REMARK_PREFIX,
  DEFAULT_RULES,
  type BiometricRules,
  remarksFor,
  suggestMatches,
  summarizeDay,
} from '#services/biometric_attendance'

/** Roles that manage staff attendance today; others need a template that allows updating Attendance. */
const MANAGER_ROLES = [1, 2, 3, 8, 11]
const MAX_PUNCHES_PER_REQUEST = 5000
const MAX_EMPLOYEES_PER_REQUEST = 2000
const MAX_PROCESS_DAYS = 92

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const DATE_TIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const cleanCode = (value: unknown) => String(value ?? '').trim().slice(0, 32)

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)

const staffName = (s: { title?: string | null; first_name?: string | null; middle_name?: string | null; last_name?: string | null }) =>
  [s.title, s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ')

export default class BiometricAttendanceController {
  /** School of the signed-in user, or null (with a response already sent) when not allowed. */
  private async authorize(ctx: HttpContext): Promise<number | null> {
    const user = ctx.auth.user as User
    const schoolId = Number(user?.school_id)
    if (!schoolId) {
      ctx.response.forbidden({ message: 'No school is linked to this account' })
      return null
    }
    if (!(await accessControl.allows(user, 'update', 'Attendance', MANAGER_ROLES))) {
      ctx.response.forbidden({ message: 'You are not allowed to manage biometric attendance' })
      return null
    }
    return schoolId
  }

  private async rulesFor(schoolId: number): Promise<BiometricRules> {
    const row = await db.from('biometric_settings').where('school_id', schoolId).first()
    if (!row) return { ...DEFAULT_RULES }
    return {
      shift_start: String(row.shift_start),
      grace_minutes: Number(row.grace_minutes),
      half_day_minutes: Number(row.half_day_minutes),
      full_day_minutes: Number(row.full_day_minutes),
      duplicate_window_minutes: Number(row.duplicate_window_minutes),
      overwrite_self_marked: !!row.overwrite_self_marked,
    }
  }

  /** Counts for the overview, and the time to continue importing from. */
  async summary(ctx: HttpContext) {
    const schoolId = await this.authorize(ctx)
    if (!schoolId) return

    const totals = await db
      .from('biometric_punches')
      .where('school_id', schoolId)
      .select(
        db.raw('COUNT(*) as total'),
        db.raw("DATE_FORMAT(MIN(punch_time), '%Y-%m-%d %H:%i:%s') as first_punch"),
        db.raw("DATE_FORMAT(MAX(punch_time), '%Y-%m-%d %H:%i:%s') as last_punch")
      )
      .first()

    const linkedStaff = await Staff.query()
      .where('school_id', schoolId)
      .whereNotNull('biometric_code')
      .whereNot('biometric_code', '')
      .count('* as total')
    const activeStaff = await Staff.query().where('school_id', schoolId).where('is_active', true).count('* as total')

    // Device users who punch but are not linked to any staff member
    const unlinked = await db
      .from('biometric_punches as p')
      .leftJoin('staff as s', (join) => {
        join.on('s.biometric_code', '=', 'p.device_user_id').andOn('s.school_id', '=', 'p.school_id')
      })
      .where('p.school_id', schoolId)
      .whereNull('s.id')
      .countDistinct('p.device_user_id as total')
      .first()

    return ctx.response.ok({
      punches: Number(totals?.total || 0),
      first_punch: totals?.first_punch || null,
      last_punch: totals?.last_punch || null,
      linked_staff: Number(linkedStaff[0].$extras.total || 0),
      active_staff: Number(activeStaff[0].$extras.total || 0),
      unlinked_device_users: Number(unlinked?.total || 0),
      employees: Number((await db.from('biometric_employees').where('school_id', schoolId).count('* as total').first())?.total || 0),
      rules: await this.rulesFor(schoolId),
    })
  }

  /** Stores the employee list from the eSSL software; existing entries are updated. */
  async storeEmployees(ctx: HttpContext) {
    const schoolId = await this.authorize(ctx)
    if (!schoolId) return

    const input = ctx.request.input('employees')
    if (!Array.isArray(input) || input.length === 0) {
      return ctx.response.badRequest({ message: 'employees must be a non-empty list' })
    }
    if (input.length > MAX_EMPLOYEES_PER_REQUEST) {
      return ctx.response.badRequest({ message: `Send at most ${MAX_EMPLOYEES_PER_REQUEST} employees per request` })
    }

    const rows = input
      .map((e: any) => [
        schoolId,
        cleanCode(e?.device_user_id),
        e?.name ? String(e.name).trim().slice(0, 191) : null,
        e?.department ? String(e.department).trim().slice(0, 191) : null,
        e?.status ? String(e.status).trim().slice(0, 32) : null,
      ])
      .filter((e: any[]) => e[1] && e[1] !== '0')

    if (rows.length > 0) {
      const placeholders = rows.map(() => '(?, ?, ?, ?, ?, NOW(), NOW())').join(', ')
      await db.rawQuery(
        `INSERT INTO biometric_employees (school_id, device_user_id, name, department, status, created_at, updated_at)
         VALUES ${placeholders}
         ON DUPLICATE KEY UPDATE name = VALUES(name), department = VALUES(department), status = VALUES(status), updated_at = NOW()`,
        rows.flat()
      )
    }
    return ctx.response.ok({ saved: rows.length })
  }

  /** Adds raw punches. A punch already stored (same device user and time) is skipped, so re-imports are safe. */
  async storePunches(ctx: HttpContext) {
    const schoolId = await this.authorize(ctx)
    if (!schoolId) return

    const input = ctx.request.input('punches')
    const source = String(ctx.request.input('source') || 'mdb').slice(0, 16)
    if (!Array.isArray(input) || input.length === 0) {
      return ctx.response.badRequest({ message: 'punches must be a non-empty list' })
    }
    if (input.length > MAX_PUNCHES_PER_REQUEST) {
      return ctx.response.badRequest({ message: `Send at most ${MAX_PUNCHES_PER_REQUEST} punches per request` })
    }

    const rows: any[] = []
    let rejected = 0
    for (const p of input) {
      const deviceUserId = cleanCode(p?.device_user_id)
      const punchTime = String(p?.punch_time || '')
      if (!deviceUserId || !DATE_TIME_RE.test(punchTime)) {
        rejected++
        continue
      }
      const direction = String(p?.direction || '').toLowerCase()
      const deviceId = Number(p?.device_id)
      rows.push([
        schoolId,
        deviceUserId,
        punchTime,
        direction === 'in' || direction === 'out' ? direction : null,
        Number.isFinite(deviceId) ? deviceId : null,
        source,
      ])
    }

    let inserted = 0
    if (rows.length > 0) {
      const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?, NOW())').join(', ')
      const result: any = await db.rawQuery(
        `INSERT IGNORE INTO biometric_punches (school_id, device_user_id, punch_time, direction, device_id, source, created_at) VALUES ${placeholders}`,
        rows.flat()
      )
      inserted = Number(result?.[0]?.affectedRows ?? 0)
    }

    return ctx.response.ok({ received: input.length, inserted, duplicates: rows.length - inserted, rejected })
  }

  /** Staff with their device code, the eSSL employee list, and suggested links by name. */
  async mapping(ctx: HttpContext) {
    const schoolId = await this.authorize(ctx)
    if (!schoolId) return

    const staff = await Staff.query()
      .where('school_id', schoolId)
      .select('id', 'employee_code', 'title', 'first_name', 'middle_name', 'last_name', 'department', 'designation', 'is_active', 'biometric_code')
      .orderBy('first_name')

    const employees = await db
      .from('biometric_employees as e')
      .where('e.school_id', schoolId)
      .select('e.device_user_id', 'e.name', 'e.department', 'e.status')
      .select(
        db.raw('(SELECT COUNT(*) FROM biometric_punches p WHERE p.school_id = e.school_id AND p.device_user_id = e.device_user_id) as punches'),
        db.raw("(SELECT DATE_FORMAT(MAX(p.punch_time), '%Y-%m-%d') FROM biometric_punches p WHERE p.school_id = e.school_id AND p.device_user_id = e.device_user_id) as last_punch")
      )
      .orderByRaw('CAST(e.device_user_id AS UNSIGNED), e.device_user_id')

    const taken = new Set(staff.map((s) => s.biometric_code).filter(Boolean))
    const candidates = employees.filter(
      (e: any) => !taken.has(e.device_user_id) && !String(e.name || '').startsWith('del_') && e.status !== 'Resigned'
    )
    const suggestions = suggestMatches(
      staff.filter((s) => !s.biometric_code),
      candidates.map((e: any) => ({ device_user_id: e.device_user_id, name: e.name }))
    )

    return ctx.response.ok({
      staff: staff.map((s) => ({
        id: s.id,
        employee_code: s.employee_code,
        name: staffName(s),
        department: s.department,
        designation: s.designation,
        is_active: !!s.is_active,
        biometric_code: s.biometric_code || null,
        suggested_code: suggestions.get(s.id)?.device_user_id ?? null,
      })),
      employees: employees.map((e: any) => ({
        device_user_id: e.device_user_id,
        name: e.name,
        department: e.department,
        status: e.status,
        punches: Number(e.punches || 0),
        last_punch: e.last_punch || null,
      })),
    })
  }

  /** Saves staff-to-device links. One device code belongs to at most one staff member. */
  async saveMapping(ctx: HttpContext) {
    const schoolId = await this.authorize(ctx)
    if (!schoolId) return

    const links = ctx.request.input('links')
    if (!Array.isArray(links) || links.length === 0) {
      return ctx.response.badRequest({ message: 'links must be a non-empty list' })
    }

    const wanted = new Map<number, string | null>()
    for (const l of links) {
      const staffId = Number(l?.staff_id)
      if (!staffId) return ctx.response.badRequest({ message: 'Every link needs a staff_id' })
      const code = cleanCode(l?.biometric_code)
      wanted.set(staffId, code || null)
    }

    const codes = [...wanted.values()].filter((c): c is string => !!c)
    const duplicateInRequest = codes.find((c, i) => codes.indexOf(c) !== i)
    if (duplicateInRequest) {
      return ctx.response.badRequest({ message: `Device code ${duplicateInRequest} is given to more than one staff member` })
    }

    const staffRows = await Staff.query().where('school_id', schoolId).whereIn('id', [...wanted.keys()]).select('id')
    if (staffRows.length !== wanted.size) {
      return ctx.response.badRequest({ message: 'Some staff members were not found in this school' })
    }

    if (codes.length > 0) {
      const clash = await Staff.query()
        .where('school_id', schoolId)
        .whereIn('biometric_code', codes)
        .whereNotIn('id', [...wanted.keys()])
        .select('id', 'first_name', 'last_name', 'biometric_code')
        .first()
      if (clash) {
        return ctx.response.badRequest({
          message: `Device code ${clash.biometric_code} already belongs to ${clash.first_name} ${clash.last_name}`,
        })
      }
    }

    await db.transaction(async (trx) => {
      // Clear first, so codes can move between staff members within one save
      await trx.from('staff').where('school_id', schoolId).whereIn('id', [...wanted.keys()]).update({ biometric_code: null })
      for (const [staffId, code] of wanted) {
        if (code) await trx.from('staff').where('id', staffId).update({ biometric_code: code })
      }
    })

    return ctx.response.ok({ saved: wanted.size })
  }

  async settings(ctx: HttpContext) {
    const schoolId = await this.authorize(ctx)
    if (!schoolId) return
    return ctx.response.ok(await this.rulesFor(schoolId))
  }

  async saveSettings(ctx: HttpContext) {
    const schoolId = await this.authorize(ctx)
    if (!schoolId) return

    const body = ctx.request.only([
      'shift_start',
      'grace_minutes',
      'half_day_minutes',
      'full_day_minutes',
      'duplicate_window_minutes',
      'overwrite_self_marked',
    ])
    const rules: BiometricRules = { ...(await this.rulesFor(schoolId)) }
    if (body.shift_start !== undefined) {
      if (!TIME_RE.test(String(body.shift_start))) return ctx.response.badRequest({ message: 'shift_start must be HH:mm' })
      rules.shift_start = String(body.shift_start)
    }
    const minuteFields = ['grace_minutes', 'half_day_minutes', 'full_day_minutes', 'duplicate_window_minutes'] as const
    for (const field of minuteFields) {
      if (body[field] === undefined) continue
      const value = Number(body[field])
      if (!Number.isInteger(value) || value < 0 || value > 1440) {
        return ctx.response.badRequest({ message: `${field} must be a whole number of minutes between 0 and 1440` })
      }
      rules[field] = value
    }
    if (body.overwrite_self_marked !== undefined) rules.overwrite_self_marked = !!body.overwrite_self_marked
    if (rules.half_day_minutes > rules.full_day_minutes) {
      return ctx.response.badRequest({ message: 'Half-day minimum cannot be more than the full-day minimum' })
    }

    const now = new Date()
    const exists = await db.from('biometric_settings').where('school_id', schoolId).first()
    if (exists) {
      await db.from('biometric_settings').where('school_id', schoolId).update({ ...rules, updated_at: now })
    } else {
      await db.table('biometric_settings').insert({ school_id: schoolId, ...rules, created_at: now, updated_at: now })
    }

    return ctx.response.ok(rules)
  }

  /** Punches of linked staff grouped by staff and date, as 'HH:mm:ss' strings in device time. */
  private async punchesByStaffDay(schoolId: number, from: string, to: string, staffIds?: number[]) {
    const staffQuery = Staff.query()
      .where('school_id', schoolId)
      .whereNotNull('biometric_code')
      .whereNot('biometric_code', '')
      .select('id', 'biometric_code', 'title', 'first_name', 'middle_name', 'last_name', 'department')
    if (staffIds?.length) staffQuery.whereIn('id', staffIds)
    const staff = await staffQuery
    const staffByCode = new Map(staff.map((s) => [String(s.biometric_code), s]))

    const grouped = new Map<string, { staffId: number; date: string; times: string[] }>()
    if (staff.length === 0) return { staff, grouped }

    const punches = await db
      .from('biometric_punches')
      .where('school_id', schoolId)
      .whereIn('device_user_id', [...staffByCode.keys()])
      .whereBetween('punch_time', [`${from} 00:00:00`, `${to} 23:59:59`])
      .select(
        'device_user_id',
        db.raw("DATE_FORMAT(punch_time, '%Y-%m-%d') as d"),
        db.raw("DATE_FORMAT(punch_time, '%H:%i:%s') as t")
      )

    for (const p of punches) {
      const s = staffByCode.get(String(p.device_user_id))
      if (!s) continue
      const key = `${s.id}|${p.d}`
      const entry = grouped.get(key) || { staffId: s.id, date: String(p.d), times: [] as string[] }
      entry.times.push(String(p.t))
      grouped.set(key, entry)
    }
    return { staff, grouped }
  }

  /**
   * Fills staff attendance from punches for a date range. Only days with punches are written; days
   * without punches are left alone (holidays, weekly offs and absences are not decided here). A day
   * an admin marked by hand, one with an approved edit request, or one covered by approved full-day
   * leave is never overwritten. Self check-ins are replaced only when the school setting allows it.
   */
  async process(ctx: HttpContext) {
    const schoolId = await this.authorize(ctx)
    if (!schoolId) return

    const from = String(ctx.request.input('from') || '')
    const to = String(ctx.request.input('to') || '')
    const academicYear = Number(ctx.request.input('academic_session_id') || ctx.request.input('academic_year'))
    const rawStaffIds = ctx.request.input('staff_ids')
    const staffIds: number[] = Array.isArray(rawStaffIds) ? rawStaffIds.map(Number).filter(Boolean) : []

    if (!DATE_RE.test(from) || !DATE_RE.test(to)) return ctx.response.badRequest({ message: 'from and to must be YYYY-MM-DD' })
    if (from > to) return ctx.response.badRequest({ message: 'from must be on or before to' })
    if (daysBetween(from, to) >= MAX_PROCESS_DAYS) {
      return ctx.response.badRequest({ message: `Process at most ${MAX_PROCESS_DAYS} days at a time` })
    }
    if (!academicYear) return ctx.response.badRequest({ message: 'academic_session_id is required' })

    const rules = await this.rulesFor(schoolId)
    const { grouped } = await this.punchesByStaffDay(schoolId, from, to, staffIds)
    const result = { days_with_punches: grouped.size, created: 0, updated: 0, unchanged: 0, skipped_manual: 0, skipped_edited: 0, skipped_leave: 0, missing_punch: 0 }
    if (grouped.size === 0) return ctx.response.ok(result)

    const involvedStaff = [...new Set([...grouped.values()].map((g) => g.staffId))]

    const existingRows = await db
      .from('staff_attendance_masters')
      .whereIn('staff_id', involvedStaff)
      .whereBetween('attendance_date', [from, to])
      .select('id', 'staff_id', 'academic_year', 'is_self_marked', 'remarks', 'status', 'check_in_time', 'check_out_time', db.raw("DATE_FORMAT(attendance_date, '%Y-%m-%d') as d"))
    const existing = new Map(existingRows.map((r: any) => [`${r.staff_id}|${r.d}`, r]))

    const editedIds = new Set(
      existingRows.length
        ? (
            await db
              .from('staff_attendance_edit_requests')
              .whereIn('staff_attendance_id', existingRows.map((r: any) => r.id))
              .where('status', 'approved')
              .select('staff_attendance_id')
          ).map((r: any) => r.staff_attendance_id)
        : []
    )

    const leaves = await db
      .from('staff_leave_applications')
      .whereIn('staff_id', involvedStaff)
      .where('status', 'approved')
      .where((q) => q.where('is_half_day', false).orWhereNull('is_half_day'))
      .where((q) => q.where('is_hourly_leave', false).orWhereNull('is_hourly_leave'))
      .where('from_date', '<=', to)
      .where('to_date', '>=', from)
      .select('staff_id', db.raw("DATE_FORMAT(from_date, '%Y-%m-%d') as f"), db.raw("DATE_FORMAT(to_date, '%Y-%m-%d') as t"))
    const onLeave = (staffId: number, date: string) => leaves.some((l: any) => l.staff_id === staffId && l.f <= date && date <= l.t)

    const userId = (ctx.auth.user as User).id
    const now = new Date()

    await db.transaction(async (trx) => {
      for (const { staffId, date, times } of grouped.values()) {
        const summary = summarizeDay(times, rules)
        if (!summary) continue
        if (summary.missing_punch) result.missing_punch++

        if (onLeave(staffId, date)) {
          result.skipped_leave++
          continue
        }

        const values = {
          check_in_time: summary.check_in,
          check_out_time: summary.check_out,
          status: summary.status,
          remarks: remarksFor(summary),
        }
        const row: any = existing.get(`${staffId}|${date}`)

        if (!row) {
          await trx.table('staff_attendance_masters').insert({
            academic_year: academicYear,
            staff_id: staffId,
            attendance_date: date,
            ...values,
            marked_by: userId,
            is_self_marked: false,
            created_at: now,
            updated_at: now,
          })
          result.created++
          continue
        }

        if (editedIds.has(row.id)) {
          result.skipped_edited++
          continue
        }
        const writtenByBiometric = String(row.remarks || '').startsWith(BIOMETRIC_REMARK_PREFIX)
        const selfMarked = !!row.is_self_marked && !writtenByBiometric
        if (!writtenByBiometric && !(selfMarked && rules.overwrite_self_marked)) {
          result.skipped_manual++
          continue
        }

        const same =
          String(row.check_in_time || '').slice(0, 5) === (values.check_in_time || '') &&
          String(row.check_out_time || '').slice(0, 5) === (values.check_out_time || '') &&
          row.status === values.status &&
          row.remarks === values.remarks
        if (same) {
          result.unchanged++
          continue
        }

        await trx
          .from('staff_attendance_masters')
          .where('id', row.id)
          .update({ ...values, marked_by: userId, is_self_marked: false, updated_at: now })
        result.updated++
      }
    })

    return ctx.response.ok(result)
  }

  /** One day for every linked staff member: punches, the in/out the rules give, and what is stored. */
  async daily(ctx: HttpContext) {
    const schoolId = await this.authorize(ctx)
    if (!schoolId) return

    const date = String(ctx.request.input('date') || '')
    if (!DATE_RE.test(date)) return ctx.response.badRequest({ message: 'date must be YYYY-MM-DD' })

    const rules = await this.rulesFor(schoolId)
    const { staff, grouped } = await this.punchesByStaffDay(schoolId, date, date)

    const stored = staff.length
      ? await db
          .from('staff_attendance_masters')
          .whereIn('staff_id', staff.map((s) => s.id))
          .where('attendance_date', date)
          .select('staff_id', 'status', 'check_in_time', 'check_out_time', 'remarks', 'is_self_marked')
      : []
    const storedByStaff = new Map(stored.map((r: any) => [r.staff_id, r]))

    const rows = staff
      .map((s) => {
        const times = (grouped.get(`${s.id}|${date}`)?.times || []).sort()
        const summary = times.length ? summarizeDay(times, rules) : null
        const saved: any = storedByStaff.get(s.id)
        return {
          staff_id: s.id,
          name: staffName(s),
          department: s.department,
          biometric_code: s.biometric_code,
          punches: times.map((t) => t.slice(0, 5)),
          computed: summary,
          stored: saved
            ? {
                status: saved.status,
                check_in_time: saved.check_in_time ? String(saved.check_in_time).slice(0, 5) : null,
                check_out_time: saved.check_out_time ? String(saved.check_out_time).slice(0, 5) : null,
                remarks: saved.remarks,
                from_biometric: String(saved.remarks || '').startsWith(BIOMETRIC_REMARK_PREFIX),
              }
            : null,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    const unlinked = await db
      .from('biometric_punches as p')
      .leftJoin('staff as s', (join) => {
        join.on('s.biometric_code', '=', 'p.device_user_id').andOn('s.school_id', '=', 'p.school_id')
      })
      .where('p.school_id', schoolId)
      .whereNull('s.id')
      .whereBetween('p.punch_time', [`${date} 00:00:00`, `${date} 23:59:59`])
      .countDistinct('p.device_user_id as total')
      .first()

    return ctx.response.ok({ date, rules, rows, unlinked_device_users: Number(unlinked?.total || 0) })
  }
}
