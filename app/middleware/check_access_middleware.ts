import type { HttpContext } from '@adonisjs/core/http'
import { createMongoAbility, MongoAbility } from '@casl/ability'
import User from '#models/User'

/**
 * Middleware to check PBAC access using CASL
 */
export default class CheckAccessMiddleware {
  async handle(
    ctx: HttpContext,
    next: () => Promise<void>,
    options: { action: string; subject: string }
  ) {
    const user = ctx.auth.user as User
    if (!user) {
      return ctx.response.unauthorized({ message: 'User not authenticated' })
    }

    // Load user's policies if not already loaded
    if (!user.policies) {
      await user.load('policies')
    }

    // Aggregate all rules from all assigned policies
    const rules = user.policies.flatMap((policy) => policy.rules)

    // Build the CASL ability
    const ability = createMongoAbility(rules) as MongoAbility

    // Check if the user is authorized
    if (ability.cannot(options.action, options.subject)) {
      return ctx.response.forbidden({ message: `You are not authorized to ${options.action} ${options.subject}` })
    }

    // Call next to advance the request
    await next()
  }
}
