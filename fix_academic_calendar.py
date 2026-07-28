import re

with open('app/controllers/AcademicCalendarSettingsController.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove AcademicSession import
content = content.replace("import AcademicSession from '#models/AcademicSession'\n", "")

# Replace entire class content with updated logic
new_class = """export default class AcademicCalendarSettingsController {
  public async getSettings(ctx: HttpContext) {
    const academic_year = Number(ctx.params.academic_year || ctx.params.academic_session_id)
    const school_id = ctx.auth.user?.school_id

    if (!school_id) {
      return ctx.response.unauthorized({ message: 'Unauthorized' })
    }

    if (!academic_year || Number.isNaN(academic_year)) {
      return ctx.response.badRequest({ message: 'Invalid academic_year' })
    }

    let settings = await AcademicCalendarSetting.query()
      .where('academic_year', academic_year)
      .first()

    // Lazy-create defaults so frontend always receives a canonical object.
    if (!settings) {
      settings = await AcademicCalendarSetting.create({
        academic_year,
        non_working_dates: [],
        is_saturday_working: true,
      })
    }

    return ctx.response.ok({
      academic_year: settings.academic_year,
      non_working_dates: settings.non_working_dates || [],
      is_saturday_working: settings.is_saturday_working,
    })
  }

  public async upsertSettings(ctx: HttpContext) {
    const academic_year = Number(ctx.params.academic_year || ctx.params.academic_session_id)
    const school_id = ctx.auth.user?.school_id

    if (!school_id) {
      return ctx.response.unauthorized({ message: 'Unauthorized' })
    }

    if (ctx.auth.user?.role_id === Roles.SCHOOL_TEACHER) {
      return ctx.response.forbidden({ message: 'Teachers are not allowed to modify calendar settings' })
    }

    if (!academic_year || Number.isNaN(academic_year)) {
      return ctx.response.badRequest({ message: 'Invalid academic_year' })
    }

    const payload = await UpdateAcademicCalendarSettingValidator.validate(ctx.request.all())

    const nonWorkingDates = Array.from(new Set(payload.non_working_dates))

    const settings = await AcademicCalendarSetting.updateOrCreate(
      { academic_year },
      {
        non_working_dates: nonWorkingDates,
        is_saturday_working: payload.is_saturday_working,
      }
    )

    return ctx.response.ok({
      academic_year: settings.academic_year,
      non_working_dates: settings.non_working_dates || [],
      is_saturday_working: settings.is_saturday_working,
    })
  }
}"""

content = re.sub(r'export default class AcademicCalendarSettingsController \{[\s\S]*\}', new_class, content)

with open('app/controllers/AcademicCalendarSettingsController.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("AcademicCalendarSettingsController fixed")
