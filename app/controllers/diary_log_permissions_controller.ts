import type { HttpContext } from '@adonisjs/core/http'
import DiaryLogPermission from '#models/DiaryLogPermission'

export default class DiaryLogPermissionsController {
  
  async index({ response }: HttpContext) {
    const permissions = await DiaryLogPermission.query()
      .preload('staff', (query) => {
        query.select('id', 'first_name', 'last_name', 'employee_code')
      })
      .preload('grantedByUser', (query) => {
        query.select('id', 'first_name', 'last_name')
      })
      .orderBy('date', 'desc')
      
    return response.ok(permissions)
  }

  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const { staffId, date } = request.only(['staffId', 'date'])
    
    if (!staffId || !date) {
      return response.badRequest({ message: 'staffId and date are required' })
    }

    // Check if permission already exists
    const existing = await DiaryLogPermission.query()
      .where('staff_id', staffId)
      .where('date', date)
      .first()

    if (existing) {
      return response.ok(existing)
    }

    const permission = await DiaryLogPermission.create({
      staffId,
      date,
      grantedByUserId: user.id
    })

    await permission.load('staff', (q) => q.select('id', 'first_name', 'last_name', 'employee_code'))
    await permission.load('grantedByUser', (q) => q.select('id', 'first_name', 'last_name'))

    return response.created(permission)
  }

  async destroy({ params, response }: HttpContext) {
    const { id } = params
    const permission = await DiaryLogPermission.find(id)
    
    if (!permission) {
      return response.notFound({ message: 'Permission not found' })
    }
    
    await permission.delete()
    return response.ok({ message: 'Permission revoked successfully' })
  }
}
