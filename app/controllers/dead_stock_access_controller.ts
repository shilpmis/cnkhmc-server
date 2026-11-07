import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Staff from '#models/Staff'
import InventoryDepartment from '#models/inventory_department'
import type User from '#models/User'
import { deadStockScope } from '#services/dead_stock_access'

const staffName = (s: { title?: string | null; first_name?: string | null; middle_name?: string | null; last_name?: string | null }) =>
  [s.title, s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ')

export default class DeadStockAccessController {
  /** What the signed-in user may do in dead stock; the register uses it to show the right controls. */
  async me(ctx: HttpContext) {
    const scope = await deadStockScope(ctx.auth.user as User)
    return ctx.response.ok({
      all_departments: scope.all,
      department_ids: scope.departmentIds,
      can_manage_access: scope.canManageAccess,
    })
  }

  /** Every staff member of the school with their dead stock access (admin roles only). */
  async index(ctx: HttpContext) {
    const user = ctx.auth.user as User
    const scope = await deadStockScope(user)
    if (!scope.canManageAccess) return ctx.response.forbidden({ message: 'Only administrators can manage dead stock access.' })

    const staff = await Staff.query()
      .where('school_id', Number(user.school_id))
      .select('id', 'employee_code', 'title', 'first_name', 'middle_name', 'last_name', 'designation', 'department', 'is_active')
      .orderBy('first_name')

    const ids = staff.map((s) => s.id)
    const [grants, logins, departments] = await Promise.all([
      ids.length ? db.from('dead_stock_access').whereIn('staff_id', ids).select('staff_id', 'inventory_department_id') : [],
      ids.length ? db.from('users').whereIn('staff_id', ids).select('staff_id') : [],
      InventoryDepartment.query().orderBy('name', 'asc').select('id', 'name', 'isActive'),
    ])

    const grantsByStaff = new Map<number, { all: boolean; ids: number[] }>()
    for (const g of grants as any[]) {
      const entry = grantsByStaff.get(g.staff_id) || { all: false, ids: [] }
      if (g.inventory_department_id === null) entry.all = true
      else entry.ids.push(Number(g.inventory_department_id))
      grantsByStaff.set(g.staff_id, entry)
    }
    const withLogin = new Set((logins as any[]).map((l) => Number(l.staff_id)))

    return ctx.response.ok({
      departments: departments.map((d) => ({ id: d.id, name: d.name, is_active: d.isActive })),
      staff: staff.map((s) => {
        const g = grantsByStaff.get(s.id)
        return {
          id: s.id,
          employee_code: s.employee_code,
          name: staffName(s),
          designation: s.designation,
          department: s.department,
          is_active: !!s.is_active,
          has_login: withLogin.has(s.id),
          all_departments: !!g?.all,
          department_ids: g?.all ? [] : g?.ids || [],
        }
      }),
    })
  }

  /** Replaces one staff member's access: all departments, a list of departments, or none. */
  async update(ctx: HttpContext) {
    const user = ctx.auth.user as User
    const scope = await deadStockScope(user)
    if (!scope.canManageAccess) return ctx.response.forbidden({ message: 'Only administrators can manage dead stock access.' })

    const staffId = Number(ctx.params.staff_id)
    const staff = await Staff.query().where('id', staffId).where('school_id', Number(user.school_id)).first()
    if (!staff) return ctx.response.notFound({ message: 'Staff member not found' })

    const allDepartments = !!ctx.request.input('all_departments')
    const rawIds = ctx.request.input('department_ids')
    const requested: number[] = Array.isArray(rawIds) ? [...new Set(rawIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))] : []

    let departmentIds: number[] = []
    if (!allDepartments && requested.length) {
      const found = await InventoryDepartment.query().whereIn('id', requested).select('id')
      if (found.length !== requested.length) return ctx.response.badRequest({ message: 'Some departments were not found' })
      departmentIds = requested
    }

    const now = new Date()
    await db.transaction(async (trx) => {
      await trx.from('dead_stock_access').where('staff_id', staffId).delete()
      const rows = allDepartments
        ? [{ staff_id: staffId, inventory_department_id: null, granted_by: user.id, created_at: now, updated_at: now }]
        : departmentIds.map((id) => ({ staff_id: staffId, inventory_department_id: id, granted_by: user.id, created_at: now, updated_at: now }))
      if (rows.length) await trx.table('dead_stock_access').multiInsert(rows)
    })

    return ctx.response.ok({ staff_id: staffId, all_departments: allDepartments, department_ids: departmentIds })
  }
}
