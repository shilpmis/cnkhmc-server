import type { HttpContext } from '@adonisjs/core/http'
import PracticalBatchSetting from '#models/PracticalBatchSetting'

const DEFAULT_BATCHES = ['Batch A', 'Batch B', 'Batch C']

export default class PracticalBatchSettingsController {
  /**
   * GET /practical-batch-settings
   * Returns the school's practical batch configuration.
   * Auto-creates defaults if none exist.
   */
  async getSettings({ auth, response }: HttpContext) {
    const schoolId = auth.user!.school_id as number

    let settings = await PracticalBatchSetting.query()
      .where('school_id', schoolId)
      .first()

    if (!settings) {
      settings = await PracticalBatchSetting.create({
        schoolId,
        batches: DEFAULT_BATCHES,
      })
    }

    return response.ok({
      id: settings.id,
      school_id: settings.schoolId,
      batches: settings.batches,
    })
  }

  /**
   * PUT /practical-batch-settings
   * Upserts the batch name list for the school.
   * Body: { batches: string[] }
   */
  async updateSettings({ auth, request, response }: HttpContext) {
    const schoolId = auth.user!.school_id as number
    const { batches } = request.only(['batches']) as { batches: string[] }

    if (!Array.isArray(batches)) {
      return response.badRequest({ message: '`batches` must be an array of strings.' })
    }

    const cleaned = batches
      .map((b) => (typeof b === 'string' ? b.trim() : ''))
      .filter(Boolean)

    let settings = await PracticalBatchSetting.query()
      .where('school_id', schoolId)
      .first()

    if (!settings) {
      settings = new PracticalBatchSetting()
      settings.schoolId = schoolId
    }

    settings.batches = cleaned
    await settings.save()

    return response.ok({
      id: settings.id,
      school_id: settings.schoolId,
      batches: settings.batches,
    })
  }
}
