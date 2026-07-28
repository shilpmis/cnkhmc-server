import type { HttpContext } from '@adonisjs/core/http'
import Quota from '#models/Quota'

export default class QuotasController {
  public async createQuotaForSeats(ctx: HttpContext) {
    try {
      const school_id = ctx.auth.user?.school_id
      const academic_year = ctx.request.qs().academic_session
      const data = ctx.request.only(['name', 'description', 'eligibility_criteria', 'is_active'])
      const quota = await Quota.create({ ...data, school_id: school_id as number, academic_year })
      return ctx.response.created(quota)
    } catch (error) {
      console.log('error while creating quota', error)
      return ctx.response.internalServerError({ message: 'Error creating quota', error })
    }
  }

  public async listAllQuotas(ctx: HttpContext) {
    if (!ctx.request.qs().academic_session) {
      return ctx.response.badRequest({ message: 'Academic session ID is required' })
    }

    return await Quota.query()
      .where('school_id', ctx.auth.user!.school_id as number)
      .andWhere('academic_year', ctx.request.qs().academic_session)
  }

  public async delete({ params, response }: HttpContext) {
    const quota = await Quota.findOrFail(params.id)
    await quota.delete()
    return response.noContent()
  }

  public async updateQuota({ params, request }: HttpContext) {
    const quota = await Quota.findOrFail(params.id)
    quota.merge(request.only(['name', 'description', 'eligibility_criteria', 'is_active']))
    await quota.save()
    return quota
  }
}
