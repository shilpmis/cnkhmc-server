import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

type SessionRow = {
  school_id: number | null
  start_year: number
  end_year: number
  start_month: string
  end_month: string
}

// Sessions are shared by every school/device. The app identifies a session by its start year, so that is the `id`.
const toSession = (row: SessionRow, currentYear: number) => ({
  id: row.start_year,
  school_id: row.school_id,
  academic_year: row.start_year,
  session_name: `${row.start_year}-${row.end_year}`,
  start_year: `${row.start_year}`,
  end_year: `${row.end_year}`,
  start_month: row.start_month,
  end_month: row.end_month,
  year: row.start_year,
  is_active: row.start_year === currentYear,
})

export default class AcademicSessionsController {
  public async getAllAcademicSessionInSchool(ctx: HttpContext) {
    const school_id = Number(ctx.params.school_id || ctx.auth.user?.school_id || 1)
    const currentYear = new Date().getFullYear()

    const sessions = new Map<number, ReturnType<typeof toSession>>()
    for (let year = currentYear - 3; year <= currentYear + 5; year++) {
      sessions.set(
        year,
        toSession(
          {
            school_id,
            start_year: year,
            end_year: year + 1,
            start_month: `01-${year}`,
            end_month: `12-${year}`,
          },
          currentYear
        )
      )
    }

    const saved = await db.from('academic_sessions').select('*')
    for (const row of saved) sessions.set(row.start_year, toSession(row, currentYear))

    const list = Array.from(sessions.values()).sort((a, b) => a.id - b.id)
    return ctx.response.ok({ success: true, sessions: list, data: list })
  }

  public async createAcademicSessionForSchool(ctx: HttpContext) {
    const body = ctx.request.all()
    const startYear = Number(body.start_year)
    const endYear = Number(body.end_year)
    const startMonth = String(body.start_month || '')
    const endMonth = String(body.end_month || '')

    if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || !startMonth || !endMonth) {
      return ctx.response.badRequest({
        message: 'Start year, end year, start month and end month are required',
      })
    }
    if (endYear < startYear) {
      return ctx.response.badRequest({ message: 'End date must be after start date' })
    }

    const existing = await db.from('academic_sessions').where('start_year', startYear).first()
    if (existing) {
      return ctx.response.conflict({
        message: `An academic session starting in ${startYear} already exists`,
      })
    }

    const row = {
      school_id: Number(body.school_id || ctx.auth.user?.school_id) || null,
      start_year: startYear,
      end_year: endYear,
      start_month: startMonth,
      end_month: endMonth,
      created_by: ctx.auth.user?.id ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    }
    await db.table('academic_sessions').insert(row)

    const session = toSession(row, new Date().getFullYear())
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
    const startYear = Number(ctx.params.id)
    await db.from('academic_sessions').where('start_year', startYear).delete()
    return ctx.response.ok({
      success: true,
      message: 'Academic session deleted successfully',
    })
  }
}
