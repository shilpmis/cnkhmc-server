import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { switchToCurrentTerms } from '#services/timetable_terms'

/**
 * The first request of each day moves every division's live timetable to the timetable of the term
 * that today falls in. Runs in the background so the request itself is never delayed or failed by it.
 */
export default class DailyTermSwitchMiddleware {
  async handle(_ctx: HttpContext, next: NextFn) {
    switchToCurrentTerms().catch((error) => console.error('Daily term switch failed:', error))
    return next()
  }
}
