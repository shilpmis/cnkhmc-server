import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Fixed-window rate limiter, so one buggy client loop or one abusive account cannot flood
 * the API and, through it, MySQL.
 *
 *   middleware.rateLimit({ name: 'api', max: 600, windowSec: 60 })            per logged-in user
 *   middleware.rateLimit({ name: 'auth', max: 10, windowSec: 60, by: 'ip' })  per IP address
 *
 * Counters live in this process's memory. With several app instances each one counts on its own
 * (the effective limit is multiplied); move the counters to Redis if you scale out.
 */
export interface RateLimitOptions {
  name: string
  max: number
  windowSec: number
  by?: 'user' | 'ip'
}

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

const sweeper = setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}, 60_000)
sweeper.unref()

export default class RateLimitMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: RateLimitOptions) {
    const { request, response } = ctx
    const identity = options.by === 'ip' ? request.ip() : String(ctx.auth?.user?.id ?? request.ip())
    const key = `${options.name}:${identity}`

    const now = Date.now()
    let bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowSec * 1000 }
      buckets.set(key, bucket)
    }
    bucket.count++

    const remaining = Math.max(options.max - bucket.count, 0)
    response.header('X-RateLimit-Limit', String(options.max))
    response.header('X-RateLimit-Remaining', String(remaining))
    response.header('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)))

    if (bucket.count > options.max) {
      const retryAfter = Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1)
      response.header('Retry-After', String(retryAfter))
      return response.status(429).json({
        message: 'Too many requests. Please slow down and try again shortly.',
        retry_after_seconds: retryAfter,
      })
    }

    return next()
  }
}
