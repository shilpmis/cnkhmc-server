import type { HttpContext } from '@adonisjs/core/http'
import AdmissionInquiry from '#models/Inquiries'
import Students from '#models/Students'
import StudentEnrollments from '#models/StudentEnrollments'
import Quota from '#models/Quota'
import db from '@adonisjs/lucid/services/db'
import { CreateValidatorForInquiry, UpdateValidatorForInquiry } from '#validators/Inquiry'
import AcademicSession from '#models/AcademicSession'
import ClassSeatAvailability from '#models/ClassSeatAvailability'
import { createStudentValidatorForOnBoarding } from '#validators/Students'
import QuotaAllocation from '#models/QuotaAllocation'
import StudentMeta from '#models/StudentMeta'
export default class InquiriesController {
  /**
   * Fetch paginated admission inquiries for the logged-in user's school
   */
  async listAllInquiries(ctx: HttpContext) {

    const school_id = ctx.auth.user!.school_id
    const page = ctx.request.input('page', 1)
    const status = ctx.request.input('status', 'All')
    const class_id = ctx.request.input('class', 'All')
    const search_term = ctx.request.input('search', undefined)
    const academic_session_id = ctx.request.input('academic_session', null)
    if (!academic_session_id) {
      return ctx.response.status(400).json({
        message: 'Academic session ID is required',
      })
    }

    const inquiries = db.query()
      .from('admission_inquiries as ai')
      .select(['ai.*' , 'se.student_id', 'se.division_id'])
      .leftJoin('student_enrollments as se', 'se.id', 'ai.student_enrollments_id')
      .where('school_id', school_id as number)
      .andWhere('ai.academic_session_id', academic_session_id)

    if (status !== 'All' && status !== 'all' && status !== undefined) {
      console.log('Filtering by status:', status)
      inquiries.where('ai.status', status)
    }

    if (class_id !== 'All' && class_id !== 'all' && class_id !== undefined) {
      console.log('Filtering by class ID:', class_id)
      inquiries.where('ai.inquiry_for_class', class_id)
    }

    if (search_term !== undefined && search_term !== '' && search_term !== "undefined") {
      console.log('Filtering by search term:', search_term)
      inquiries.whereLike('ai.first_name', `%${search_term}%`)
        .orWhereLike('ai.middle_name', `%${search_term}%`)
        .orWhereLike('ai.last_name', `%${search_term}%`)
        .orWhereLike('ai.father_name', `%${search_term}%`)
        .orWhereLike('ai.primary_mobile', `%${search_term}%`)
        .orWhereLike('ai.previous_school', `%${search_term}%`)
    }

    inquiries.orderBy('created_at', 'desc')
    let response = await inquiries.paginate(page, 6)


    return ctx.response.status(200).json(response)
  }

  /**
   * Add a new admission inquiry
   */
  async addInquiryForClass(ctx: HttpContext) {
    try {
      // Validate the payload using the CreateValidatorForInquiry validator
      const payload = await CreateValidatorForInquiry.validate(ctx.request.all())

      let academicSession = await AcademicSession.query()
        .where('id', payload.academic_session_id as number)
        .andWhere('school_id', ctx.auth.user!.school_id as number)
        .first()

      if (!academicSession) {
        return ctx.response.status(400).json({
          message: 'Current academic session not found',
        })
      }

      let classSeatAvailability = await ClassSeatAvailability.query()
        .where('class_id', payload.inquiry_for_class)
        .andWhere('academic_session_id', payload.academic_session_id as number)
        .first()

      if (!classSeatAvailability) {
        return ctx.response.status(400).json({
          message:
            'Seat availability is not yet define for this class by admin for selected academic session',
        })
      }

      if (payload.applying_for_quota) {
        if (payload.quota_type === null) {
          return ctx.response.status(400).json({
            message: 'Quota type is required when applying for a quota',
          })
        }

        const quota = await Quota.query()
          .where('id', payload.quota_type)
          .andWhere('academic_session_id', payload.academic_session_id as number)
          .andWhere('school_id', ctx.auth.user!.school_id as number)
          .first()

        if (!quota) {
          return ctx.response.status(400).json({
            message: 'Quota not found',
          })
        }
      }

      if (!payload.applying_for_quota && payload.quota_type) {
        return ctx.response.status(400).json({
          message: 'Quota type should be null when not applying for a quota',
        })
      }

      const inquiry = await AdmissionInquiry.create({
        ...payload,
        created_by: ctx.auth.user!.id,
        school_id: ctx.auth.user!.school_id as number as number,
        student_enrollments_id: null,
        // class_applying_for : payload.inquiry_for_class,
      })

      return ctx.response.status(201).json({
        message: 'Admission inquiry added successfully',
        inquiry,
      })
    } catch (error) {
      console.log('Error adding inquiry:', error)
      return ctx.response.status(400).json({
        message: 'Error adding inquiry',
        error: error,
      })
    }
  }

  /**
   * Update an admission inquiry
   */
  async updateInquiry(ctx: HttpContext) {
    const payload = await UpdateValidatorForInquiry.validate(ctx.request.all())

    const created_inquiry = await AdmissionInquiry.query()
      .where('id', ctx.params.id)
      .andWhere('school_id', ctx.auth.user!.school_id as number)
      .first()

    if (!created_inquiry) {
      return ctx.response.status(404).json({
        message: 'Inquiry not found',
      })
    }

    if (payload.inquiry_for_class) {
      let classSeatAvailability = await ClassSeatAvailability.query()
        .where('class_id', payload.inquiry_for_class)
        .andWhere('academic_session_id', created_inquiry.academic_session_id as number)
        .first()

      if (!classSeatAvailability) {
        return ctx.response.status(400).json({
          message:
            'Seat availability is not yet define for this class by admin for selected academic session',
        })
      }
    }

    if (payload.status && created_inquiry.is_converted_to_student) {
      return ctx.response.status(400).json({
        message: 'This inquiry has already been converted into a student.',
      })
    }

    created_inquiry.merge(payload)
    await created_inquiry.save()

    return ctx.response.status(200).json({
      message: 'Admission inquiry updated successfully',
      created_inquiry,
    })
  }

  /**
   * Get a single admission inquiry by ID
   */
  async getInquiryById(ctx: HttpContext) {
    const inquiry = await AdmissionInquiry.findOrFail(ctx.params.id)
    return ctx.response.status(200).json(inquiry)
  }

  /**
   * Delete an admission inquiry
   */
  // async destroy(ctx: HttpContext) {
  //   const inquiry = await AdmissionInquiry.findOrFail(ctx.params.id)
  //   await inquiry.delete()

  //   return ctx.response.status(200).json({
  //     message: 'Admission inquiry deleted successfully',
  //   })
  // }

  /**
   * Convert an Admission Inquiry into a Student & Student Enrollment
   */
  public async convertInquiryToStudent(ctx: HttpContext) {
    let school_id = ctx.auth.user!.school_id;
    let inquiry_id = ctx.params.inquiry_id;

    const payload = await createStudentValidatorForOnBoarding.validate(ctx.request.body());

    const trx = await db.transaction()

    try {
      // Fetch Inquiry Data
      const inquiry = await AdmissionInquiry.query({ client: trx })
        .where('id', inquiry_id)
        .andWhere('school_id', school_id as number)
        .andWhere('academic_session_id', payload.academic_session_id as number)
        .forUpdate()
        .first()

      if (!inquiry) {
        await trx.rollback()
        return ctx.response.notFound({
          error: 'Inquiry not found',
        })
      }

      if (inquiry.is_converted_to_student) {
        await trx.rollback()
        return ctx.response.badRequest({
          error: 'This inquiry has already been converted into a student.',
        })
      }

      // Generate Unique Admission Number & Enrollment Code
      const enrollmentCode = `EN-${inquiry.school_id}-${Date.now()}`

      // Create Student Record
      const student = await Students.create(
        {
          school_id: school_id as number,
          enrollment_code: enrollmentCode,
          admission_number: inquiry_id,
          gr_no: null,
          first_name: payload.first_name,
          middle_name: payload.middle_name ?? null,
          last_name: payload.last_name,
          first_name_in_guj: null,
          middle_name_in_guj: null,
          last_name_in_guj: null,
          gender: payload.gender,
          birth_date: payload.birth_date,
          primary_mobile: payload.primary_mobile,
          father_name: payload.father_name ?? null,
          father_name_in_guj: null,
          mother_name: null,
          mother_name_in_guj: null,
          roll_number: null,
          aadhar_no: null,
          is_active: true,
        },
        { client: trx }
      )

      await StudentMeta.create(
        {
          student_id: student.id,
        },
        { client: trx }
      )

      // Determine Quota ID (if applicable)
      let quotaId = inquiry.applying_for_quota ? inquiry.quota_type : null

      // Check if Quota is Available
      if (quotaId) {
        const quota_allocation = await QuotaAllocation.query({ client: trx })
          .where('quota_id', quotaId)
          .andWhere('class_id', inquiry.inquiry_for_class)
          .andWhere('academic_session_id', inquiry.academic_session_id as number)
          .forUpdate()
          .first()

        if (!quota_allocation) {
          await trx.rollback()
          return ctx.response.badRequest({
            error: 'Quota Allocation for inquiry class is not yet defined by admin .',
          })
        }

        const clasSeatAvailability = await ClassSeatAvailability.query({ client: trx })
          .where('class_id', inquiry.inquiry_for_class)
          .andWhere('academic_session_id', inquiry.academic_session_id as number)
          .forUpdate()
          .first()

        if (!clasSeatAvailability) {
          await trx.rollback()
          return ctx.response.badRequest({
            error: 'Class Seat Availability for inquiry class is not yet defined by admin .',
          })
        }

        quota_allocation.filled_seats += 1;
        await quota_allocation.save()

        clasSeatAvailability.merge({
          filled_seats: (clasSeatAvailability.filled_seats += 1),
          quota_allocated_seats: (clasSeatAvailability.quota_allocated_seats -= 1),
          remaining_seats: (clasSeatAvailability.remaining_seats -= 1),
        })
        await clasSeatAvailability.save()
      }

      // Create Student Enrollment Record
      let student_enrollments = await StudentEnrollments.create(
        {
          student_id: student.id,
          division_id: payload.division_id,
          academic_session_id: inquiry.academic_session_id as number,
          quota_id: quotaId ?? null,
          status: 'onboarded',
          remarks: 'Converted from Inquiry',
          is_new_admission: true,
        },
        { client: trx }
      )

      // Mark Inquiry as Converted
      inquiry.is_converted_to_student = true
      inquiry.student_enrollments_id = student_enrollments.id
      inquiry.status = 'enrolled'
      await inquiry.save()

      // Commit Transaction
      await trx.commit()

      return ctx.response.status(201).json({
        message: 'Inquiry successfully converted into student record.',
        student,
      })
    } catch (error) {
      console.log('Error converting inquiry to student:', error)
      await trx.rollback()
      return ctx.response.internalServerError({
        error: 'Error processing inquiry conversion',
        details: error.message,
      })
    }
  }

}
