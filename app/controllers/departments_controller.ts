import type { HttpContext } from '@adonisjs/core/http'
import Department from '#models/Department'

export default class DepartmentController {
  // 1. Get all departments for a specific school (entity)
  public async index({ request, response }: HttpContext) {
    const schoolId = request.input('school_id')
    const departments = await Department.query().where('entity_id', schoolId)
    return response.ok(departments)
  }

  public async store({ request, response }: HttpContext) {
    const data = request.all()
    const department = await Department.create({
      entity_id: data.school_id,
      name: data.name,
      code: data.code,
      subjects: data.subjects
    })
    return response.created(department)
  }

  public async update({ params, request, response }: HttpContext) {
    const department = await Department.findOrFail(params.id)
    const { name, code, subjects } = request.all()
    department.merge({ name, code, subjects })
    await department.save()
    return response.ok(department)
  }

  // 4. Delete a department
  public async destroy({ params, response }: HttpContext) {
    const department = await Department.findOrFail(params.id)
    await department.delete()
    return response.ok({ success: true })
  }
}