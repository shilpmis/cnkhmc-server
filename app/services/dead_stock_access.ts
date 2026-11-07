import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import type User from '#models/User'

/**
 * Person-based access to the dead stock register.
 *
 * - Admin, principal, super admin and developer always see and manage everything, and are the only
 *   ones who can give access to others.
 * - Any other user sees only what their staff record was given in `dead_stock_access`: some
 *   departments, or all departments. With nothing given, they see nothing.
 *
 * Department-limited users work only inside their departments (return and transfer between them).
 * Anything that touches the central store (adding stock, Excel import, issuing from the store,
 * discarding from the store) and editing the department list need all-department access.
 */
export const DEAD_STOCK_ADMIN_ROLES = [1, 2, 8, 11]

export type DeadStockScope = {
  /** Sees every department and the central store */
  all: boolean
  /** Departments this user may see when `all` is false */
  departmentIds: number[]
  /** May give access to staff (admin roles only) */
  canManageAccess: boolean
}

export async function deadStockScope(user: User | undefined | null): Promise<DeadStockScope> {
  if (!user) return { all: false, departmentIds: [], canManageAccess: false }
  if (DEAD_STOCK_ADMIN_ROLES.includes(Number(user.role_id))) {
    return { all: true, departmentIds: [], canManageAccess: true }
  }
  if (!user.staff_id) return { all: false, departmentIds: [], canManageAccess: false }

  const rows = await db.from('dead_stock_access').where('staff_id', user.staff_id).select('inventory_department_id')
  if (rows.some((r: any) => r.inventory_department_id === null)) {
    return { all: true, departmentIds: [], canManageAccess: false }
  }
  return {
    all: false,
    departmentIds: [...new Set(rows.map((r: any) => Number(r.inventory_department_id)))],
    canManageAccess: false,
  }
}

export const canUseDepartment = (scope: DeadStockScope, departmentId: number | null | undefined) =>
  scope.all || (!!departmentId && scope.departmentIds.includes(Number(departmentId)))

/** Scope for this request, or null after sending 403 when the user needs all-department access. */
export async function requireAllDepartments(ctx: HttpContext, action: string): Promise<DeadStockScope | null> {
  const scope = await deadStockScope(ctx.auth.user as User)
  if (!scope.all) {
    ctx.response.forbidden({ message: `Only staff with access to all dead stock departments can ${action}.` })
    return null
  }
  return scope
}
