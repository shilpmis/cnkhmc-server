import type { HttpContext } from '@adonisjs/core/http'
import StudentColumnSetting from '#models/StudentColumnSetting'

export default class StudentColumnSettingsController {
  /**
   * GET /student-column-settings
   * Returns the school's configured enabled student import/export columns.
   */
  async getSettings({ auth, response }: HttpContext) {
    const schoolId = auth.user!.school_id as number

    const settings = await StudentColumnSetting.query()
      .where('school_id', schoolId)
      .first()

    return response.ok({
      id: settings?.id || null,
      school_id: schoolId,
      enabled_columns: settings?.enabledColumns || null,
    })
  }

  /**
   * PUT /student-column-settings
   * Upserts enabled columns for student import/export.
   * Body: { enabled_columns: string[] }
   */
  async updateSettings({ auth, request, response }: HttpContext) {
    const schoolId = auth.user!.school_id as number
    const { enabled_columns } = request.only(['enabled_columns']) as { enabled_columns: string[] }

    if (!Array.isArray(enabled_columns)) {
      return response.badRequest({ message: '`enabled_columns` must be an array of column key strings.' })
    }

    const cleaned = enabled_columns
      .map((col) => (typeof col === 'string' ? col.trim() : ''))
      .filter(Boolean)

    let settings = await StudentColumnSetting.query()
      .where('school_id', schoolId)
      .first()

    if (!settings) {
      settings = new StudentColumnSetting()
      settings.schoolId = schoolId
    }

    settings.enabledColumns = cleaned
    await settings.save()

    return response.ok({
      id: settings.id,
      school_id: settings.schoolId,
      enabled_columns: settings.enabledColumns,
    })
  }
}
