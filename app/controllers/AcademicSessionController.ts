import AcademicSession from '#models/AcademicSession'
import { HttpContext } from '@adonisjs/core/http'
import Schools from '#models/Schools'
import db from '@adonisjs/lucid/services/db'
import { MONTHS_ORDER } from '../../utility/constant.js'
import { DateTime } from 'luxon'

export default class AcademicSessionsController {
  public async createAcademicSessionForSchool(ctx: HttpContext) {
    const trx = await db.transaction()

    try {
      const { school_id, start_month, end_month, start_year, end_year, is_active } =
        ctx.request.only([
          'school_id',
          'start_month',
          'end_month',
          'start_year',
          'end_year',
          'is_active',
        ])

      // Ensure school_id is valid
      if (!school_id || isNaN(school_id) || Number(school_id) <= 0) {
        await trx.rollback()
        return ctx.response.badRequest({ message: 'Invalid school ID' })
      }

      // Check if the school exists
      const schoolExists = await Schools.find(school_id)
      if (!schoolExists) {
        await trx.rollback()
        return ctx.response.badRequest({ message: 'School not found' })
      }

      // Parse start_month and end_month from YYYY-MM format to month names
      const parsedStart = DateTime.fromFormat(start_month, 'yyyy-MM')
      const parsedEnd = DateTime.fromFormat(end_month, 'yyyy-MM')

      if (!parsedStart.isValid || !parsedEnd.isValid) {
        await trx.rollback()
        return ctx.response.badRequest({
          message: 'Invalid date format for start_month or end_month. Use YYYY-MM format.',
        })
      }

      const startMonthName = parsedStart.toFormat('LLLL') // "March"
      const endMonthName = parsedEnd.toFormat('LLLL') // "March"

      const startIndex = MONTHS_ORDER.indexOf(startMonthName)
      const endIndex = MONTHS_ORDER.indexOf(endMonthName)

      if (startIndex === -1 || endIndex === -1) {
        await trx.rollback()
        return ctx.response.badRequest({ message: 'Invalid start or end month value' })
      }

      // Calculate duration (months between start and end)
      let duration = endIndex - startIndex + 1
      if (start_year !== end_year) {
        duration += 12
      }

      if (duration < 10 || duration > 13) {
        await trx.rollback()
        return ctx.response.badRequest({
          message: 'Academic session must be between 10 to 12 months',
        })
      }

      // Prevent duplicate session for same months/years
      const academic_session = await AcademicSession.query().where('school_id', school_id as number)
      // .andWhere('start_year', start_year)
      // .andWhere('end_year', end_year)
      // .first()
      // .where('start_month', startMonthName)
      // .where('end_month', endMonthName)

      let duplicat_session =
        academic_session.length > 0
          ? academic_session.find((session) => {
              return (
                // (session.start_month === startMonthName && session.end_month === endMonthName) ||
                session.start_year === start_year && session.end_year === end_year
              )
            })
          : false

      if (duplicat_session) {
        await trx.rollback()
        return ctx.response.conflict({ message: 'Session already exists for the same period' })
      }

      const session_name = `${start_year}-${end_year}`

      // If this session is to be active, deactivate others
      if (is_active === true) {
        await AcademicSession.query({ client: trx })
          .where('school_id', school_id as number)
          .update({ is_active: false })
      }

      // Create session
      const session = await AcademicSession.create(
        {
          school_id,
          session_name,
          start_month: startMonthName,
          end_month: endMonthName,
          start_year,
          end_year,
          is_active: academic_session.length === 0 ? true : is_active,
        },
        { client: trx }
      )

      await trx.commit()
      return ctx.response.created({ message: 'Academic session created', session })
    } catch (error) {
      await trx.rollback()
      console.error('Error creating academic session:', error)
      return ctx.response.internalServerError({
        message: 'Failed to create academic session',
        error: error.message,
      })
    }
  }

  /**
   * Activate/Deactivate a session. Ensures only one is active per school.
   */
  public async updateAcademicSessionForSchool(ctx: HttpContext) {
    const school_id = ctx.auth.user?.school_id
    const session_id = ctx.params.id

    if (!school_id) {
      return ctx.response.unauthorized({ message: 'Unauthorized' })
    }

    if (!session_id || isNaN(session_id) || Number(session_id) <= 0) {
      return ctx.response.badRequest({ message: 'Invalid session ID' })
    }

    const trx = await db.transaction()

    try {
      const { is_active } = ctx.request.only(['is_active'])

      const session = await AcademicSession.findOrFail(session_id)

      // Only change if setting this session to active and it's currently inactive
      if (is_active === true && !session.is_active) {
        await AcademicSession.query({ client: trx })
          .where('school_id', school_id as number)
          .whereNot('id', session.id)
          .update({ is_active: false })
      }

      session.useTransaction(trx)
      session.merge({ is_active })
      await session.save()

      await trx.commit()
      return ctx.response.ok({ message: 'Academic session updated', session })
    } catch (error) {
      await trx.rollback()
      console.error('Error updating academic session:', error)
      return ctx.response.internalServerError({
        message: 'Failed to update academic session',
        error: error.message,
      })
    }
  }

  /**
   * Get all academic sessions for a school
   */
  public async getAllAcademicSessionInSchool(ctx: HttpContext) {
    try {
      const sessions = await AcademicSession.query()
        .preload('school')
        .where('school_id', ctx.params.school_id)
        .orderBy('start_month', 'desc')

      if (sessions.length === 0) {
        return ctx.response.notFound({ message: 'No academic sessions found' })
      }

      return ctx.response.ok({ sessions })
    } catch (error) {
      console.error('Error fetching academic sessions:', error)
      return ctx.response.internalServerError({
        message: 'Failed to retrieve academic sessions',
        error: error.message,
      })
    }
  }

  // public async deleteAcademicSession(ctx: HttpContext) {
  //   try {
  //     const session = await AcademicSession.query()
  //       .where('id', ctx.params.id)
  //       .where('school_id', ctx.auth.user!.school_id as number)
  //       .first()
  //       if (!session) {
  //         return ctx.response.notFound({ message: 'Session not found' })
  //       }
  //       await session.delete()
  //       return ctx.response.ok({ message: 'Session deleted' })
  //   } catch (error) {
  //     console.error('Error deleting academic session:', error)
  //     return ctx.response.internalServerError({
  //       message: 'Failed to delete academic session',
  //       error: error.message,
  //     })
  //   }
  // }
}
