import type { HttpContext } from '@adonisjs/core/http'
import AcademicSession from '#models/AcademicSession'
import AcademicCalendarSetting from '#models/AcademicCalendarSetting'
import { UpdateAcademicCalendarSettingValidator } from '#validators/AcademicCalendarSetting'
import { Roles } from '../utils/Roles.js'

export default class AcademicCalendarSettingsController {
  public async getSettings(ctx: HttpContext) {
    const academic_session_id = Number(ctx.params.academic_session_id)
    const school_id = ctx.auth.user?.school_id

    if (!school_id) {
      return ctx.response.unauthorized({ message: 'Unauthorized' })
    }

    if (!academic_session_id || Number.isNaN(academic_session_id)) {
      return ctx.response.badRequest({ message: 'Invalid academic_session_id' })
    }

    const isSuperAdmin = ctx.auth.user?.role_id === Roles.SUPER_ADMIN || ctx.auth.user?.role_id === Roles.DEVELOPER
    const sessionQuery = AcademicSession.query().where('id', academic_session_id as number)
    if (!isSuperAdmin) {
      sessionQuery.andWhere('school_id', school_id as number)
    }
    const session = await sessionQuery.first()

    if (!session) {
      return ctx.response.notFound({ message: 'Academic session not found' })
    }

    let settings = await AcademicCalendarSetting.query()
      .where('academic_session_id', academic_session_id as number)
      .first()

    // Lazy-create defaults so frontend always receives a canonical object.
    if (!settings) {
      settings = await AcademicCalendarSetting.create({
        academic_session_id,
        non_working_dates: [],
        is_saturday_working: true,
      })
    }

    return ctx.response.ok({
      academic_session_id: settings.academic_session_id as number,
      non_working_dates: settings.non_working_dates || [],
      is_saturday_working: settings.is_saturday_working,
    })
  }

  public async upsertSettings(ctx: HttpContext) {
    const academic_session_id = Number(ctx.params.academic_session_id)
    const school_id = ctx.auth.user?.school_id

    if (!school_id) {
      return ctx.response.unauthorized({ message: 'Unauthorized' })
    }

    if (ctx.auth.user?.role_id === Roles.SCHOOL_TEACHER) {
      return ctx.response.forbidden({ message: 'Teachers are not allowed to modify calendar settings' })
    }

    if (!academic_session_id || Number.isNaN(academic_session_id)) {
      return ctx.response.badRequest({ message: 'Invalid academic_session_id' })
    }

    const isSuperAdmin = ctx.auth.user?.role_id === Roles.SUPER_ADMIN || ctx.auth.user?.role_id === Roles.DEVELOPER
    const sessionQuery = AcademicSession.query().where('id', academic_session_id as number)
    if (!isSuperAdmin) {
      sessionQuery.andWhere('school_id', school_id as number)
    }
    const session = await sessionQuery.first()

    if (!session) {
      return ctx.response.notFound({ message: 'Academic session not found' })
    }

    const payload = await UpdateAcademicCalendarSettingValidator.validate(ctx.request.all())

    const nonWorkingDates = Array.from(new Set(payload.non_working_dates))

    const settings = await AcademicCalendarSetting.updateOrCreate(
      { academic_session_id },
      {
        non_working_dates: nonWorkingDates,
        is_saturday_working: payload.is_saturday_working,
      }
    )

    return ctx.response.ok({
      academic_session_id: settings.academic_session_id as number,
      non_working_dates: settings.non_working_dates || [],
      is_saturday_working: settings.is_saturday_working,
    })
  }
}

