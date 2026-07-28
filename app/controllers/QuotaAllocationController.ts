import ClassSeatAvailability from '#models/ClassSeatAvailability'
import Quota from '#models/Quota'
import QuotaAllocation from '#models/QuotaAllocation'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class QuotaAllocationsController {
  public async allocateQuotaToClass({ request, response }: HttpContext) {
    const data = request.only(['quota_id', 'total_seats', 'class_id', 'academic_year'])

    // Start transaction
    const trx = await db.transaction()

    try {
      // Create the quota allocation
      const allocation = await QuotaAllocation.create(
        {
          quota_id: data.quota_id,
          class_id: data.class_id,
          filled_seats: 0,
          total_seats: data.total_seats,
          academic_year: data.academic_year as number,
        },
        { client: trx }
      )

      // Fetch the class seat availability
      const seatAvailability = await ClassSeatAvailability.query()
        .where('class_id', data.class_id)
        .firstOrFail()

      // Update the allocated seats in ClassSeatAvailability
      seatAvailability.useTransaction(trx)
      seatAvailability.quota_allocated_seats += data.total_seats
      seatAvailability.general_available_seats -= data.total_seats
      seatAvailability.remaining_seats -= data.total_seats

      await seatAvailability.save()

      // Commit transaction
      await trx.commit()

      return response.created({
        message: 'Quota allocated successfully',
        allocation,
        seatAvailability,
      })
    } catch (error) {
      // Rollback transaction on error
      await trx.rollback()
      return response.internalServerError({
        error: 'Failed to allocate quota',
        details: error.message,
      })
    }
  }

  public async listAllQuotaAllocation(ctx: HttpContext) {
    let active_academic_year = await db.from('users') /* Dummy replacement for AcademicSession */
      .where('is_active', 1)
      .andWhere('school_id', 1)
      .first()

    if (!active_academic_year) {
      return { message: 'No active academic session found' }
    }

    let alocated_quota = await QuotaAllocation.query().preload('quota').preload('class')

    // .where('academic_year', active_academic_year!.id)

    return ctx.response.json(alocated_quota)
  }

  public async updateTotalSeats({ request, params, response, auth }: HttpContext) {
    let active_academic_year = await db.from('users') /* Dummy replacement for AcademicSession */
      .where('is_active', true)
      .andWhere('school_id', auth.user!.school_id as number)
      .first()

    if (!active_academic_year) {
      return { message: 'No active academic session found' }
    }

    const trx = await db.transaction()

    try {
      // Find the allocation entry
      const allocation = await QuotaAllocation.query()
        .where('id', params.quota_allocation_id)
        // .andWhere('academic_year', active_academic_year!.id)
        .first()

      if (!allocation) {
        await trx.rollback()
        return response.notFound({ error: 'Allocation not found' })
      }

      const quota = await Quota.query()
        .where('id', allocation.quota_id)
        .andWhere('school_id', auth.user!.school_id as number)
        // .andWhere('academic_year', auth.user!.school_id as number)
        .first()

      if (!quota) {
        await trx.rollback()
        return response.notFound({ error: 'Quota not found' })
      }

      if (quota.academic_year !== active_academic_year!.id) {
        await trx.rollback()
        return response.notFound({ error: 'Quota not belongs to the current academic session.' })
      }

      const { total_seats } = request.only(['total_seats'])

      // Validate that new total seats are not less than filled seats
      if (total_seats < allocation.filled_seats) {
        await trx.rollback()
        return response.badRequest({
          error: 'Total seats cannot be less than the number of filled seats',
        })
      }

      // Find the related class seat availability
      const seatAvailability = (
        await ClassSeatAvailability.query()
          .where('class_id', allocation.class_id)
          .andWhere('academic_year', active_academic_year!.id)
          .firstOrFail()
      ).useTransaction(trx)

      // Validate that new total seats do not exceed class seat availability
      const availableSeatsForClass =
        seatAvailability.remaining_seats + (allocation.total_seats - allocation.filled_seats)

      if (total_seats > availableSeatsForClass) {
        await trx.rollback()
        return response.badRequest({
          error: 'Total seats cannot exceed the available seats for the class',
        })
      }

      // Update the remaining and allocated seats in ClassSeatAvailability
      const seatDifference = total_seats - allocation.total_seats
      seatAvailability.quota_allocated_seats += seatDifference
      seatAvailability.general_available_seats =
        seatAvailability.total_seats - seatAvailability.quota_allocated_seats
      seatAvailability.remaining_seats =
        seatAvailability.total_seats - seatAvailability.filled_seats

      // Update the total seats in QuotaAllocation
      allocation.total_seats = total_seats
      await allocation.save()

      await seatAvailability.save()

      // Commit transaction
      await trx.commit()

      return response.ok({
        message: 'Total seats updated successfully',
        allocation,
        seatAvailability,
      })
    } catch (error) {
      await trx.rollback()
      return response.internalServerError({
        error: 'Failed to update total seats',
        details: error.message,
      })
    }
  }

  // public async delete({ params, response }: HttpContext) {
  //   const trx = await db.transaction()

  //   try {
  //     const allocation = await QuotaAllocation.findOrFail(params.id)

  //     // Fetch the associated seat availability
  //     const seatAvailability = await ClassSeatAvailability.query()
  //       .where('class_id', allocation.class_id)
  //       .firstOrFail()

  //     // Adjust seat counts
  //     seatAvailability.useTransaction(trx)
  //     seatAvailability.quota_allocated_seats -= allocation.total_seats
  //     seatAvailability.general_available_seats =seatAvailability.total_seats -  allocation.total_seats
  //     seatAvailability.remaining_seats += allocation.total_seats

  //     await seatAvailability.save()

  //     // Delete allocation
  //     await allocation.useTransaction(trx).delete()

  //     // Commit transaction
  //     await trx.commit()

  //     return response.noContent()
  //   } catch (error) {
  //     await trx.rollback()
  //     return response.internalServerError({
  //       error: 'Failed to delete quota allocation',
  //       details: error.message,
  //     })
  //   }
  // }
}
