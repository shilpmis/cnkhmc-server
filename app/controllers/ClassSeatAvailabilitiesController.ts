import Classes from '#models/Classes'
import ClassSeatAvailability from '#models/ClassSeatAvailability'
import QuotaAllocation from '#models/QuotaAllocation'
import type { HttpContext } from '@adonisjs/core/http'

export default class ClassSeatAvailabilitiesController {
  /**
   * Add seat availability for a class
   */
  public async addSeatAvailability(ctx: HttpContext) {
    const { class_id, total_seats, academic_year, academic_session_id } = ctx.request.only([
      'class_id',
      'total_seats',
      'academic_year',
      'academic_session_id',
    ])
    const year = Number(academic_year || academic_session_id)

    // Check if the class exists
    const classData = await Classes.query()
      // .preload('seat_availability', (query) => {
      //   query.where('academic_year', year).first()
      // })
      .where('id', class_id)
      .andWhere('school_id', ctx.auth.user!.school_id as number)
      .first()

    if (!classData) {
      return ctx.response.notFound({ error: `Class ID ${class_id} not found` })
    }

    // console.log(
    //   'classData.seat_availability',
    //   academic_session_id as number,
    //   classData.seat_availability,
    //   class_id
    // )

    let exsiting_seats = await ClassSeatAvailability.query()
      .where('class_id', class_id)
      .where('academic_year', year)
      .first()  

    // Check if seat availability already exists
    if (exsiting_seats) {
      return ctx.response.badRequest({
        error: `Seat availability already exists for Class  ${classData.class}`,
      })
    }

    const seatAvailability = await ClassSeatAvailability.create({
      class_id,
      total_seats,
      academic_year: year,
      quota_allocated_seats: 0,
      general_available_seats: total_seats,
      filled_seats: 0,
      remaining_seats: total_seats,
    })

    return ctx.response.created({
      message: 'Class seat availability added successfully',
      seatAvailability,
    })
  }

  /**
   * Get all classes seat availability
   */
  public async getAllClassesSeatAvailability(ctx: HttpContext) {
    let academic_year = ctx.request.input('academic_year') || ctx.request.input('acadamic_session') || ctx.request.input('academic_session_id')
    if (!academic_year) {
      return ctx.response.badRequest({
        error: 'Academic year is required',
      })
    }

    const classSeatAvailabilities = await ClassSeatAvailability.query()
      .preload('class')
      .preload('quota_allocation', (query) => {
        query.preload('quota', (q) => {
          q.where('academic_year', Number(academic_year))
        })
        query.where('academic_year', Number(academic_year))
      })
      .where('academic_year', Number(academic_year))

    // if (!classSeatAvailabilities.length) {
    //   return ctx.response.notFound({ error: 'No seat availability data found' })
    // }

    return ctx.response.ok(classSeatAvailabilities)
  }

  /**
   * Get seat availability for a specific class
   */
  public async getSeatAvailability(ctx: HttpContext) {
    // Validate class_id parameter
    const clas = await Classes.query()
      .where('id', ctx.params.class_id)
      .andWhere('school_id', ctx.auth.user!.school_id as number)
      .first()

    if (!clas) {
      return ctx.response.notFound({
        error: `Class ID ${ctx.params.class_id} not found`,
      })
    }

    let activeYear = ctx.params.academic_year || ctx.params.academic_session_id || ctx.request.input('academic_year') || ctx.request.input('academic_session_id')
    if (!activeYear) {
      return ctx.response.badRequest({
        error: 'Academic year is required',
      })
    }

    const availability = await ClassSeatAvailability.query()
      .preload('class')
      .preload('quota_allocation')
      .where('class_id', ctx.params.class_id)
      .andWhere('academic_year', Number(activeYear))
      .first()

    if (!availability) {
      return ctx.response.notFound({
        error: `Seat availability data not found for class ID ${ctx.params.class_id}`,
      })
    }

    return ctx.response.json(availability)
  }

  /**
   * Update class seat availability for a specific class
   */
  public async updateSeatAvailability({ params, request, response, auth }: HttpContext) {
    try {
      const class_id = Number(params.class_id)
      if (!class_id) {
        return response.badRequest({ message: 'Invalid class ID' })
      }

      let clas = await Classes.query()
        .where('id', class_id)
        .andWhere('school_id', auth.user!.school_id as number)
        .first()

      if (!clas) {
        return response.notFound({ message: `Class ID ${class_id} not found` })
      }

      const total_seats = request.input('total_seats')
      if (!total_seats || isNaN(total_seats)) {
        return response.badRequest({ message: 'Invalid total seats value' })
      }

      let academic_year = Number(request.input('academic_year') || request.input('academic_session_id'))
      if (!academic_year) {
        return response.badRequest({ message: 'Academic year is required' })
      }

      let seatAvailability = await ClassSeatAvailability.query()
        .where('class_id', class_id)
        .where('academic_year', academic_year)
        .first()

      if (!seatAvailability) {
        return response.notFound({
          message: `Seat availability not found for Class ID ${class_id}`,
        })
      }

      // Get total quota-allocated seats
      const quotaSum = await QuotaAllocation.query()
        .where('class_id', class_id)
        .andWhere('academic_year', academic_year)
        .sum('total_seats as total')

      const quota_allocated_seats = Number(quotaSum[0]?.$extras.total ?? 0)

      if (total_seats < quota_allocated_seats) {
        return response.badRequest({
          message: `Total seats cannot be less than quota allocated seats (${quota_allocated_seats})`,
        })
      }

      // Check if filled seats exceed total seats
      if (seatAvailability.filled_seats > total_seats) {
        return response.badRequest({
          message: `Filled seats (${seatAvailability.filled_seats}) cannot exceed total seats (${total_seats})`,
        })
      }

      // Calculate remaining and general seats
      const general_available_seats = total_seats - quota_allocated_seats
      const remaining_seats = total_seats - seatAvailability.filled_seats

      // Update values
      seatAvailability.total_seats = total_seats
      seatAvailability.quota_allocated_seats = quota_allocated_seats
      seatAvailability.general_available_seats = general_available_seats
      seatAvailability.filled_seats = seatAvailability.filled_seats
      seatAvailability.remaining_seats = remaining_seats

      await seatAvailability.save()

      return response.ok({
        message: `Seat availability updated for Class ID ${class_id}`,
        seatAvailability,
      })
    } catch (error) {
      console.error('Error updating seat availability:', error)
      return response.internalServerError({
        message: 'Failed to update seat availability',
        error: error.message,
      })
    }
  }
}
