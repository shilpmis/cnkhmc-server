import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import db from '@adonisjs/lucid/services/db'

/**
 * Writes one row to pii_access_logs for every request that touches personal data
 * (students, staff, fees, payroll, users, hostel). It records WHO did WHAT to WHICH record,
 * never the personal values themselves: no request body, no response body, only the NAMES of
 * query parameters. It runs after the response is produced and never blocks or fails a request.
 */
const ENTITIES: [RegExp, string][] = [
  [/\/(students?|admissions?|inquiries)(\/|$)/i, 'student'],
  [/\/(staff|staffs|teachers?)(\/|-|$)/i, 'staff'],
  [/\/(payroll|salary|payslips?)(\/|-|$)/i, 'payroll'],
  [/\/(fees?|transactions?|concessions?)(\/|-|$)/i, 'fees'],
  [/\/(users?)(\/|$)/i, 'user'],
  [/\/(hostels?)(\/|-|$)/i, 'hostel'],
]

const trim = (value: string | undefined | null, max: number) =>
  value ? String(value).slice(0, max) : null

export default class PiiAuditMiddleware {
  private classify(path: string): string | null {
    for (const [pattern, entity] of ENTITIES) {
      if (pattern.test(path)) return entity
    }
    return null
  }

  private actionFor(method: string, path: string): string {
    const p = path.toLowerCase()
    if (/(export|download|excel|statement|report|pdf)/.test(p)) return 'export'
    if (/(import|bulk|upload)/.test(p)) return 'import'
    if (method === 'GET' || method === 'HEAD') return 'read'
    if (method === 'DELETE') return 'delete'
    if (method === 'POST' && /(search|filter)/.test(p)) return 'read'
    return method === 'POST' ? 'create' : 'update'
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await next()

    try {
      const { request, response } = ctx
      const method = request.method()
      if (method === 'OPTIONS') return

      const path = request.url()
      const entity = this.classify(path)
      if (!entity) return

      const user = ctx.auth?.user
      const resourceId = Object.values(ctx.params || {}).find((v) => /^\d+$/.test(String(v)))

      void db
        .table('pii_access_logs')
        .insert({
          user_id: user?.id ?? null,
          school_id: user?.school_id ?? null,
          role_id: user?.role_id ?? null,
          entity,
          action: this.actionFor(method, path),
          method,
          route: trim(ctx.route?.pattern || path, 190),
          resource_id: resourceId ? String(resourceId) : null,
          query_keys: trim(Object.keys(request.qs() || {}).join(','), 255),
          status: response.getStatus(),
          ip_address: trim(request.ip(), 64),
          user_agent: trim(request.header('user-agent'), 255),
        })
        .catch((error: any) => console.error('[PiiAudit] could not write log:', error.message))
    } catch (error: any) {
      console.error('[PiiAudit] unexpected error:', error.message)
    }
  }
}
