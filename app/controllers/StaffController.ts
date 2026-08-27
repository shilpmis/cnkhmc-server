import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import Staff from '#models/Staff'
import { CreateValidatorForStaff, UpdateValidatorForStaff } from '#validators/Staff'
import { CreateValidatorForBulkUpload } from '#validators/Teachers'
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
      } else if (type === 'other') {
        staffQuery
          .leftJoin('staff_enrollments as se', 'staff.id', 'se.staff_id')
          .leftJoin('staff_role_master as sm', 'staff.staff_role_id', 'sm.id')
          .where('sm.is_teaching_role', 0)
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
    try {
      const staffId = ctx.params.staff_id
      const school_id = ctx.auth.user!.school_id!

      const staff = await Staff.query()
        .where('id', staffId)
        .where('school_id', school_id)
        .first()

      if (!staff) {
        return ctx.response.notFound({ message: 'Staff member not found.' })
      }

      // Delete related enrollments first to avoid FK constraint errors
      await db.from('staff_enrollments').where('staff_id', staffId).delete()

      await staff.delete()

      return ctx.response.ok({ message: 'Staff member deleted successfully.' })
    } catch (error) {
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
    const mapping: Record<string, string> = {
      'Staff Name': 'full_name',
      'Name': 'full_name',
      'Title': 'title',
      'Short Name': 'short_name',
      'Date of Birth': 'birth_date',
      'DOB': 'birth_date',
      'Current Address': 'address',
      'Permenant Address': 'permanent_address',
      'Permanent Address': 'permanent_address',
      'Pin code No.': 'postal_code',
      'Mobile No.': 'mobile_number',
      'Mobile number': 'mobile_number',
      'Category': 'category',
      'Religion': 'religion',
      'Minority': 'minority',
      'Nationality': 'nationality',
      'Gender': 'gender',
      'Maritial Status': 'marital_status',
      'Child': 'child_count',
      'Email': 'email',
      'E-Mail': 'email',
      'Designation': 'designation',
      'Role': 'role',
      'Type Of Staff': 'staff_type',
      'Staff Category': 'staff_category',
      'Department': 'department',
      'Nature of appointment': 'nature_of_appointment',
      'Designation on the DOA': 'designation_on_doa',
      'Date Of Appointment': 'appointment_date',
      'Date of Joining': 'joining_date',
      'DOJ': 'joining_date',
      'Date Of Promotion': 'promotion_date',
      'Experience till Date': 'total_experience',
      'Blood Group': 'blood_group',
      'Qualification': 'qualification',
      'Registration Authority': 'registration_authority',
      'State Council Registration No.': 'ayush_registration_no',
      'Registration Number': 'registration_number',
      'Registration Date': 'registration_date',
      'Council Name': 'council_name',
      'Name Of Council': 'council_name',
      'Ayush Teacher Code': 'ayush_teacher_code',
      'Ayush Teachers Code': 'ayush_teacher_code',
      'MD Subject Name': 'md_subject',
      'Qulification College': 'qualification_college',
      'Qulification University': 'qualification_university',
      'Date of Passing': 'passing_date',
      'Bank Account No.': 'account_no',
      'Account Number': 'account_no',
      'Bank IFSC Code': 'IFSC_code',
      'IFSC Code': 'IFSC_code',
      'Bank Name': 'bank_name',
      'Branch Address/Number/email': 'branch_details',
      'Branch Name': 'branch_details',
      'Aadhar Number': 'aadhar_no',
      'Aadhar Card': 'aadhar_no',
      'PAN Card Number': 'pan_card_no',
      'Pan Card': 'pan_card_no',
      'Voter Id Number': 'voter_id',
      'Uni. Approval Date': 'university_approval_date',
      'Uni. Approval Number': 'university_approval_letter_no',
      'Driving Licence': 'driving_licence',
      'Driving license expiry date': 'driving_licence_expiry',
      'EPF A/C No.': 'epf_no',
      'UAN No.': 'epf_uan_no',
      'Employee Status': 'employment_status',
      'Employment Status': 'employment_status',
      'UG Degree': 'ug_degree',
      'UG University': 'ug_passing_university',
      'UG Passing Year': 'ug_passing_year',
      'PG Degree': 'pg_degree',
      'PG University': 'pg_passing_university',
      'PG Passing Year': 'pg_passing_year',
      'Other Qualifications': 'other_degree',
      'Experience (Years)': 'experience_years',
    }

    const mappedData: any = {}
    for (const key of Object.keys(data)) {
      const trimmedKey = key.trim()
      let fieldName = mapping[trimmedKey]

      if (!fieldName) {
        for (const [mapKey, mapValue] of Object.entries(mapping)) {
          if (trimmedKey.toLowerCase().includes(mapKey.toLowerCase())) {
            fieldName = mapValue
            break
          }
        }
      }

      if (fieldName) {
        mappedData[fieldName] = data[key]
      } else {
        const snakeKey = trimmedKey.toLowerCase().replace(/\s+/g, '_')
        mappedData[snakeKey] = data[key]
      }
    }

    // Helper to normalize dates from Excel
    const normalizeDate = (val: any) => {
      if (!val) return null
      if (val instanceof Date) return DateTime.fromJSDate(val).toFormat('yyyy-MM-dd')
      if (typeof val === 'number') {
        // Excel serial date
        const date = new Date((val - 25569) * 86400 * 1000)
        return DateTime.fromJSDate(date).toFormat('yyyy-MM-dd')
      }
      if (typeof val === 'string') {
        const parsed = DateTime.fromFormat(val, 'dd/MM/yyyy')
        if (parsed.isValid) return parsed.toFormat('yyyy-MM-dd')
        const parsedIso = DateTime.fromISO(val)
        if (parsedIso.isValid) return parsedIso.toFormat('yyyy-MM-dd')
      }
      return val
    }

    // Apply date normalization
    const dateFields = [
      'birth_date',
      'appointment_date',
      'joining_date',
      'promotion_date',
      'date_of_registration',
      'passing_date',
      'university_approval_date',
      'driving_licence_expiry',
    ]
    dateFields.forEach((field) => {
      if (mappedData[field]) {
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
      if (status.includes('active') || status.includes('permanent')) {
        mappedData.employment_status = 'Permanent'
      } else if (status.includes('probation') || status.includes('trial')) {
        mappedData.employment_status = 'Trial_Period'
      } else if (status.includes('contract')) {
        mappedData.employment_status = 'Contract_Based'
      }
    }

    // Normalize gender
    if (mappedData.gender) {
      const g = mappedData.gender.toString().toLowerCase()
      if (g.startsWith('m')) mappedData.gender = 'Male'
      else if (g.startsWith('f')) mappedData.gender = 'Female'
    }

    // Convert strings to numbers where necessary
    if (mappedData.mobile_number) {
      mappedData.mobile_number = Number(mappedData.mobile_number.toString().replace(/\D/g, ''))
    }
    if (mappedData.postal_code) {
      mappedData.postal_code = Number(mappedData.postal_code.toString().replace(/\D/g, ''))
    }
    if (mappedData.aadhar_no) {
      mappedData.aadhar_no = Number(mappedData.aadhar_no.toString().replace(/\D/g, ''))
    }
    if (mappedData.account_no) {
      mappedData.account_no = Number(mappedData.account_no.toString().replace(/\D/g, ''))
    }

    return mappedData
  }

  async bulkUploadStaff(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id!
    const role_id = ctx.auth.user!.role_id
    const academic_session_id = ctx.request.input('academic_sessions', 1)
    const staff_type = ctx.request.input('staff-type', 1)

    if (staff_type !== 'teaching' && staff_type !== 'non-teaching') {
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
        for (let data of jsonData) {
          // Skip empty rows
          if (!Object.values(data).some(v => v !== null && v !== undefined && v !== '')) continue;

          // Map headers to fields
          data = this.mapExcelHeadersToFields(data)

          const roleName = (data.role || '').trim()
          const role = await StaffMaster.query()
            .useTransaction(trx)
            .where('school_id', school_id)
            .andWhere('role', roleName)
            .andWhere('is_teaching_role', staff_type === 'teaching' ? true : false)
            .first()

          if (!role) {
            await trx.rollback()
            return ctx.response.status(404).json({
              message: `Role "${roleName}" is not available for your school. Please check the role name in the file.`,
            })
          }

          const validatedStaff = await CreateValidatorForBulkUpload.validate({
            ...data,
            staff_role_id: role.id,
          })

          const {
            university_approval_letter_no,
            university_approval_date,
            ...staffPayload
          } = validatedStaff as any

          const staff = await Staff.create(
            {
              ...staffPayload,
              uni_approval_number: university_approval_letter_no,
              uni_approval_date: university_approval_date,
              is_teching_staff: role.is_teaching_role,
              is_teaching_role: role.is_teaching_role,
              staff_role_id: role.id,
              school_id: school_id as number,
              employee_code: staffPayload.employee_code || 'EMP' + Math.floor(1000 + Math.random() * 9000),
              short_name:
                staffPayload.short_name || `${staffPayload.first_name} ${staffPayload.last_name}`,
              department: staffPayload.department || 'General',
              total_experience: staffPayload.total_experience || 0,
            },
            { client: trx }
          )

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
        return ctx.response.status(400).json({
          message: 'Validation failed in one or more rows',
          errors: validationError.messages,
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
      if (staff_type !== 'teaching' && staff_type !== 'non-teaching') {
        return ctx.response.badRequest({ error: 'Invalid staff type' })
      }

      // Authorization check
      if (school_id !== ctx.auth.user!.school_id as number) {
        return ctx.response.forbidden({
          message: 'You are not authorized to perform this action'
        })
      }



      // Get staff data
      const staff = await db
        .query()
        .from('staff as s')
        .join('staff_enrollments as se', 's.id', 'se.staff_id')
        .join('staff_role_master as sm', 's.staff_role_id', 'sm.id')
        .where('s.school_id', school_id as number)
        .where('sm.is_teaching_role', staff_type === 'teaching' ? 1 : 0)
        .select(['s.*', 'sm.role'])

      if (staff.length === 0) {
        return ctx.response.badRequest({ error: 'No staff found matching the criteria' })
      }

      // Get all staff roles from this school without academic session filter
      const staffRoles = await StaffMaster.query()
        .where('school_id', school_id)
        .andWhere('is_teaching_role', staff_type === 'teaching' ? 1 : 0)

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
