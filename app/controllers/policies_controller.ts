import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import Policy from '#models/policy'
import User from '#models/User'
import { POLICY_ACTIONS, isKnownSubject } from '#services/access_control'

/**
 * Permission templates.
 *
 * Creating, changing, deleting and ASSIGNING templates decides who can do what, so it is limited to
 * Admin, Principal, IT Admin, Super Admin and Developer. Any signed-in user may list templates.
 */
const MANAGER_ROLE_IDS = [1, 2, 5, 8, 11]

const ruleSchema = vine.object({
  action: vine.union([
    vine.union.if((value) => typeof value === 'string', vine.enum(POLICY_ACTIONS)),
    vine.union.if((value) => Array.isArray(value), vine.array(vine.enum(POLICY_ACTIONS)).minLength(1)),
  ]),
  subject: vine.union([
    vine.union.if((value) => typeof value === 'string', vine.string().trim().minLength(1).maxLength(60)),
    vine.union.if(
      (value) => Array.isArray(value),
      vine.array(vine.string().trim().minLength(1).maxLength(60)).minLength(1)
    ),
  ]),
  inverted: vine.boolean().optional(),
})

const policySchema = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100),
    description: vine.string().trim().maxLength(255).nullable().optional(),
    rules: vine.array(ruleSchema).minLength(1).maxLength(100),
  })
)

const policyUpdateSchema = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100).optional(),
    description: vine.string().trim().maxLength(255).nullable().optional(),
    rules: vine.array(ruleSchema).minLength(1).maxLength(100).optional(),
  })
)

export default class PoliciesController {
  private canManage(ctx: HttpContext): boolean {
    return MANAGER_ROLE_IDS.includes(Number(ctx.auth.user?.role_id))
  }

  private forbidden(ctx: HttpContext) {
    return ctx.response.forbidden({ message: 'You are not allowed to manage permission templates.' })
  }

  /** Every subject must be a module the system knows (or "all"); unknown names would silently do nothing. */
  private unknownSubjects(rules: { subject: string | string[] }[] | undefined): string[] {
    const bad: string[] = []
    for (const rule of rules ?? []) {
      for (const subject of Array.isArray(rule.subject) ? rule.subject : [rule.subject]) {
        if (!isKnownSubject(subject)) bad.push(subject)
      }
    }
    return bad
  }

  async index({ response }: HttpContext) {
    const policies = await Policy.all()
    return response.ok(policies)
  }

  async store(ctx: HttpContext) {
    if (!this.canManage(ctx)) return this.forbidden(ctx)

    const data = await policySchema.validate(ctx.request.only(['name', 'description', 'rules']))
    const bad = this.unknownSubjects(data.rules as any)
    if (bad.length) {
      return ctx.response.unprocessableEntity({ message: `Unknown module(s): ${[...new Set(bad)].join(', ')}` })
    }

    const policy = await Policy.create(data as any)
    return ctx.response.created(policy)
  }

  async show({ params, response }: HttpContext) {
    const policy = await Policy.findOrFail(params.id)
    return response.ok(policy)
  }

  async update(ctx: HttpContext) {
    if (!this.canManage(ctx)) return this.forbidden(ctx)

    const policy = await Policy.findOrFail(ctx.params.id)
    const data = await policyUpdateSchema.validate(ctx.request.only(['name', 'description', 'rules']))
    const bad = this.unknownSubjects(data.rules as any)
    if (bad.length) {
      return ctx.response.unprocessableEntity({ message: `Unknown module(s): ${[...new Set(bad)].join(', ')}` })
    }

    policy.merge(data as any)
    await policy.save()
    return ctx.response.ok(policy)
  }

  async destroy(ctx: HttpContext) {
    if (!this.canManage(ctx)) return this.forbidden(ctx)

    const policy = await Policy.findOrFail(ctx.params.id)
    await policy.delete()
    return ctx.response.noContent()
  }

  async assignToUser(ctx: HttpContext) {
    if (!this.canManage(ctx)) return this.forbidden(ctx)

    const user = await User.findOrFail(ctx.params.userId)
    // Only users of the caller's own school (Super Admin and Developer may cross schools)
    const crossSchool = [8, 11].includes(Number(ctx.auth.user?.role_id))
    if (!crossSchool && Number(user.school_id) !== Number(ctx.auth.user?.school_id)) {
      return ctx.response.notFound({ message: 'User not found' })
    }

    const { policyIds } = await vine
      .compile(vine.object({ policyIds: vine.array(vine.number()).maxLength(50) }))
      .validate(ctx.request.only(['policyIds']))

    const known = await Policy.query().whereIn('id', policyIds)
    if (known.length !== new Set(policyIds).size) {
      return ctx.response.unprocessableEntity({ message: 'One or more permission templates do not exist.' })
    }

    await user.related('policies').sync(policyIds)
    await user.load('policies')

    return ctx.response.ok(user)
  }
}
