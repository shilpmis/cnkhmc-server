import type { HttpContext } from '@adonisjs/core/http'
import StaffConfiguration from '#models/StaffConfiguration'
import vine from '@vinejs/vine'

export default class StaffConfigurationsController {
  
  // Get configurations for school
  async index({ response, auth, request }: HttpContext) {
    const schoolId = auth.user!.school_id!
    const configType = request.input('config_type')

    const query = StaffConfiguration.query()
      .where('school_id', schoolId)
      .preload('parent')

    if (configType) {
      query.where('config_type', configType)
    }

    const configs = await query.orderBy('name', 'asc')
    return response.ok(configs)
  }

  // Create configuration
  async store({ request, response, auth }: HttpContext) {
    const schoolId = auth.user!.school_id!
    
    const validator = vine.compile(
      vine.object({
        config_type: vine.enum(['STAFF_TYPE', 'STAFF_CATEGORY', 'DESIGNATION']),
        name: vine.string().trim().maxLength(255),
        parent_id: vine.number().nullable().optional(),
      })
    )

    const payload = await validator.validate(request.all())

    // check parent if present
    if (payload.parent_id) {
      const parent = await StaffConfiguration.query()
        .where('id', payload.parent_id)
        .where('school_id', schoolId)
        .first()
      if (!parent) {
        return response.badRequest({ message: 'Parent configuration not found' })
      }
    }

    const config = await StaffConfiguration.create({
      school_id: schoolId,
      ...payload,
    })

    return response.created(config)
  }

  // Update configuration
  async update({ params, request, response, auth }: HttpContext) {
    const schoolId = auth.user!.school_id!
    const id = params.id

    const config = await StaffConfiguration.query()
      .where('id', id)
      .where('school_id', schoolId)
      .first()

    if (!config) {
      return response.notFound({ message: 'Configuration not found' })
    }

    const validator = vine.compile(
      vine.object({
        name: vine.string().trim().maxLength(255).optional(),
        parent_id: vine.number().nullable().optional(),
      })
    )

    const payload = await validator.validate(request.all())

    if (payload.parent_id) {
      const parent = await StaffConfiguration.query()
        .where('id', payload.parent_id)
        .where('school_id', schoolId)
        .first()
      if (!parent) {
        return response.badRequest({ message: 'Parent configuration not found' })
      }
    }

    config.merge(payload)
    await config.save()

    return response.ok(config)
  }

  // Delete configuration
  async destroy({ params, response, auth }: HttpContext) {
    const schoolId = auth.user!.school_id!
    const id = params.id

    const config = await StaffConfiguration.query()
      .where('id', id)
      .where('school_id', schoolId)
      .first()

    if (!config) {
      return response.notFound({ message: 'Configuration not found' })
    }

    await config.delete()
    return response.ok({ message: 'Configuration deleted successfully' })
  }
}
