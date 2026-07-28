import QuotaAllocation from '#models/QuotaAllocation'
import StudentEnrollments from '#models/StudentEnrollments'
import type { HttpContext } from '@adonisjs/core/http'

export default class AdmissionsController {
  public async admitStudent({ request, response }: HttpContext) {
    const { student_id, class_id, quota_id } = request.only(['student_id', 'class_id', 'quota_id'])

    let selectedQuotaId = quota_id

    if (quota_id) {
      const allocation = await QuotaAllocation.query()
        .where('quota_id', quota_id)
        .where('class_id', class_id)
        .first()

      if (!allocation || allocation.filled_seats >= allocation.total_seats) {
        selectedQuotaId = null // Move to General Quota
      } else {
        allocation.filled_seats += 1
        await allocation.save()
      }
    }

    const admission = await StudentEnrollments.create({
      student_id,
      division_id: class_id,
      quota_id: selectedQuotaId,
      academic_year: request.qs().academic_year as number,
      status: 'pursuing',
    })
    return response.created(admission)
  }

  public async list() {
    return await StudentEnrollments.query().preload('student').preload('division').preload('quota')
  }
}
