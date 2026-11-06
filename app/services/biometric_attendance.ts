/**
 * Turns raw biometric punches into daily staff attendance, and suggests which device user each staff
 * member is. Pure functions only, so the rules can be tested without a database.
 */

export type BiometricRules = {
  shift_start: string // 'HH:mm'
  grace_minutes: number
  half_day_minutes: number
  full_day_minutes: number
  duplicate_window_minutes: number
  overwrite_self_marked: boolean
}

export const DEFAULT_RULES: BiometricRules = {
  shift_start: '09:00',
  grace_minutes: 10,
  half_day_minutes: 240,
  full_day_minutes: 420,
  duplicate_window_minutes: 2,
  overwrite_self_marked: false,
}

export type DaySummary = {
  check_in: string | null // 'HH:mm'
  check_out: string | null
  worked_minutes: number | null
  punches: number
  /** Only one punch that day: the other one was never recorded, so hours cannot be worked out */
  missing_punch: boolean
  status: 'present' | 'late' | 'half_day' | 'absent'
}

/** Marks rows this module wrote, so a later run may replace them but never a hand-marked day. */
export const BIOMETRIC_REMARK_PREFIX = '[Biometric]'

export const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

const toSeconds = (time: string) => {
  const [h, m, s] = time.split(':').map(Number)
  return (h || 0) * 3600 + (m || 0) * 60 + (s || 0)
}

export const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`

/**
 * One staff member's day. `times` are 'HH:mm:ss' strings for a single date. Punches within the
 * duplicate window of the previous kept punch are the same tap repeated and are dropped. The first
 * punch is the check-in and the last the check-out.
 *
 * The device does not record in/out reliably (every punch says "in"), so a day with a single punch is
 * read by its time: in the first half of the shift it is the check-in, later it is the check-out.
 * The other punch is reported missing rather than guessed, and lateness is only judged from a
 * real check-in, never from an afternoon punch.
 */
export function summarizeDay(times: string[], rules: BiometricRules): DaySummary | null {
  const sorted = [...times].sort((a, b) => toSeconds(a) - toSeconds(b))
  const kept: string[] = []
  for (const t of sorted) {
    const last = kept[kept.length - 1]
    if (last && toSeconds(t) - toSeconds(last) < rules.duplicate_window_minutes * 60) continue
    kept.push(t)
  }
  if (kept.length === 0) return null

  // The duplicate window only decides how many separate punches there were. In and out always come
  // from the first and last raw punch, so a repeated tap at the door never moves the check-out earlier.
  const firstRaw = sorted[0]
  const lastRaw = sorted[sorted.length - 1]
  const isLate = (checkIn: string) => toMinutes(checkIn) > toMinutes(rules.shift_start) + rules.grace_minutes

  if (kept.length === 1) {
    const midShift = toMinutes(rules.shift_start) + Math.floor(rules.full_day_minutes / 2)
    const isCheckIn = toMinutes(firstRaw.slice(0, 5)) < midShift
    return {
      check_in: isCheckIn ? firstRaw.slice(0, 5) : null,
      check_out: isCheckIn ? null : lastRaw.slice(0, 5),
      worked_minutes: null,
      punches: 1,
      missing_punch: true,
      status: isCheckIn && isLate(firstRaw.slice(0, 5)) ? 'late' : 'present',
    }
  }

  const checkIn = firstRaw.slice(0, 5)
  const late = isLate(checkIn)
  const checkOut = lastRaw.slice(0, 5)
  const worked = Math.max(0, Math.floor((toSeconds(lastRaw) - toSeconds(firstRaw)) / 60))
  let status: DaySummary['status']
  if (worked < rules.half_day_minutes) status = 'absent'
  else if (worked < rules.full_day_minutes) status = 'half_day'
  else status = late ? 'late' : 'present'

  return { check_in: checkIn, check_out: checkOut, worked_minutes: worked, punches: kept.length, missing_punch: false, status }
}

export function remarksFor(summary: DaySummary): string {
  const parts = [`${summary.punches} punch${summary.punches === 1 ? '' : 'es'}`]
  if (summary.worked_minutes !== null) parts.push(formatDuration(summary.worked_minutes))
  if (summary.missing_punch) parts.push(summary.check_in ? 'missing out-punch' : 'missing in-punch')
  return `${BIOMETRIC_REMARK_PREFIX} ${parts.join(', ')}`
}

/* ------------------------------------------------------------------------------------------------ */
/* Name matching between the eSSL employee list and app staff                                       */
/* ------------------------------------------------------------------------------------------------ */

const TITLES = new Set(['dr', 'mr', 'mrs', 'ms', 'miss', 'prof', 'shri', 'smt', 'kum'])

/** "Dr. Tanvika S. Chaudhari" / "Dr.J.R.Rao" -> ['tanvika', 's', 'chaudhari'] / ['j', 'r', 'rao'] */
export function nameTokens(name: string | null | undefined): string[] {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z\s.]/g, ' ')
    .split(/[\s.]+/)
    .filter((t) => t && !TITLES.has(t))
}

/**
 * How well a device name fits a staff member. The surname must match (allowing a truncated name such
 * as "Chaudha" for "Chaudhari"); each given name then adds points when it matches in full or by initial.
 */
export function nameScore(deviceName: string, staff: { first_name?: string | null; middle_name?: string | null; last_name?: string | null }) {
  const device = nameTokens(deviceName)
  const last = nameTokens(staff.last_name).join('')
  if (device.length === 0 || !last) return 0

  const deviceLast = device[device.length - 1]
  const surnameMatches =
    deviceLast === last || (deviceLast.length >= 5 && (last.startsWith(deviceLast) || deviceLast.startsWith(last)))
  if (!surnameMatches) return 0

  let score = 3
  const given = device.slice(0, -1)
  const staffGiven = [...nameTokens(staff.first_name), ...nameTokens(staff.middle_name)]
  given.forEach((token, i) => {
    const target = staffGiven[i]
    if (!target) return
    if (token === target) score += 2
    else if (token.length === 1 && target.startsWith(token)) score += 1
    else score -= 2
  })
  return score
}

/**
 * Best device user for each staff member. A suggestion is only made when one candidate clearly beats
 * the rest, so two people with the same surname and initials are left for a person to decide.
 */
export function suggestMatches<S extends { id: number; first_name?: string | null; middle_name?: string | null; last_name?: string | null }>(
  staff: S[],
  devices: { device_user_id: string; name: string | null }[],
  minScore = 4
): Map<number, { device_user_id: string; score: number }> {
  const result = new Map<number, { device_user_id: string; score: number }>()
  for (const s of staff) {
    const scored = devices
      .map((d) => ({ device_user_id: d.device_user_id, score: nameScore(d.name || '', s) }))
      .filter((d) => d.score >= minScore)
      .sort((a, b) => b.score - a.score)
    if (scored.length === 0) continue
    if (scored.length > 1 && scored[1].score === scored[0].score) continue
    result.set(s.id, scored[0])
  }
  return result
}
