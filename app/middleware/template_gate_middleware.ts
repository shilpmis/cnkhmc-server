import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import AccessControl, { LEGACY_WRITE_ROLES } from '#services/access_control'

/**
 * Enforces permission templates on write requests.
 *
 * It only ever restricts users who have at least one template AND whose role does not already
 * allow the module: roles and templates add up, and users without templates are untouched.
 * So a "Hostel Manager" template can create rooms but not students, and a view-only template cannot
 * change anything, even if someone calls the API directly.
 *
 * Reads are not blocked here (the screens hide what a template does not grant).
 */
export default class TemplateGateMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth?.user
    if (!user) return next()

    const target = AccessControl.classify(ctx.request.method(), ctx.request.url())
    if (!target) return next()

    // Role already allows this module: nothing to enforce
    if ((LEGACY_WRITE_ROLES[target.module] ?? []).includes(Number(user.role_id))) return next()

    // No templates: behave exactly as before
    if (!(await AccessControl.hasTemplates(user))) return next()

    if (await AccessControl.templateAllows(user, target.action, target.module)) return next()

    return ctx.response.forbidden({
      message: `Your permission templates do not allow you to ${target.action} ${target.module}.`,
    })
  }
}
