import AcademicSession from '#models/AcademicSession'
import Classes from '#models/Classes'
import ClassSeatAvailability from '#models/ClassSeatAvailability'
import QuotaAllocation from '#models/QuotaAllocation'
import type { HttpContext } from '@adonisjs/core/http'

export default class ClassSeatAvailabilitiesController {
  /**
   * Add seat availability for a class
   */
  public async addSeatAvailability(ctx: HttpContext) {
    const { class_id, total_seats, academic_session_id } = ctx.request.only([
      'class_id',
      'total_seats',
      'academic_session_id',
    ])

    // Check if the class exists
    const classData = await Classes.query()
      // .preload('seat_availability', (query) => {
      //   query.where('academic_session_id', academic_session_id as number).first()
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
      .where('academic_session_id', academic_session_id as number)
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
      academic_session_id: academic_session_id as number,
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
    let acadamic_session_id = ctx.request.input('acadamic_session')
    if (!acadamic_session_id) {
      return ctx.response.badRequest({
        error: 'Academic session ID is required',
      })
    }
    let academic_session = await AcademicSession.query()
      .where('id', acadamic_session_id)
      .andWhere('school_id', ctx.auth.user!.school_id as number)
      .first()

    if (!academic_session) {
      return ctx.response.notFound({ error: 'No active academic session found' })
    }

    const classSeatAvailabilities = await ClassSeatAvailability.query()
      .preload('class')
      .preload('quota_allocation', (query) => {
        query.preload('quota', (query) => {
          query.where('academic_session_id', academic_session.id)
        })
        query.where('academic_session_id', academic_session.id)
      })
      .where('academic_session_id', academic_session.id)

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

    let activeSession = ctx.params.academic_session_id || ctx.request.input('academic_session_id')
    if (!activeSession) {
      activeSession = await AcademicSession.query()
        .where('is_active', true)
        .andWhere('school_id', ctx.auth.user!.school_id as number)
        .first()
    }
    if (!activeSession) {
      return ctx.response.notFound({
        error: 'No active academic session found',
      })
    }
    // Fetch seat availability for the class

    const availability = await ClassSeatAvailability.query()
      .preload('class')
      .preload('quota_allocation')
      .where('class_id', ctx.params.class_id)
      .andWhere('academic_session_id', activeSession.id)
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

      // Get current active academic session for school
      const activeSession = await AcademicSession.query()
        .where('is_active', true)
        .andWhere('school_id', auth.user!.school_id as number)
        .first()

      if (!activeSession) {
        return response.notFound({ message: 'No active academic session found for this school' })
      }

      const academic_session_id = activeSession.id

      let seatAvailability = await ClassSeatAvailability.query()
        .where('class_id', class_id)
        .where('academic_session_id', academic_session_id as number)
        .first()

      if (!seatAvailability) {
        return response.notFound({
          message: `Seat availability not found for Class ID ${class_id}`,
        })
      }

      // Get total quota-allocated seats
      const quotaSum = await QuotaAllocation.query()
        .where('class_id', class_id)
        .andWhere('academic_session_id', academic_session_id as number)
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
