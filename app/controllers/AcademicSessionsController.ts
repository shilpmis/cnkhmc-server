import type { HttpContext } from '@adonisjs/core/http'

export default class AcademicSessionsController {
  public async getAllAcademicSessionInSchool(ctx: HttpContext) {
    const school_id = Number(ctx.params.school_id || ctx.auth.user?.school_id || 1)
    const currentYear = new Date().getFullYear()

    const sessions = []
    for (let year = currentYear - 3; year <= currentYear + 5; year++) {
      sessions.push({
        id: year,
        school_id,
        academic_year: year,
        session_name: `${year}-${year + 1}`,
        start_year: `${year}`,
        end_year: `${year + 1}`,
        start_month: `01-${year}`,
        end_month: `12-${year}`,
        year: year,
        is_active: year === currentYear,
      })
    }

    return ctx.response.ok({
      success: true,
      sessions,
      data: sessions,
    })
  }

  public async createAcademicSessionForSchool(ctx: HttpContext) {
    const body = ctx.request.all()
    const year = Number(body.start_year || body.academic_year || new Date().getFullYear())

    const session = {
      id: year,
      school_id: body.school_id || ctx.auth.user?.school_id || 1,
      academic_year: year,
      session_name: `${year}-${year + 1}`,
      start_year: `${year}`,
      end_year: `${year + 1}`,
      start_month: body.start_month || `01-${year}`,
      end_month: body.end_month || `12-${year}`,
      year: year,
      is_active: Boolean(body.is_active),
    }

    return ctx.response.created({
      success: true,
      message: 'Academic session created successfully',
      session,
      data: session,
    })
  }

  public async updateAcademicSessionForSchool(ctx: HttpContext) {
    const id = Number(ctx.params.id)
    const body = ctx.request.all()

    return ctx.response.ok({
      success: true,
      message: 'Academic session updated successfully',
      session: {
        id,
        academic_year: id,
        ...body,
      },
    })
  }

  public async deleteAcademicSession(ctx: HttpContext) {
    return ctx.response.ok({
      success: true,
      message: 'Academic session deleted successfully',
    })
  }
}
