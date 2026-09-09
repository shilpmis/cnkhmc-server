import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import Staff from '#models/Staff'
import { CreateValidatorForStaff, UpdateValidatorForStaff, CreateValidatorForBulkUpload } from '#validators/Staff'
import StaffMaster from '#models/StaffMaster'
import db from '@adonisjs/lucid/services/db'
import StaffEnrollment from '#models/StaffEnrollment'


import path from 'node:path'
import app from '@adonisjs/core/services/app'
import { parseAndReturnJSON } from '../../utility/parseCsv.js'
import ExcelJS from 'exceljs'
import User from '#models/User'

export default class StaffController {
  /**
   * List staff with optional filters and pagination
   */
  async indexStaff(ctx: HttpContext) {
    try {
      const type = ctx.request.input('type', 'all')
      const page = ctx.request.input('page', 1)
      const perPage = 10
      const alldata = ctx.request.input('alldata', false)
      const school_id = ctx.auth.user!.school_id!
      const status_filter = ctx.request.input('status_filter', 'current') // 'current' | 'resigned_retired' | 'all'

      let staffQuery = db.query()
        .from ('staff as staff')
        .where('staff.school_id', school_id)

      // Apply status filtering
      if (status_filter === 'current') {
        staffQuery.where((q) => {
          q.whereNot('staff.employment_status', 'Resigned')
            .whereNull('staff.resignation_date')
            .whereNull('staff.retirement_date')
        })
      } else if (status_filter === 'resigned_retired') {
        staffQuery.where((q) => {
          q.where('staff.employment_status', 'Resigned')
            .orWhereNotNull('staff.resignation_date')
            .orWhereNotNull('staff.retirement_date')
        })
      }

      // Join and filter based on type
      if (type === 'teaching') {
        staffQuery
          .leftJoin('staff_enrollments as se', 'staff.id', 'se.staff_id')
          .leftJoin('staff_role_master as sm', 'staff.staff_role_id', 'sm.id')
          .where('sm.is_teaching_role', 1)
          .select([
            'staff.*',
            'se.id as staff_enrollment_id',
            'se.status',
            'se.academic_year as enrollment_academic_year',
            'sm.role',
            'sm.working_hours',
          ])
      } else if (type === 'hospital') {
        staffQuery
          .leftJoin('staff_enrollments as se', 'staff.id', 'se.staff_id')
          .leftJoin('staff_role_master as sm', 'staff.staff_role_id', 'sm.id')
          .where('staff.staff_type', 'Hospital Staff')
          .select([
            'staff.*',
            'sm.role as role',
            'se.id as staff_enrollment_id',
            'se.status',
            'se.academic_year as enrollment_academic_year',
            'sm.working_hours as working_hours',
          ])
      } else if (type === 'other') {
        staffQuery
          .leftJoin('staff_enrollments as se', 'staff.id', 'se.staff_id')
          .leftJoin('staff_role_master as sm', 'staff.staff_role_id', 'sm.id')
          .where('sm.is_teaching_role', 0)
          .where((q) => {
            q.whereNull('staff.staff_type')
              .orWhereNot('staff.staff_type', 'Hospital Staff')
          })
          .select([
            'staff.*',
            'sm.role as role',
            'se.id as staff_enrollment_id',
            'se.status',
            'se.academic_year as enrollment_academic_year',
            'sm.working_hours as working_hours',
          ])
      } else if (type === 'non-activeuser') {
        const onBoardedUser = await User.query()
          .where('school_id', school_id)
          .andWhere('role_id', 6)
          .andWhereNotNull('staff_id')

        const onboardedStaffIds = onBoardedUser.map((user) => Number(user.staff_id))

        staffQuery
          .leftJoin('staff_enrollments as se', 'staff.id', 'se.staff_id')
          .leftJoin('staff_role_master as sm', 'staff.staff_role_id', 'sm.id')
          .whereNotIn('staff.id', onboardedStaffIds)
          .select([
            'staff.*',
            'se.id as staff_enrollment_id',
            'se.status',
            'se.academic_year as enrollment_academic_year',
            'sm.role as role',
            'sm.working_hours',
          ])
      } else {
        staffQuery
          .leftJoin('staff_enrollments as se', 'staff.id', 'se.staff_id')
          .leftJoin('staff_role_master as sm', 'staff.staff_role_id', 'sm.id')
          .select([
            'staff.*',
            'sm.role as role',
            'se.id as staff_enrollment_id',
            'se.status',
            'se.academic_year as enrollment_academic_year',
            'sm.working_hours as working_hours',
          ])
      }

      let staff
      if (alldata) {
        staff = await staffQuery
      } else {
        staff = await staffQuery.paginate(page, perPage)
      }

      // Fallback: If empty, return base staff list for school
      if (alldata && Array.isArray(staff) && staff.length === 0) {
        staff = await Staff.query().where('school_id', school_id)
      }

      return ctx.response.status(200).json(staff)
    } catch (error) {
      console.error("Error in indexStaff:", error)
      try {
        const school_id = ctx.auth.user?.school_id || 1
        const fallbackStaff = await Staff.query().where('school_id', school_id)
        return ctx.response.status(200).json(fallbackStaff)
      } catch (fbError) {
        return ctx.response.status(200).json([])
      }
    }
  }

  /**
   * Find staff by ID
   */
  public async findStaffById(ctx: HttpContext) {
    try {
      const staffId = ctx.params.id;
      const school_id = ctx.auth.user!.school_id!;

      // Always preload all relationships for complete data
      const staffQuery = Staff.query()
        .where('id', staffId)
        .where('school_id', school_id)
        .preload('role_type')  // Load staff role details
        .preload('assigend_classes', (query) => {
          return query.preload('divisions', (divisionQuery) => {
            divisionQuery.preload('class')
          })
        });

      const staff = await staffQuery.first();

      if (!staff) {
        return ctx.response.notFound({ message: 'Staff not found' });
      }

      return ctx.response.ok(staff);
    } catch (error) {
      console.error('Error fetching staff:', error);
      return ctx.response.internalServerError({ message: 'Internal server error' });
    }
  }

  public async destroyStaff(ctx: HttpContext) {
    const trx = await db.transaction()
    try {
      const staffId = ctx.params.staff_id
      const school_id = ctx.auth.user!.school_id!

      const staff = await Staff.query({ client: trx })
        .where('id', staffId)
        .where('school_id', school_id)
        .first()

      if (!staff) {
        await trx.rollback()
        return ctx.response.notFound({ message: 'Staff member not found.' })
      }

      // 1. Get staff enrollment IDs
      const enrollments = await db
        .from('staff_enrollments')
        .useTransaction(trx)
        .where('staff_id', staffId)
        .select('id')
      const enrollmentIds = enrollments.map((e) => e.id)

      if (enrollmentIds.length > 0) {
        // 1a. Unlink staff enrollment from periods_config
        await db
          .from('periods_config')
          .useTransaction(trx)
          .whereIn('staff_enrollment_id', enrollmentIds)
          .update({ staff_enrollment_id: null })

        // 1b. Delete subjects_division_staff_masters
        await db
          .from('subjects_division_staff_masters')
          .useTransaction(trx)
          .whereIn('staff_enrollment_id', enrollmentIds)
          .delete()

        // 1c. Delete staff_salary_templates
        await db
          .from('staff_salary_templates')
          .useTransaction(trx)
          .whereIn('staff_enrollments_id', enrollmentIds)
          .delete()

        // 1d. Delete satff_payrun_templates
        await db
          .from('satff_payrun_templates')
          .useTransaction(trx)
          .whereIn('staff_enrollments_id', enrollmentIds)
          .delete()

        // 1e. Delete daily_diaries
        await db
          .from('daily_diaries')
          .useTransaction(trx)
          .whereIn('staff_enrollment_id', enrollmentIds)
          .delete()

        // 1f. Delete staff_enrollments
        await db
          .from('staff_enrollments')
          .useTransaction(trx)
          .where('staff_id', staffId)
          .delete()
      }

      // 2. Clean up references to staff_id / teacher_id

      // 2a. class_teacher_masters
      await db
        .from('class_teacher_masters')
        .useTransaction(trx)
        .where('staff_id', staffId)
        .delete()

      // 2b. staff_leave_applications and leave_logs
      const apps = await db
        .from('staff_leave_applications')
        .useTransaction(trx)
        .where('staff_id', staffId)
        .select('id')
      const appIds = apps.map((a) => a.id)
      if (appIds.length > 0) {
        await db
          .from('leave_logs')
          .useTransaction(trx)
          .whereIn('leave_application_id', appIds)
          .delete()
      }
      await db
        .from('staff_leave_applications')
        .useTransaction(trx)
        .where('staff_id', staffId)
        .delete()

      // 2c. staff_leave_balances
      await db
        .from('staff_leave_balances')
        .useTransaction(trx)
        .where('staff_id', staffId)
        .delete()

      // 2d. staff_attendance_masters
      await db
        .from('staff_attendance_masters')
        .useTransaction(trx)
        .where('staff_id', staffId)
        .delete()

      // 2e. attendance_masters
      await db
        .from('attendance_masters')
        .useTransaction(trx)
        .where('teacher_id', staffId)
        .update({ teacher_id: null })

      // 2f. lecture_attendance_masters and details
      const lectureMasters = await db
        .from('lecture_attendance_masters')
        .useTransaction(trx)
        .where('teacher_id', staffId)
        .select('id')
      const lectureMasterIds = lectureMasters.map((m) => m.id)
      if (lectureMasterIds.length > 0) {
        await db
          .from('lecture_attendance_details')
          .useTransaction(trx)
          .whereIn('lecture_attendance_master_id', lectureMasterIds)
          .delete()
        await db
          .from('lecture_attendance_masters')
          .useTransaction(trx)
          .where('teacher_id', staffId)
          .delete()
      }

      // 2g. staff_experiences
      await db
        .from('staff_experiences')
        .useTransaction(trx)
        .where('staff_id', staffId)
        .delete()

      // 2h. diary_log_permissions
      await db
        .from('diary_log_permissions')
        .useTransaction(trx)
        .where('staff_id', staffId)
        .delete()

      // 2i. comp_off_requests
      await db
        .from('comp_off_requests')
        .useTransaction(trx)
        .where('staff_id', staffId)
        .delete()

      // 2j. Clean up user account linked to this staff
      const users = await db
        .from('users')
        .useTransaction(trx)
        .where('staff_id', staffId)
        .select('id')
      const userIds = users.map((u) => u.id)
      if (userIds.length > 0) {
        await db
          .from('staff_attendance_edit_requests')
          .useTransaction(trx)
          .whereIn('requested_by', userIds)
          .orWhereIn('actioned_by', userIds)
          .delete()
        await db
          .from('leave_logs')
          .useTransaction(trx)
          .whereIn('performed_by', userIds)
          .delete()
        await db
          .from('chat_room_members')
          .useTransaction(trx)
          .whereIn('user_id', userIds)
          .delete()
        await db
          .from('chat_messages')
          .useTransaction(trx)
          .whereIn('sender_id', userIds)
          .delete()
        await db
          .from('users')
          .useTransaction(trx)
          .where('staff_id', staffId)
          .delete()
      }

      // 3. Delete staff member
      staff.useTransaction(trx)
      await staff.delete()

      await trx.commit()

      return ctx.response.ok({ message: 'Staff member deleted successfully.' })
    } catch (error) {
      await trx.rollback()
      console.error('Error deleting staff:', error)
      return ctx.response.internalServerError({ message: 'Failed to delete staff member.' })
    }
  }

  async createStaff(ctx: HttpContext) {
    const trx = await db.transaction()

    let academic_session_id = ctx.request.input('academic_sessions')
    let school_id = ctx.auth.user!.school_id!

    if (academic_session_id === 0) {
      return ctx.response.status(400).json({
        message: 'Academic session is required!',
      })
    }



    try {
      // Validate request data
      const payload = await CreateValidatorForStaff.validate(ctx.request.body())

      // Check whether this role is associated with this school
      const role = await StaffMaster.findBy('id', payload.staff_role_id)
      if (!role) {
        return ctx.response.status(404).json({
          message: 'This role is not available for your school! Please add a valid role.',
        })
      }

      if (role.school_id != ctx.auth.user?.school_id!) {
        return ctx.response.status(401).json({
          message: 'You are not authorized to perform this action!',
        })
      }

      const {
        remarks,
        teacher_code,
        ayush_registration_no,
        date_of_registration,
        university_approval_letter_no,
        university_approval_date,
        bank_branch_name,
        experience_years,
        ...staffPayload
      } = payload

      // Create staff within the transaction
      const staff = await Staff.create(
        {
          ...(staffPayload as any),
          ayush_teacher_code: teacher_code,
          registration_number: ayush_registration_no,
          registration_date: date_of_registration,
          uni_approval_number: university_approval_letter_no,
          uni_approval_date: university_approval_date,
          branch_details: bank_branch_name,
          school_id: school_id as number,
          is_teching_staff: role.is_teaching_role,
          is_teaching_role: role.is_teaching_role,
          is_active: (staffPayload.employment_status === 'Resigned' || !!payload.resignation_date) ? false : true,
          employee_code: 'EMP' + Math.floor(1000 + Math.random() * 9000),
          short_name: `${staffPayload.first_name} ${staffPayload.last_name}`,
          department: staffPayload.department || 'General',
          total_experience: experience_years || 0,
        },
        { client: trx }
      )

      // Insert data into the StaffEnrollment table within the transaction
      await StaffEnrollment.create(
        {
          academic_year: academic_session_id as number,
          staff_id: staff.id,
          school_id: school_id as number,
          status: 'Retained',
          remarks: remarks || '',
        },
        { client: trx }
      )

      // Commit the transaction
      await trx.commit()

      return ctx.response.status(201).json(staff.serialize())
    } catch (error: any) {
      // Rollback the transaction in case of error
      await trx.rollback()

      console.error('Error while creating staff:', error)

      if (error.messages) {
        console.error('Validation messages:', error.messages)
        return ctx.response.status(400).json({
          message: 'Validation failed',
          errors: error.messages,
        })
      }

      // Check for unique constraint violations
      if (error.code === 'ER_DUP_ENTRY') {
        return ctx.response.status(409).json({
          message: 'A staff member with this information (Email, Mobile, or Employee Code) already exists.',
        })
      }

      return ctx.response.status(500).json({
        message: 'Error creating staff',
        error: error.message || 'Internal server error',
      })
    }
  }

  async updateStaff(ctx: HttpContext) {
    const trx = await db.transaction()
    const staffId = ctx.params.staff_id
    const school_id = ctx.auth.user!.school_id!

    try {
      const payload = await UpdateValidatorForStaff.validate(ctx.request.all())
      const staff = await Staff.query().where('id', staffId).where('school_id', school_id).first()

      if (!staff) {
        await trx.rollback()
        return ctx.response.status(404).json({ message: 'Staff not found' })
      }

      const {
        remarks,
        teacher_code,
        ayush_registration_no,
        date_of_registration,
        university_approval_letter_no,
        university_approval_date,
        bank_branch_name,
        experience_years,
        ...staffPayload
      } = payload

      const isResigned = staffPayload.employment_status === 'Resigned' || !!payload.resignation_date
      staff.useTransaction(trx)
      await staff.merge({
        ...(staffPayload as any),
        ayush_teacher_code: teacher_code !== undefined ? teacher_code : staff.ayush_teacher_code,
        registration_number: ayush_registration_no !== undefined ? ayush_registration_no : staff.registration_number,
        registration_date: date_of_registration !== undefined ? date_of_registration : staff.registration_date,
        uni_approval_number: university_approval_letter_no !== undefined ? university_approval_letter_no : staff.uni_approval_number,
        uni_approval_date: university_approval_date !== undefined ? university_approval_date : staff.uni_approval_date,
        branch_details: bank_branch_name !== undefined ? bank_branch_name : staff.branch_details,
        total_experience: experience_years !== undefined ? experience_years : staff.total_experience,
        is_active: isResigned ? false : true,
      }).save()

      if (isResigned) {
        const user = await User.query().where('staff_id', staff.id).useTransaction(trx).first()
        if (user) {
          user.is_active = false
          await user.save()
        }
      }

      await trx.commit()
      return ctx.response.ok(staff.serialize())
    } catch (error: any) {
      await trx.rollback()
      console.error('Error updating staff:', error)

      if (error.messages) {
        return ctx.response.status(400).json({
          message: 'Validation failed',
          errors: error.messages,
        })
      }

      return ctx.response.status(500).json({
        message: 'Error updating staff',
        error: error.message || 'Internal server error',
      })
    }
  }

  private mapExcelHeadersToFields(data: any): any {
    const headerMap: Record<string, string> = {
      staffname: 'full_name',
      fullname: 'full_name',
      name: 'full_name',
      firstname: 'first_name',
      middlename: 'middle_name',
      lastname: 'last_name',
      title: 'title',
      shortname: 'short_name',
      dateofbirth: 'birth_date',
      dob: 'birth_date',
      gender: 'gender',
      maritalstatus: 'marital_status',
      maritialstatus: 'marital_status',
      child: 'child_count',
      children: 'child_count',
      childcount: 'child_count',
      currentaddress: 'address',
      address: 'address',
      permenantaddress: 'permanent_address',
      permanentaddress: 'permanent_address',
      pincodeno: 'postal_code',
      pincode: 'postal_code',
      postalcode: 'postal_code',
      pin: 'postal_code',
      mobilenumber: 'mobile_number',
      mobileno: 'mobile_number',
      mobile: 'mobile_number',
      phone: 'mobile_number',
      email: 'email',
      emailid: 'email',
      emergencycontactname: 'emergency_contact_name',
      emergencycontactnumber: 'emergency_contact_number',
      emergencycontactno: 'emergency_contact_number',
      category: 'category',
      religion: 'religion',
      religioninguj: 'religion_in_guj',
      caste: 'caste',
      casteinguj: 'caste_in_guj',
      minority: 'minority',
      nationality: 'nationality',
      bloodgroup: 'blood_group',
      designation: 'designation',
      role: 'role',
      staffrole: 'role',
      rolename: 'role',
      post: 'role',
      designationrole: 'role',
      typeofstaff: 'staff_type',
      stafftype: 'staff_type',
      staffcategory: 'staff_category',
      department: 'department',
      departmentname: 'department',
      natureofappointment: 'nature_of_appointment',
      designationonthedoa: 'designation_on_doa',
      dateofappointment: 'appointment_date',
      appointmentdate: 'appointment_date',
      dateofjoining: 'joining_date',
      joiningdate: 'joining_date',
      doj: 'joining_date',
      dateofpromotion: 'promotion_date',
      promotiondate: 'promotion_date',
      experiencetilldate: 'total_experience',
      totalexperience: 'total_experience',
      experienceyears: 'experience_years',
      experience: 'total_experience',
      qualification: 'qualification',
      qualificationcollege: 'qualification_college',
      qulificationcollege: 'qualification_college',
      qualificationuniversity: 'qualification_university',
      qulificationuniversity: 'qualification_university',
      dateofpassing: 'passing_date',
      passingdate: 'passing_date',
      subjectspecialization: 'subject_specialization',
      mdsubjectname: 'md_subject',
      mdsubject: 'md_subject',
      ugdegree: 'ug_degree',
      ugpassinguniversity: 'ug_passing_university',
      uguniversity: 'ug_passing_university',
      ugpassingyear: 'ug_passing_year',
      pgdegree: 'pg_degree',
      pgpassinguniversity: 'pg_passing_university',
      pguniversity: 'pg_passing_university',
      pgpassingyear: 'pg_passing_year',
      otherqualifications: 'other_degree',
      otherdegree: 'other_degree',
      registrationauthority: 'registration_authority',
      statecouncilregistrationno: 'state_council_reg_no',
      statecouncilregistrationnumber: 'state_council_reg_no',
      statecouncilregno: 'state_council_reg_no',
      registrationnumber: 'registration_number',
      registrationno: 'registration_number',
      regno: 'registration_number',
      ayushregistrationno: 'registration_number',
      registrationdate: 'registration_date',
      dateofregistration: 'registration_date',
      councilname: 'council_name',
      nameofcouncil: 'council_name',
      ayushteachercode: 'ayush_teacher_code',
      ayushteacherscode: 'ayush_teacher_code',
      teachercode: 'ayush_teacher_code',
      ayushid: 'ayush_id_no',
      ayushidno: 'ayush_id_no',
      aadharnumber: 'aadhar_no',
      aadharcard: 'aadhar_no',
      aadharno: 'aadhar_no',
      pancardnumber: 'pan_card_no',
      pancardno: 'pan_card_no',
      pancard: 'pan_card_no',
      panno: 'pan_card_no',
      voteridnumber: 'voter_id',
      voteridno: 'voter_id',
      voterid: 'voter_id',
      uniapprovaldate: 'university_approval_date',
      univapprovaldate: 'university_approval_date',
      universityapprovaldate: 'university_approval_date',
      uniapprovalnumber: 'university_approval_letter_no',
      uniapprovalno: 'university_approval_letter_no',
      univapprovalletterno: 'university_approval_letter_no',
      univapprovalno: 'university_approval_letter_no',
      universityapprovalletterno: 'university_approval_letter_no',
      universityapprovalno: 'university_approval_letter_no',
      uniappointmentdate: 'university_appointment_date',
      univappointmentdate: 'university_appointment_date',
      universityappointmentdate: 'university_appointment_date',
      uniappointmentletterno: 'university_appointment_letter_no',
      uniappointmentno: 'university_appointment_letter_no',
      univappointmentletterno: 'university_appointment_letter_no',
      univappointmentno: 'university_appointment_letter_no',
      universityappointmentletterno: 'university_appointment_letter_no',
      universityappointmentno: 'university_appointment_letter_no',
      areaofexpertise: 'area_of_expertise',
      drivinglicence: 'driving_licence',
      drivinglicense: 'driving_licence',
      drivinglicenceno: 'driving_licence',
      drivinglicenceexpirydate: 'driving_licence_expiry',
      drivinglicenseexpirydate: 'driving_licence_expiry',
      drivinglicensevalidity: 'driving_licence_expiry',
      epfacno: 'epf_no',
      epfno: 'epf_no',
      uanno: 'epf_uan_no',
      epfuanno: 'epf_uan_no',
      employeestatus: 'employment_status',
      employmentstatus: 'employment_status',
      bankaccountno: 'account_no',
      accountnumber: 'account_no',
      accountno: 'account_no',
      bankifsccode: 'IFSC_code',
      ifsccode: 'IFSC_code',
      ifsc: 'IFSC_code',
      bankname: 'bank_name',
      branchaddressnumberemail: 'branch_details',
      branchname: 'branch_details',
      branchdetails: 'branch_details',
      employeeid: 'employee_code',
      employeecode: 'employee_code',
      empid: 'employee_code',
      previesexperience: 'previous_experience',
      previousexperience: 'previous_experience',
    }

    const mappedData: any = {}
    for (const key of Object.keys(data)) {
      const originalKey = key.trim()
      const normalizedKey = originalKey.toLowerCase().replace(/[^a-z0-9]/g, '')
      const fieldName = headerMap[normalizedKey]

      if (fieldName) {
        mappedData[fieldName] = data[key]
      } else {
        const snakeKey = originalKey.toLowerCase().replace(/\s+/g, '_')
        mappedData[snakeKey] = data[key]
      }
    }

    // Helper to normalize dates from Excel or CSV
    const normalizeDate = (val: any) => {
      if (val === null || val === undefined) return null
      const strVal = String(val).trim()
      if (!strVal || strVal === '-' || strVal.toLowerCase() === 'n/a' || strVal === '0' || strVal.toLowerCase() === 'null') {
        return null
      }

      if (val instanceof Date) return DateTime.fromJSDate(val).toFormat('yyyy-MM-dd')

      if (typeof val === 'number') {
        // Excel serial date
        const date = new Date((val - 25569) * 86400 * 1000)
        if (!isNaN(date.getTime())) {
          return DateTime.fromJSDate(date).toFormat('yyyy-MM-dd')
        }
      }

      // Try multiple date string formats
      const formats = [
        'yyyy-MM-dd',
        'dd/MM/yyyy',
        'dd-MM-yyyy',
        'MM/dd/yyyy',
        'yyyy/MM/dd',
        'dd.MM.yyyy',
        'd/M/yyyy',
        'd-M-yyyy',
        'M/d/yyyy',
        'M-d-yyyy',
        'dd-MMM-yyyy',
        'd-MMM-yyyy',
        'dd-MMM-yy',
        'd-MMM-yy',
        'dd/MMM/yyyy',
        'd/MMM/yyyy',
        'dd/MMM/yy',
        'd/MMM/yy',
        'd/M/yy',
        'd-M-yy',
        'dd/MM/yy',
        'dd-MM-yy',
        'M/d/yy',
        'M-d-yy',
      ]
      for (const fmt of formats) {
        const parsed = DateTime.fromFormat(strVal, fmt)
        if (parsed.isValid) return parsed.toFormat('yyyy-MM-dd')
      }

      const parsedIso = DateTime.fromISO(strVal)
      if (parsedIso.isValid) return parsedIso.toFormat('yyyy-MM-dd')

      const jsDate = new Date(strVal)
      if (!isNaN(jsDate.getTime())) return DateTime.fromJSDate(jsDate).toFormat('yyyy-MM-dd')

      return null
    }

    // Apply date normalization
    const dateFields = [
      'birth_date',
      'appointment_date',
      'joining_date',
      'registration_date',
      'date_of_registration',
      'passing_date',
      'university_approval_date',
      'university_appointment_date',
      'driving_licence_expiry',
    ]
    dateFields.forEach((field) => {
      if (field in mappedData) {
        mappedData[field] = normalizeDate(mappedData[field])
      }
    })

    // Special handling for Name -> first_name, middle_name, last_name
    if (mappedData.full_name && !mappedData.first_name) {
      const parts = mappedData.full_name.trim().split(/\s+/)
      mappedData.first_name = parts[0]
      if (parts.length > 2) {
        mappedData.middle_name = parts.slice(1, -1).join(' ')
        mappedData.last_name = parts[parts.length - 1]
      } else if (parts.length === 2) {
        mappedData.last_name = parts[1]
      } else {
        mappedData.last_name = '.'
      }
    }

    // Normalize employment_status
    if (mappedData.employment_status) {
      const status = mappedData.employment_status.toString().toLowerCase()
      if (status.includes('active') || status.includes('permanent') || status.includes('full')) {
        mappedData.employment_status = 'Permanent'
      } else if (status.includes('probation') || status.includes('trial')) {
        mappedData.employment_status = 'Trial_Period'
      } else if (status.includes('contract')) {
        mappedData.employment_status = 'Contract_Based'
      } else if (status.includes('resign')) {
        mappedData.employment_status = 'Resigned'
      } else if (status.includes('notice')) {
        mappedData.employment_status = 'Notice_Period'
      } else {
        mappedData.employment_status = 'Permanent'
      }
    } else {
      mappedData.employment_status = 'Permanent'
    }

    // Normalize gender
    if (mappedData.gender) {
      const g = mappedData.gender.toString().toLowerCase()
      if (g.startsWith('m')) mappedData.gender = 'Male'
      else if (g.startsWith('f')) mappedData.gender = 'Female'
    }

    // Helper to normalize numbers from CSV strings
    const normalizeNumber = (val: any, fieldName = '') => {
      if (val === null || val === undefined) return null
      const strVal = String(val).trim()
      if (!strVal || strVal === '-' || strVal.toLowerCase() === 'n/a' || strVal.toLowerCase() === 'null') {
        return null
      }
      if (fieldName === 'child_count' && (strVal.includes(':') || strVal.includes(',') || /[a-zA-Z]/.test(strVal))) {
        const nums = strVal.match(/\d+/g)
        if (nums && nums.length > 0) {
          return nums.reduce((acc, curr) => acc + Number(curr), 0)
        }
      }

      if (fieldName === 'mobile_number' || fieldName === 'emergency_contact_number') {
        const match = strVal.match(/\b[6-9]\d{9}\b/) || strVal.match(/\b\d{10}\b/) || strVal.match(/\d{10,12}/)
        if (match) {
          const num = Number(match[0])
          return isNaN(num) ? null : num
        }
      }

      const digitsOnly = strVal.replace(/[^\d.]/g, '')
      if (!digitsOnly) return null
      const num = Number(digitsOnly)
      return isNaN(num) ? null : num
    }

    const numberFields = [
      'child_count',
      'total_experience',
      'experience_years',
      'epf_no',
      'epf_uan_no',
      'mobile_number',
      'postal_code',
      'aadhar_no',
      'account_no',
      'emergency_contact_number',
    ]

    numberFields.forEach((field) => {
      if (field in mappedData) {
        mappedData[field] = normalizeNumber(mappedData[field], field)
      }
    })

    // Convert empty string properties to null so Vine doesn't fail on minLength/email/enum rules
    Object.keys(mappedData).forEach((key) => {
      if (typeof mappedData[key] === 'string') {
        const trimmed = mappedData[key].trim()
        if (trimmed === '' || trimmed === '-' || trimmed.toLowerCase() === 'n/a' || trimmed.toLowerCase() === 'null') {
          mappedData[key] = null
        } else {
          mappedData[key] = trimmed
        }
      }
    })

    // Clean linebreaks and internal whitespace from identification numbers
    if (mappedData.pan_card_no && typeof mappedData.pan_card_no === 'string') {
      mappedData.pan_card_no = mappedData.pan_card_no.replace(/\s+/g, '').toUpperCase()
    }
    if (mappedData.IFSC_code && typeof mappedData.IFSC_code === 'string') {
      mappedData.IFSC_code = mappedData.IFSC_code.replace(/\s+/g, '').toUpperCase()
    }
    if (mappedData.voter_id && typeof mappedData.voter_id === 'string') {
      mappedData.voter_id = mappedData.voter_id.replace(/\s+/g, '').toUpperCase()
    }

    // Clean email addresses (remove internal spaces, convert to lowercase)
    if (mappedData.email && typeof mappedData.email === 'string') {
      const cleanEmail = mappedData.email.replace(/\s+/g, '').toLowerCase()
      if (cleanEmail.includes('@') && cleanEmail.length > 3) {
        mappedData.email = cleanEmail
      } else {
        mappedData.email = null
      }
    }

    // Ensure fallback defaults for mandatory fields
    if (!mappedData.first_name) {
      mappedData.first_name = 'Staff'
    }
    if (!mappedData.last_name) {
      mappedData.last_name = '.'
    }
    if (!mappedData.employment_status) {
      mappedData.employment_status = 'Permanent'
    }
    if (!mappedData.gender) {
      mappedData.gender = 'Male'
    }

    return mappedData
  }

  async bulkUploadStaff(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id!
    const role_id = ctx.auth.user!.role_id
    const academic_session_id = ctx.request.input('academic_sessions', 1)
    const staff_type = ctx.request.input('staff-type', 1)

    if (staff_type !== 'teaching' && staff_type !== 'non-teaching' && staff_type !== 'hospital') {
      return ctx.response.status(400).json({ message: 'Invalid staff type' })
    }

    if (school_id !== (ctx.auth.user!.school_id as number) && (role_id === 3 || role_id === 5)) {
      return ctx.response.status(403).json({ message: 'You are not authorized to create teachers.' })
    }

    try {
      const file = ctx.request.file('file', {
        extnames: ['csv', 'xlsx'],
        size: '5mb',
      })

      if (!file) {
        return ctx.response.badRequest({ message: 'File is required.' })
      }

      const uploadDir = path.join(app.tmpPath(), 'uploads')
      await file.move(uploadDir)

      if (!file.isValid) {
        return ctx.response.badRequest({ message: file.errors })
      }

      const filePath = path.join(uploadDir, file.clientName)
      let jsonData: any[] = []

      if (file.extname === 'xlsx') {
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.readFile(filePath)
        const worksheet = workbook.getWorksheet(1)
        const headers: string[] = []

        worksheet?.getRow(1).eachCell((cell, colNumber) => {
          headers[colNumber] = cell.text
        })

        worksheet?.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return
          const rowData: any = {}
          row.eachCell((cell, colNumber) => {
            rowData[headers[colNumber]] = cell.value
          })
          jsonData.push(rowData)
        })
      } else {
        jsonData = await parseAndReturnJSON(filePath)
      }

      if (!jsonData.length) {
        return ctx.response.badRequest({ message: 'File is empty or improperly formatted.' })
      }

      const trx = await db.transaction()
      let staff_array = []
      try {
        let rowIndex = 0
        for (let data of jsonData) {
          rowIndex++
          // Skip empty rows
          if (!Object.values(data).some(v => v !== null && v !== undefined && v !== '')) continue;

          // Map headers to fields
          data = this.mapExcelHeadersToFields(data)

          // Normalize enum fields
          if (data.gender) {
            const g = String(data.gender).trim().toLowerCase()
            if (['male', 'm'].includes(g)) data.gender = 'Male'
            else if (['female', 'f'].includes(g)) data.gender = 'Female'
            else data.gender = null
          }
          if (data.marital_status) {
            const m = String(data.marital_status).trim().toLowerCase()
            if (['single', 'unmarried'].includes(m)) data.marital_status = 'Single'
            else if (['married'].includes(m)) data.marital_status = 'Married'
            else if (['divorced'].includes(m)) data.marital_status = 'Divorced'
            else if (['widowed'].includes(m)) data.marital_status = 'Widowed'
            else data.marital_status = null
          }
          if (data.category) {
            const c = String(data.category).trim().toUpperCase()
            if (['OPEN', 'GENERAL', 'GEN'].includes(c) || c.includes('EWS')) data.category = 'OPEN'
            else if (['ST', 'S.T.', 'SCHEDULED TRIBE'].includes(c)) data.category = 'ST'
            else if (['SC', 'S.C.', 'SCHEDULED CASTE'].includes(c)) data.category = 'SC'
            else if (['OBC', 'O.B.C.', 'SEBC', 'S.E.B.C.'].includes(c)) data.category = 'OBC'
            else data.category = null
          }
          if (data.employment_status) {
            const e = String(data.employment_status).trim().toLowerCase()
            if (e.includes('permanent')) data.employment_status = 'Permanent'
            else if (e.includes('trial')) data.employment_status = 'Trial_Period'
            else if (e.includes('contract')) data.employment_status = 'Contract_Based'
            else if (e.includes('notice')) data.employment_status = 'Notice_Period'
            else if (e.includes('resigned')) data.employment_status = 'Resigned'
            else data.employment_status = 'Permanent'
          }

          const rawRoleName = (data.role || data.designation || data.staff_category || data.post || '').toString().trim()
          let role = null

          if (rawRoleName) {
            role = await StaffMaster.query()
              .useTransaction(trx)
              .where('school_id', school_id)
              .andWhere('is_teaching_role', staff_type === 'teaching' ? true : false)
              .andWhere((query) => {
                query
                  .where('role', rawRoleName)
                  .orWhereRaw('LOWER(role) = ?', [rawRoleName.toLowerCase()])
                  .orWhereRaw('LOWER(role) LIKE ?', [`%${rawRoleName.toLowerCase()}%`])
              })
              .first()
          }

          // Fallback to default staff role for this staff_type if empty or unrecognized role in file
          if (!role) {
            role = await StaffMaster.query()
              .useTransaction(trx)
              .where('school_id', school_id)
              .andWhere('is_teaching_role', staff_type === 'teaching' ? true : false)
              .first()
          }

          if (!role) {
            await trx.rollback()
            return ctx.response.status(404).json({
              message: `No available staff role found for your school for ${staff_type} staff. Please check Staff Role Master settings.`,
            })
          }

          let validatedStaff: any
          try {
            validatedStaff = await CreateValidatorForBulkUpload.validate({
              ...data,
              staff_role_id: role.id,
            })
          } catch (rowValErr: any) {
            console.log(`Validation error on Row ${rowIndex}:`, rowValErr)
            await trx.rollback()
            const errList = rowValErr.messages
              ? rowValErr.messages.map((m: any) => `${m.field}: ${m.message}`).join(', ')
              : rowValErr.message || 'Invalid row data'
            return ctx.response.status(400).json({
              message: `Validation failed on Row ${rowIndex}: ${errList}`,
              row: rowIndex,
              errors: rowValErr.messages || [rowValErr.message],
            })
          }

          const {
            university_approval_letter_no,
            university_approval_date,
            ...staffPayload
          } = validatedStaff as any

          // Upsert check: find existing staff by Aadhar, UAN, EPF, PAN, Account No, Email, or Employee Code
          let staff: Staff | null = null

          if (staffPayload.aadhar_no) {
            staff = await Staff.query()
              .useTransaction(trx)
              .where('school_id', school_id as number)
              .andWhere('aadhar_no', staffPayload.aadhar_no)
              .first()
          }

          if (!staff && staffPayload.epf_uan_no) {
            staff = await Staff.query()
              .useTransaction(trx)
              .where('school_id', school_id as number)
              .andWhere('epf_uan_no', staffPayload.epf_uan_no)
              .first()
          }

          if (!staff && staffPayload.epf_no) {
            staff = await Staff.query()
              .useTransaction(trx)
              .where('school_id', school_id as number)
              .andWhere('epf_no', staffPayload.epf_no)
              .first()
          }

          if (!staff && staffPayload.pan_card_no) {
            staff = await Staff.query()
              .useTransaction(trx)
              .where('school_id', school_id as number)
              .andWhere('pan_card_no', staffPayload.pan_card_no)
              .first()
          }

          if (!staff && staffPayload.account_no) {
            staff = await Staff.query()
              .useTransaction(trx)
              .where('school_id', school_id as number)
              .andWhere('account_no', staffPayload.account_no)
              .first()
          }

          if (!staff && staffPayload.email) {
            staff = await Staff.query()
              .useTransaction(trx)
              .where('school_id', school_id as number)
              .andWhere('email', staffPayload.email)
              .first()
          }

          if (!staff && staffPayload.employee_code) {
            staff = await Staff.query()
              .useTransaction(trx)
              .where('school_id', school_id as number)
              .andWhere('employee_code', staffPayload.employee_code)
              .first()
          }

          if (!staff && staffPayload.first_name && staffPayload.last_name) {
            staff = await Staff.query()
              .useTransaction(trx)
              .where('school_id', school_id as number)
              .andWhereRaw('LOWER(first_name) = ?', [staffPayload.first_name.toLowerCase()])
              .andWhereRaw('LOWER(last_name) = ?', [staffPayload.last_name.toLowerCase()])
              .first()
          }

          const staffFields = {
            ...staffPayload,
            uni_approval_number: university_approval_letter_no,
            uni_approval_date: university_approval_date,
            is_teching_staff: role.is_teaching_role,
            is_teaching_role: role.is_teaching_role,
            staff_type: staff_type === 'teaching' ? 'Teaching Staff' : staff_type === 'hospital' ? 'Hospital Staff' : 'Non-Teaching Staff',
            staff_role_id: role.id,
            school_id: school_id as number,
            short_name:
              staffPayload.short_name || `${staffPayload.first_name} ${staffPayload.last_name}`,
            department: staffPayload.department || 'General',
            total_experience: staffPayload.total_experience || 0,
          }

          if (staff) {
            staff.merge(staffFields)
            await staff.useTransaction(trx).save()
          } else {
            let uniqueEmpCode = staffPayload.employee_code
            if (!uniqueEmpCode) {
              uniqueEmpCode = `EMP${Date.now().toString().slice(-6)}${String(rowIndex).padStart(3, '0')}`
            }
            staff = await Staff.create(
              {
                ...staffFields,
                employee_code: uniqueEmpCode,
              },
              { client: trx }
            )
          }

          const existingEnrollment = await StaffEnrollment.query()
            .useTransaction(trx)
            .where('staff_id', staff.id)
            .andWhere('academic_year', academic_session_id as number)
            .first()

          if (!existingEnrollment) {
            await StaffEnrollment.create(
              {
                academic_year: academic_session_id as number,
                staff_id: staff.id,
                school_id: school_id as number,
                status: 'Retained',
                remarks: '',
              },
              { client: trx }
            )
          }

          staff_array.push(staff)
        }

        await trx.commit()

        return ctx.response.status(201).json({
          message: 'Bulk upload successful',
          totalInserted: staff_array.length,
        })
      } catch (validationError: any) {
        console.log('validationError', validationError)
        await trx.rollback()
        const errDetails = validationError.messages
          ? validationError.messages.map((m: any) => `${m.field || 'field'}: ${m.message}`).join('; ')
          : validationError.message || 'Validation failed'
        return ctx.response.status(400).json({
          message: `Validation failed in one or more rows: ${errDetails}`,
          errors: validationError.messages || [validationError.message],
        })
      }
    } catch (error: any) {
      console.error('Bulk upload error:', error)
      return ctx.response.internalServerError({
        message: 'An error occurred while processing the bulk upload.',
        error: error.message,
      })
    }
  }

  public async exportToExcel(ctx: HttpContext) {
    try {
      // Get parameters from query string instead of request body
      const fields = ctx.request.input('fields')
      const staff_type = ctx.request.input('staff-type', '')
      const school_id = ctx.auth.user!.school_id!

      // Validate required parameters
      if (!school_id || fields.length === 0 || !staff_type) {
        return ctx.response.badRequest({
          error: 'School ID, staff type, and at least one field are required'
        })
      }

      // Validate staff type
      if (staff_type !== 'teaching' && staff_type !== 'non-teaching' && staff_type !== 'hospital') {
        return ctx.response.badRequest({ error: 'Invalid staff type' })
      }

      // Authorization check
      if (school_id !== ctx.auth.user!.school_id as number) {
        return ctx.response.forbidden({
          message: 'You are not authorized to perform this action'
        })
      }



      // Get staff data
      const query = db
        .query()
        .from('staff as s')
        .join('staff_enrollments as se', 's.id', 'se.staff_id')
        .join('staff_role_master as sm', 's.staff_role_id', 'sm.id')
        .where('s.school_id', school_id as number)

      if (staff_type === 'teaching') {
        query.where('sm.is_teaching_role', 1)
      } else if (staff_type === 'hospital') {
        query.where('s.staff_type', 'Hospital Staff')
      } else {
        query.where('sm.is_teaching_role', 0)
             .where((q) => {
               q.whereNull('s.staff_type')
                .orWhereNot('s.staff_type', 'Hospital Staff')
             })
      }

      const staff = await query.select(['s.*', 'sm.role'])

      if (staff.length === 0) {
        return ctx.response.badRequest({ error: 'No staff found matching the criteria' })
      }

      // Get all staff roles from this school without academic session filter
      const roleQuery = StaffMaster.query()
        .where('school_id', school_id)

      if (staff_type === 'teaching') {
        roleQuery.andWhere('is_teaching_role', 1)
      } else if (staff_type === 'hospital') {
        roleQuery.andWhere('role', 'Hospital Staff')
      } else {
        roleQuery.andWhere('is_teaching_role', 0)
                 .andWhereNot('role', 'Hospital Staff')
      }

      const staffRoles = await roleQuery

      if (staffRoles.length === 0) {
        return ctx.response.badRequest({ error: 'No staff roles found for this school' })
      }

      // Create Excel Workbook
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Staff Data')

      // Add headers
      worksheet.addRow(fields)

      // Add data rows
      staff.forEach((data) => {
        const rowValues = fields.map((header: string) => {
          if (header === 'staff_role') {
            const role = staffRoles.find((role) => role.id === data.staff_role_id)
            return role ? role.role : ''
          }
          return data[header] || ''
        })
        worksheet.addRow(rowValues)
      })

      // Generate file buffer
      const buffer = await workbook.xlsx.writeBuffer()
      const uniqueValue = new Date().getTime()

      // Set response headers for file download
      ctx.response.header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      ctx.response.header(
        'Content-Disposition',
        `attachment; filename="staff_data_${uniqueValue}.xlsx"`
      )

      return ctx.response.send(buffer)
    } catch (error) {
      console.error('Error generating Excel export:', error)
      return ctx.response.internalServerError({
        error: 'Failed to generate Excel export',
        message: error.message
      })
    }
  }
}
