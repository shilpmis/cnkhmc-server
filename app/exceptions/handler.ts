import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: any, ctx: HttpContext) {
    const fs = await import('fs')
    try {
      fs.appendFileSync('scratch/last_error.log', new Date().toISOString() + '\\n' + String(error.message) + '\\n' + String(error.stack) + '\\n\\n')
    } catch(e) {}
    return ctx.response.status(error.status || 500).json({
      errors: error,
      message: error.message,
      stack: error.stack
    })
  }

  /**
   * The method is used to report error to the logging service or
   * the third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
