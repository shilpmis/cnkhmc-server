import { createMongoAbility, type AnyMongoAbility, type RawRuleOf } from '@casl/ability'
import type User from '#models/User'

/**
 * Server-side evaluation of permission templates (the "policies" assigned to users).
 * Mirrors cnkhmc-client/src/permissions: same modules, same aliases, same rules:
 *  - "manage" covers read, create, update and delete; exporting counts as read, importing as create
 *  - subjects are mapped onto modules (Room and Bed count as Hostel)
 *  - a deny (inverted) rule always wins over an allow rule
 * A user can do something when their ROLE allows it (existing behaviour, unchanged) or a TEMPLATE does.
 */

export type ModuleId =
  | 'Student'
  | 'Staff'
  | 'Subject'
  | 'Attendance'
  | 'Leave'
  | 'Fees'
  | 'Payroll'
  | 'Admission'
  | 'Timetable'
  | 'LessonPlan'
  | 'Hostel'
  | 'DeadStock'
  | 'Department'
  | 'User'
  | 'SystemSettings'
  | 'Reports'
  | 'Dashboard'
  | 'Exam'

export const POLICY_ACTIONS = ['manage', 'read', 'create', 'update', 'delete'] as const

export const SUBJECT_ALIASES: Record<string, ModuleId> = {
  student: 'Student',
  students: 'Student',
  staff: 'Staff',
  teacher: 'Staff',
  teachers: 'Staff',
  subject: 'Subject',
  subjects: 'Subject',
  course: 'Subject',
  courses: 'Subject',
  attendance: 'Attendance',
  lectureattendance: 'Attendance',
  leave: 'Leave',
  leaves: 'Leave',
  fee: 'Fees',
  fees: 'Fees',
  payment: 'Fees',
  payments: 'Fees',
  transaction: 'Fees',
  transactions: 'Fees',
  receipt: 'Fees',
  receipts: 'Fees',
  payroll: 'Payroll',
  salary: 'Payroll',
  admission: 'Admission',
  admissions: 'Admission',
  timetable: 'Timetable',
  lessonplan: 'LessonPlan',
  lessonplans: 'LessonPlan',
  hostel: 'Hostel',
  hostels: 'Hostel',
  room: 'Hostel',
  rooms: 'Hostel',
  bed: 'Hostel',
  beds: 'Hostel',
  hostelallocation: 'Hostel',
  deadstock: 'DeadStock',
  deadstocks: 'DeadStock',
  deadstocktransaction: 'DeadStock',
  inventory: 'DeadStock',
  department: 'Department',
  departments: 'Department',
  user: 'User',
  users: 'User',
  settings: 'SystemSettings',
  systemsettings: 'SystemSettings',
  report: 'Reports',
  reports: 'Reports',
  dashboard: 'Dashboard',
  grade: 'Exam',
  grades: 'Exam',
  exam: 'Exam',
  exams: 'Exam',
}

/**
 * Roles that already reach each module's write endpoints today (SUPER_ADMIN 8 and DEVELOPER 11
 * always). A user holding one of these roles is never blocked by templates: roles and templates add up.
 */
export const LEGACY_WRITE_ROLES: Partial<Record<ModuleId, number[]>> = {
  Student: [1, 2, 3, 4, 5, 8, 11],
  Staff: [1, 2, 3, 4, 5, 8, 11],
  Fees: [1, 2, 3, 4, 5, 7, 8, 11],
  Payroll: [1, 2, 4, 8, 11],
  Hostel: [1, 2, 4, 5, 8, 11],
  DeadStock: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11],
  Department: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11],
  Admission: [1, 2, 4, 5, 8, 11],
  Attendance: [1, 2, 3, 5, 6, 8, 9, 10, 11],
}

type Rule = RawRuleOf<AnyMongoAbility>
type PolicyLike = { rules?: unknown }

const toList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : value === undefined || value === null ? [] : [String(value)]

export function normalizeSubject(subject: string): string {
  const key = String(subject).trim().toLowerCase()
  if (key === 'all' || key === '*') return 'all'
  return SUBJECT_ALIASES[key] ?? String(subject).trim()
}

export function isKnownSubject(subject: string): boolean {
  const key = String(subject).trim().toLowerCase()
  return key === 'all' || key === '*' || key in SUBJECT_ALIASES
}

export function normalizeRules(policies: PolicyLike[] | undefined | null): Rule[] {
  const allow: Rule[] = []
  const deny: Rule[] = []

  for (const policy of policies ?? []) {
    const rules = Array.isArray(policy?.rules) ? (policy.rules as any[]) : []
    for (const rule of rules) {
      const actions = toList(rule?.action)
      const subjects = toList(rule?.subject).map(normalizeSubject)
      if (actions.length === 0 || subjects.length === 0) continue
      if (rule.inverted) deny.push({ action: actions, subject: subjects, inverted: true })
      else allow.push({ action: actions, subject: subjects })
    }
  }
  // CASL lets a later rule override an earlier one, so denies go last.
  return [...allow, ...deny]
}

class AccessControl {
  /** The user's assigned templates, loaded once per request. */
  private async policiesOf(user: User) {
    if (!user.policies) await user.load('policies')
    return user.policies
  }

  async hasTemplates(user: User): Promise<boolean> {
    return (await this.policiesOf(user)).length > 0
  }

  /** Does one of the user's templates allow this action on this module? */
  async templateAllows(user: User, action: string, module: ModuleId): Promise<boolean> {
    const policies = await this.policiesOf(user)
    if (policies.length === 0) return false
    const ability = createMongoAbility(normalizeRules(policies) as any)
    const mapped = action === 'export' ? 'read' : action === 'import' ? 'create' : action
    return ability.can(mapped, module)
  }

  /** Role OR template. `legacyRoles` are the roles that already pass this check. */
  async allows(user: User, action: string, module: ModuleId, legacyRoles: number[] = []): Promise<boolean> {
    if (legacyRoles.includes(Number(user.role_id))) return true
    return this.templateAllows(user, action, module)
  }

  /** Map a request to the module and action it touches; null when it is not a gated module. */
  classify(method: string, path: string): { module: ModuleId; action: string } | null {
    const m = method.toUpperCase()
    if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return null // reads are not enforced here

    const p = path.toLowerCase().replace(/^\/api\/v1/, '')
    // Exports and searches that use POST only read data; everything else follows the HTTP method
    const action = /(export|search|filter)/.test(p)
      ? 'read'
      : m === 'DELETE'
        ? 'delete'
        : m === 'POST'
          ? 'create'
          : 'update'

    if (action === 'read') return null

    if (/^\/hostels(\/|$)/.test(p)) return { module: 'Hostel', action }
    if (/^\/dead-stocks(\/|$)/.test(p)) return { module: 'DeadStock', action }
    if (/^\/inventory-departments(\/|$)/.test(p)) return { module: 'Department', action }
    if (/^\/(students|student)(\/|$)/.test(p) || /^\/students-for-permotion/.test(p)) return { module: 'Student', action }
    if (/^\/(admissions|inquiry|inquiries)(\/|$)/.test(p)) return { module: 'Admission', action }
    if (/^\/staff(?!-attendance)(\/|-role|-configurations|$)/.test(p) && !/^\/staff\/(attendance|mark-attendance)/.test(p)) {
      return { module: 'Staff', action }
    }
    if (/^\/(fees|feestype|feesplan|transaction|concession|concessions)(\/|$)/.test(p)) return { module: 'Fees', action }
    if (/^\/payroll(\/|$)/.test(p)) return { module: 'Payroll', action }
    // Student attendance marking. Staff check-in/out (staff-attendance) is self-service and stays open.
    if (/^\/(attendance|lecture-attendance)(\/|$)/.test(p)) return { module: 'Attendance', action }
    return null
  }
}

export default new AccessControl()
