import type { HttpContext } from '@adonisjs/core/http'
import Policy from '#models/policy'
import User from '#models/User'

export default class PoliciesController {
  async index({ response }: HttpContext) {
    const policies = await Policy.all()
    return response.ok(policies)
  }

  async store({ request, response }: HttpContext) {
    const data = request.only(['name', 'description', 'rules'])
    const policy = await Policy.create(data)
    return response.created(policy)
  }

  async show({ params, response }: HttpContext) {
    const policy = await Policy.findOrFail(params.id)
    return response.ok(policy)
  }

  async update({ params, request, response }: HttpContext) {
    const policy = await Policy.findOrFail(params.id)
    const data = request.only(['name', 'description', 'rules'])
    
    policy.merge(data)
    await policy.save()
    
    return response.ok(policy)
  }

  async destroy({ params, response }: HttpContext) {
    const policy = await Policy.findOrFail(params.id)
    await policy.delete()
    return response.noContent()
  }

  async assignToUser({ params, request, response }: HttpContext) {
    const user = await User.findOrFail(params.userId)
    const { policyIds } = request.only(['policyIds'])
    
    await user.related('policies').sync(policyIds)
    await user.load('policies')
    
    return response.ok(user)
  }
}