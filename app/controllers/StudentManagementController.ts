import type { HttpContext } from '@adonisjs/core/http'
import { schema } from '@adonisjs/validator'
import db from '@adonisjs/lucid/services/db'

import Division from '#models/Divisions'
import StudentEnrollments from '#models/StudentEnrollments'
import Students from '#models/Students'
import { ValidatioinStatusForDrop, ValidatioinStatusForMigration, ValidatioinStatusForSuspended } from '#validators/StudentManagement'
import Classes from '#models/Classes'

export default class StudentManagementController {

  /**
   * Apis for student management
   */

  public async indexStudentForManagement(ctx: HttpContext) {
    let division = ctx.params.division_id;

    let academic_year = ctx.request.qs().academic_session

    if (!academic_year) {
      return ctx.response.status(400).json({
        success: false,
        message: 'No active academic session found',
      })
    }

    console.log("division ", division, academic_year)

    let student = await StudentEnrollments
      .query()
      .where('division_id', division)
      .andWhere('academic_year', academic_year)
      .preload('student', (query) => {
        query.select(['id', 'enrollment_code', 'first_name', 'middle_name', 'last_name', 'gr_no'])
      })
      .paginate(ctx.request.input('page', 1), 10)

    return ctx.response.status(200).json(student)

  }


  public async updateEnrollmentStatusToMigrate(ctx: HttpContext) {
    let school_id = ctx.auth.user?.school_id
    let student_enrollment_id = ctx.params.student_enrollment_id;

    let student_enrollment = await StudentEnrollments.query()
      .preload('division')
      .where('id', student_enrollment_id)
      .first()

    if (!student_enrollment) {
      return ctx.response.status(400).json({
        success: false,
        message: 'Student enrollment not found',
      })
    }

    if (student_enrollment.status !== 'pursuing') {
      return ctx.response.status(400).json({
        success: false,
        message: 'Student enrollment is not in pursuing status , You can update status now.',
      })
    }

    let payload = await ValidatioinStatusForMigration.validate(ctx.request.all())

    if (payload.is_migration_for_class && payload.migrated_class === student_enrollment.division.class_id) {
      return ctx.response.status(400).json({
        success: false,
        message: 'Migration class is same as current class',
      })
    }

    if (payload.migrated_division === student_enrollment.division.id) {
      return ctx.response.status(400).json({
        success: false,
        message: 'Migrated Division is same as current class',
      })
    }

    if (payload.is_migration_for_class) {
      let new_clas = await Classes.query()
        .where('id', payload.migrated_class)
        .andWhere('school_id', school_id!)
        .first()

      if (!new_clas) {
        return ctx.response.status(400).json({
          success: false,
          message: 'Class not found for migration',
        })
      }
    }

    let new_division = await Division
      .query()
      .where('id', payload.migrated_division)
      .andWhere('class_id', payload.is_migration_for_class ? payload.migrated_class : student_enrollment.division.class_id)
      .first()

    if (!new_division) {
      return ctx.response.status(400).json({
        success: false,
        message: 'Division not found for migration',
      })
    }

    let trx = await db.transaction();

    try {
      let new_enrollment = await StudentEnrollments.create({
        student_id: student_enrollment.student_id,
        division_id: new_division.id,
        academic_year: student_enrollment.academic_year as number,
        status: 'pursuing',
        quota_id: student_enrollment.quota_id,
        is_new_admission: false,
        remarks: payload.reason,
        promoted_by: ctx.auth.user?.id,
      }, { client: trx })

      student_enrollment.status = 'migrated'
      await student_enrollment.useTransaction(trx).save();

      await trx.commit();

      return ctx.response.status(200).json({
        message: 'Student enrollment status updated to migrated',
        student_enrollment: new_enrollment,
      })

    } catch (error) {
      console.log('error occured while updating student enrollment status to migrated', error)
      await trx.rollback()
      return ctx.response.status(500).json({
        success: false,
        message: 'Error occurred while updating student enrollment status',
      })
    }

  }

  public async updateEnrollmentStatusToDrop(ctx: HttpContext) {
    let student_enrollment_id = ctx.params.student_enrollment_id;

    let student_enrollment = await StudentEnrollments.query()
      .preload('student')
      .preload('division')
      .where('id', student_enrollment_id)
      .first()

    if (!student_enrollment) {
      return ctx.response.status(400).json({
        success: false,
        message: 'Student enrollment not found',
      })
    }

    if (student_enrollment.status !== 'pursuing') {
      return ctx.response.status(400).json({
        success: false,
        message: 'Student enrollment is not in pursuing status , You can update status now.',
      })
    }

    let payload = await ValidatioinStatusForDrop.validate(ctx.request.all())

    let trx = await db.transaction();

    try {
      student_enrollment.status = 'drop'
      student_enrollment.remarks = payload.reason
      student_enrollment.promoted_by = ctx.auth.user!.id
      await student_enrollment.useTransaction(trx).save();

      student_enrollment.student.is_active = false
      await student_enrollment.student.useTransaction(trx).save()

      await trx.commit();

      return ctx.response.status(200).json({
        message: 'Student enrollment status updated to drop',
        student_enrollment: student_enrollment,
      })

    } catch (error) {
      console.log('error occured while updating student enrollment status to drop', error)
      await trx.rollback()
      return ctx.response.status(500).json({
        success: false,
        message: 'Error occurred while updating student enrollment status',
      })
    }

  }

  public async updateEnrollmentStatusToComplete(ctx: HttpContext) {
    let student_enrollment_id = ctx.params.student_enrollment_id;

    let student_enrollment = await StudentEnrollments.query()
      .preload('student')
      .preload('division')
      .where('id', student_enrollment_id)
      .first()

    if (!student_enrollment) {
      return ctx.response.status(400).json({
        success: false,
        message: 'Student enrollment not found',
      })
    }

    if (student_enrollment.status !== 'pursuing') {
      return ctx.response.status(400).json({
        success: false,
        message: 'Student enrollment is not in pursuing status , You can update status now.',
      })
    }

    let trx = await db.transaction();

    try {
      student_enrollment.status = 'completed'
      student_enrollment.promoted_by = ctx.auth.user!.id
      await student_enrollment.useTransaction(trx).save();

      student_enrollment.student.is_active = false
      await student_enrollment.student.useTransaction(trx).save()

      await trx.commit();

      return ctx.response.status(200).json({
        message: 'Student enrollment status updated to completed',
        student_enrollment: student_enrollment,
      })

    } catch (error) {
      console.log('error occured while updating student enrollment status to completed', error)
      await trx.rollback()
      return ctx.response.status(500).json({
        success: false,
        message: 'Error occurred while updating student enrollment status',
      })
    }

  }

  public async updateEnrollmentStatusToSuspended(ctx: HttpContext) {
    let student_enrollment_id = ctx.params.student_enrollment_id;

    let payload = await ValidatioinStatusForSuspended.validate(ctx.request.all())

    let student_enrollment = await StudentEnrollments.query()
      .preload('student')
      .preload('division')
      .where('id', student_enrollment_id)
      .first()

    if (!student_enrollment) {
      return ctx.response.status(400).json({
        success: false,
        message: 'Student enrollment not found',
      })
    }

    if (payload.status === 'suspended' && student_enrollment.status !== 'pursuing') {
      return ctx.response.status(400).json({
        success: false,
        message: 'Student enrollment is not in pursuing status , You can update status now.',
      })
    }

    if (payload.status === 'remove_suspension' && student_enrollment.status !== 'suspended') {
      return ctx.response.status(400).json({
        success: false,
        message: 'Student enrollment is not in suspended status , You can update status now.',
      })
    }

    let trx = await db.transaction();

    try {

      if (payload.status === 'suspended') {
        student_enrollment.status = 'suspended'
      } else {
        student_enrollment.status = 'pursuing'
      }
      student_enrollment.promoted_by = ctx.auth.user!.id
      await student_enrollment.useTransaction(trx).save();

      student_enrollment.student.is_active = student_enrollment.status === 'suspended' ? false : true
      await student_enrollment.student.useTransaction(trx).save()

      await trx.commit();

      return ctx.response.status(200).json({
        message: 'Student enrollment status updated to completed',
        student_enrollment: student_enrollment,
      })

    } catch (error) {
      console.log('error occured while updating student enrollment status to completed', error)
      await trx.rollback()
      return ctx.response.status(500).json({
        success: false,
        message: 'Error occurred while updating student enrollment status',
      })
    }

  }


  /**
   * Fetch students eligible for promotion
   */
  public async getStudentsForPromotion(ctx: HttpContext) {
    try {
      const getSchema = schema.create({
        academic_session_id: schema.number(),
        division_id: schema.number.optional(),
        student_id: schema.number.optional(),
        status: schema.enum.optional(['drop', 'promoted', 'failed'] as const),
        search: schema.string.optional(),
        page: schema.number.optional(),
        limit: schema.number.optional(),
      })

      const payload = await ctx.request.validate({ schema: getSchema })

      const page = payload.page || 1
      const limit = payload.limit || 50

      const school_id = ctx.auth.user?.school_id
      const division = await Division.query()
        .if(payload.division_id !== undefined, (query) => query.where('id', payload.division_id!))
        .first()

      if (payload.division_id && !division) {
        return ctx.response.badRequest({ success: false, message: 'Division not found' })
      }
      const student = await Students.query()
        .if(payload.student_id !== undefined, (query) => query.where('id', payload.student_id!))
        .if(school_id !== undefined, (query) => query.where('school_id', school_id!))
        .first()

      if (payload.student_id && !student) {
        return ctx.response.badRequest({ success: false, message: 'Student not found' })
      }
      if (payload.status && !['drop', 'promoted', 'failed'].includes(payload.status)) {
        return ctx.response.badRequest({ success: false, message: 'Invalid status' })
      }
      const query = StudentEnrollments.query()
        .where('academic_year', payload.academic_session_id)
        .if(payload.status, (q) => q.where('status', payload.status!))
        .preload('student', (query) => {
          query.preload('fees_status')
        })
        .preload('division', (query) => {
          query.preload('class')
        })

      if (payload.division_id) {
        query.andWhere('division_id', payload.division_id)
      }

      if (payload.student_id) {
        query.andWhere('student_id', payload.student_id)
      }

      if (payload.search) {
        const term = `%${payload.search}%`
        query.whereHas('student', (subQuery) => {
          subQuery.whereILike('name', term).orWhereILike('roll_number', term)
        })
      }

      const students = await query.paginate(page, limit)

      return ctx.response.ok({
        success: true,
        data: {
          students: students.all(),
          pagination: students.getMeta(),
        },
      })
    } catch (error) {
      console.log('error occured while fetching student for promotion', error)
      return ctx.response.internalServerError({ success: false, message: error.message })
    }
  }

  /**
   * Promote a single student
   */
  public async promote({ request, response, auth }: HttpContext) {
    const promotionSchema = schema.create({
      student_id: schema.number(),
      source_academic_session_id: schema.number(),
      source_division_id: schema.number(),
      target_academic_session_id: schema.number(),
      target_division_id: schema.number(),
      status: schema.enum(['promoted', 'failed'] as const),
      remarks: schema.string.optional(),
    })

    const payload = await request.validate({ schema: promotionSchema })
    const trx = await db.transaction()

    const school_id = auth.user?.school_id
    // validate the student id in the student enrollment table
    const student = await Students.query()
      .where('id', payload.student_id)
      .if(school_id !== undefined, (query) => query.where('school_id', school_id!))
      .first()

    if (!student) {
      return response.badRequest({ message: 'Student not found or inactive' })
    }
    try {
      const [sourceDivision, targetDivision] = await Promise.all([
        Division.query().where('id', payload.source_division_id).first(),
        Division.query().where('id', payload.target_division_id).first(),
      ])

      if (!sourceDivision) return response.badRequest({ message: 'Source division not found' })
      if (!targetDivision) return response.badRequest({ message: 'Target division not found' })

      const currentEnrollment = await StudentEnrollments.query({ client: trx })
        .where('student_id', payload.student_id)
        .andWhere('academic_year', payload.source_academic_session_id)
        .andWhere('status', 'pursuing')
        .first()

      if (!currentEnrollment) {
        return response.badRequest({ message: 'Student not enrolled in source session' })
      }

      const alreadyEnrolled = await StudentEnrollments.query({ client: trx })
        .where('student_id', payload.student_id)
        .andWhere('academic_year', payload.target_academic_session_id)
        .first()

      if (alreadyEnrolled) {
        return response.badRequest({ message: 'Already enrolled in target session' })
      }

      if (currentEnrollment) {
        currentEnrollment.status = payload.status === 'promoted' ? 'permoted' : payload.status
      } else {
        throw new Error('Current enrollment not found')
      }
      currentEnrollment.remarks = payload.remarks || ''
      currentEnrollment.promoted_by = auth.user!.id
      await currentEnrollment.save()

      const newEnrollment = new StudentEnrollments()
      newEnrollment.fill({
        student_id: payload.student_id,
        division_id: payload.target_division_id,
        academic_year: payload.target_academic_session_id,
        quota_id: currentEnrollment.quota_id,
        status: 'pursuing',
        remarks: payload.remarks || '',
        is_new_admission: false,
      })

      await newEnrollment.useTransaction(trx).save()
      await trx.commit()

      return response.ok({ success: true, data: newEnrollment })
    } catch (error) {
      console.log('error occured while promoting student', error)
      await trx.rollback()
      return response.badRequest({ message: error.message })
    }
  }

  /**
   * Bulk promotion of students
   */
  public async bulkPromote({ request, response, auth }: HttpContext) {
    const bulkSchema = schema.create({
      student_ids: schema.array().members(schema.number()),
      source_academic_session_id: schema.number(),
      target_academic_session_id: schema.number(),
      target_division_id: schema.number(),
      status: schema.enum(['promoted', 'failed'] as const),
      remarks: schema.string.optional(),
    })

    const payload = await request.validate({ schema: bulkSchema })
    const school_id = auth.user?.school_id
    const trx = await db.transaction()

    const results: { success: number[]; failed: { student_id: number; reason: string }[] } = {
      success: [],
      failed: [],
    }

    try {
      const targetDivision = await Division.find(payload.target_division_id)

      if (!targetDivision) {
        return response.badRequest({ message: 'Target division not found' })
      }

      for (const student_id of payload.student_ids) {
        try {
          const student = await Students.query()
            .where('id', student_id)
            .if(school_id !== undefined, (q) => q.where('school_id', school_id!))
            .first()

          if (!student) {
            results.failed.push({
              student_id,
              reason: 'Student not found or does not belong to this school',
            })
            continue
          }

          const currentEnrollment = await StudentEnrollments.query({ client: trx })
            .where('student_id', student_id)
            .andWhere('academic_year', payload.source_academic_session_id)
            .andWhere('status', 'pursuing')
            .first()

          if (!currentEnrollment) {
            results.failed.push({
              student_id,
              reason: 'Student not enrolled in source academic session',
            })
            continue
          }

          const alreadyEnrolled = await StudentEnrollments.query({ client: trx })
            .where('student_id', student_id)
            .andWhere('academic_year', payload.target_academic_session_id)
            .first()

          if (alreadyEnrolled) {
            results.failed.push({
              student_id,
              reason: 'Already enrolled in target academic session',
            })
            continue
          }

          // Update current enrollment
          currentEnrollment.status = payload.status === 'promoted' ? 'permoted' : payload.status
          currentEnrollment.remarks = payload.remarks || ''
          currentEnrollment.promoted_by = auth.user!.id
          await currentEnrollment.save()

          // Create new enrollment
          const newEnrollment = new StudentEnrollments()
          newEnrollment.fill({
            student_id,
            division_id: payload.target_division_id,
            academic_year: payload.target_academic_session_id,
            quota_id: currentEnrollment.quota_id,
            status: 'pursuing',
            remarks: payload.remarks || '',
            is_new_admission: false,
            promoted_by: auth.user?.id,
          })

          await newEnrollment.useTransaction(trx).save()
          results.success.push(student_id)
        } catch (err) {
          console.error(`Promotion failed for student_id ${student_id}:`, err.message)
          results.failed.push({ student_id, reason: 'Unexpected error occurred during promotion' })
        }
      }

      await trx.commit()
      return response.ok({ success: true, data: results })
    } catch (err) {
      await trx.rollback()
      console.error('Bulk promotion failed:', err)
      return response.internalServerError({
        success: false,
        message: 'Bulk promotion failed. Please try again.',
      })
    }
  }

  /**
   * Get promotion history (optional filter by session)
   */
  public async getPromotionHistory({ request, response }: HttpContext) {
    const sessionId = request.param('academic_session_id')
    console.log('sessionId for student ', sessionId)

    // Define the statuses to filter for
    const validStatuses = ['promoted', 'failed', 'drop', 'transfer']

    try {
      const query = StudentEnrollments.query()
        .select(
          'student_id',
          'academic_year',
          'division_id',
          'status',
          'remarks',
          'promoted_at'
        )
        .whereIn('status', validStatuses) // Filter by statuses
        .orderBy('promoted_at', 'desc')

      if (sessionId) {
        query.where('academic_year', sessionId)
      }

      const data = await query
        .preload('student', (query) => {
          query.preload('fees_status')
        })
        .preload('division')

      return response.ok({ success: true, data })
    } catch (error) {
      return response.internalServerError({ success: false, message: error.message })
    }
  }

  /**
   * Hold back a student in the same class (division) but in another academic session
   */
  public async holdBackStudent({ request, response, auth }: HttpContext) {
    const holdBackSchema = schema.create({
      student_id: schema.number(),
      source_academic_session_id: schema.number(),
      target_academic_session_id: schema.number(),
      remarks: schema.string.optional(),
    })

    const payload = await request.validate({ schema: holdBackSchema })
    const trx = await db.transaction()

    try {
      const schoolId = auth.user?.school_id

      // Validate student
      const student = await Students.query()
        .where('id', payload.student_id)
        .if(schoolId !== undefined, (q) => q.where('school_id', schoolId!))
        .first()

      if (!student) {
        return response.badRequest({
          message: 'Student not found or does not belong to this school',
        })
      }

      // Validate sessions (removed since AcademicSession is deprecated)

      // Get current enrollment
      const currentEnrollment = await StudentEnrollments.query({ client: trx })
        .where('student_id', payload.student_id)
        .andWhere('academic_year', payload.source_academic_session_id)
        .andWhere('status', 'pursuing')
        .first()

      if (!currentEnrollment) {
        return response.badRequest({ message: 'Student not enrolled in source session' })
      }

      // Prevent duplicate enrollment in target session
      const alreadyEnrolled = await StudentEnrollments.query({ client: trx })
        .where('student_id', payload.student_id)
        .andWhere('academic_year', payload.target_academic_session_id)
        .first()

      if (alreadyEnrolled) {
        return response.badRequest({ message: 'Already enrolled in target session' })
      }

      // Mark as failed in source session
      currentEnrollment.status = 'failed'
      currentEnrollment.remarks = payload.remarks || ''
      currentEnrollment.promoted_by = auth.user!.id
      await currentEnrollment.save()

      // Create new enrollment in the same division but new session
      const newEnrollment = new StudentEnrollments()
      newEnrollment.fill({
        student_id: payload.student_id,
        division_id: currentEnrollment.division_id,
        academic_year: payload.target_academic_session_id,
        quota_id: currentEnrollment.quota_id,
        status: 'pursuing',
        remarks: payload.remarks || '',
        is_new_admission: false,
        promoted_by: auth.user?.id,
      })

      await newEnrollment.useTransaction(trx).save()
      await trx.commit()

      return response.ok({
        success: true,
        message: 'Student held back successfully in new academic session',
        data: newEnrollment,
      })
    } catch (error) {
      await trx.rollback()
      console.error('Error holding back student:', error)
      return response.internalServerError({
        success: false,
        message: 'Failed to hold back student',
      })
    }
  }

  /**
   * Bulk hold back students in the same class (division) to another academic session
   */
  public async bulkHoldBackStudents({ request, response, auth }: HttpContext) {
    const bulkSchema = schema.create({
      student_ids: schema.array().members(schema.number()),
      source_academic_session_id: schema.number(),
      target_academic_session_id: schema.number(),
      remarks: schema.string.optional(),
    })

    const payload = await request.validate({ schema: bulkSchema })
    const trx = await db.transaction()
    const schoolId = auth.user?.school_id

    try {
      // Validate target session (removed since AcademicSession is deprecated)

      // Validate students
      const students = await Students.query({ client: trx })
        .whereIn('id', payload.student_ids)
        .if(schoolId !== undefined, (q) => q.where('school_id', schoolId!))

      const validStudentIds = students.map((s) => s.id)

      // Get current enrollments
      const currentEnrollments = await StudentEnrollments.query({ client: trx })
        .whereIn('student_id', validStudentIds)
        .andWhere('academic_year', payload.source_academic_session_id)
        .andWhere('status', 'pursuing')

      const currentEnrollmentMap = new Map(currentEnrollments.map((en) => [en.student_id, en]))

      // Check for already enrolled in target session
      const alreadyEnrolled = await StudentEnrollments.query({ client: trx })
        .whereIn('student_id', validStudentIds)
        .andWhere('academic_year', payload.target_academic_session_id)

      const alreadyEnrolledIds = new Set(alreadyEnrolled.map((e) => e.student_id))

      // Filter only eligible students
      const eligibleIds = validStudentIds.filter(
        (id) => currentEnrollmentMap.has(id) && !alreadyEnrolledIds.has(id)
      )

      // Update all current enrollments in batch
      await Promise.all(
        eligibleIds.map((id) => {
          const enrollment = currentEnrollmentMap.get(id)!
          enrollment.status = 'failed'
          enrollment.remarks = payload.remarks || ''
          enrollment.promoted_by = auth.user?.id || null
          return enrollment.useTransaction(trx).save()
        })
      )

      // Prepare new enrollments
      const newEnrollments = eligibleIds.map((id) => {
        const enrollment = currentEnrollmentMap.get(id)!
        return {
          student_id: id,
          division_id: enrollment.division_id,
          academic_year: payload.target_academic_session_id,
          quota_id: enrollment.quota_id,
          status: 'pursuing',
          remarks: payload.remarks || '',
          is_new_admission: false,
          promoted_by: auth.user?.id || null,
          created_at: new Date(),
          updated_at: new Date(),
        }
      })

      if (newEnrollments.length > 0) {
        await db
          .insertQuery()
          .table('student_enrollments')
          .useTransaction(trx)
          .insert(newEnrollments)
      }

      await trx.commit()

      return response.ok({
        success: true,
        data: {
          success: eligibleIds,
          failed: payload.student_ids
            .filter((id) => !eligibleIds.includes(id))
            .map((id) => ({
              student_id: id,
              reason: alreadyEnrolledIds.has(id)
                ? 'Already enrolled in target session'
                : 'No valid current enrollment or not found',
            })),
        },
      })
    } catch (error) {
      await trx.rollback()
      console.error('Bulk hold back failed:', error)
      return response.internalServerError({
        success: false,
        message: 'Bulk hold back failed. Please try again.',
      })
    }
  }
}
