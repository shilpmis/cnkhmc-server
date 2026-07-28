import type { HttpContext } from '@adonisjs/core/http'
import Schools from '#models/Schools'
import { UpdateValidatorForSchools } from '#validators/Schools'
import { DateTime } from 'luxon'
import Students from '#models/Students'
import TeacherLeaveApplication from '#models/TeacherLeaveApplication'
import OtherStaffLeaveApplication from '#models/StaffLeaveApplication'
import Inquiries from '#models/Inquiries'
import Teacher from '#models/Teacher'
import OtherStaff from '#models/OtherStaff'
import Entity from '#models/Entity'
import ExcelJS from 'exceljs'

export default class SchoolsController {
  async fetchSchoolDataForDashBoard(ctx: HttpContext) {
    try {
      const schoolId = ctx.auth.user?.school_id
      if (!schoolId) {
        return ctx.response.badRequest({ message: 'School context is required for dashboard data' })
      }
      const today = DateTime.now().toFormat('yyyy-MM-dd')
      const currentYear = DateTime.now().year

      // Get total students
      const totalStudents = await Students.query().where('school_id', schoolId).count('* as total')

      // Get staff statistics
      const teachingstaffStatus = await Teacher.query()
        .where('school_id', schoolId)
        .select('staff_type')
        .count('* as total')

      const otherstaffStatus = await OtherStaff.query()
        .where('school_id', schoolId)
        .select('staff_type')
        .count('* as total')

      // Get absent teaching staff for today
      const absentTeachingStaff = await TeacherLeaveApplication.query()
        .where('school_id', schoolId)
        .where('leave_date', today)
        .count('* as total')

      // Get absent non-teaching staff for today
      const absentNonOtherStaff = await OtherStaffLeaveApplication.query()
        .where('school_id', schoolId)
        .where('leave_date', today)
        .count('* as total')

      // Get inquiries by class for current year
      const inquiries = await Inquiries.query()
        .where('school_id', schoolId)
        .whereRaw('YEAR(created_at) = ?', [currentYear])
        .select('class')
        .count('* as total')
        .groupBy('class')

      // Prepare staff data
      const staffData = {
        teaching: teachingstaffStatus || 0,
        nonTeaching: otherstaffStatus || 0,
        absentTeaching: absentTeachingStaff || 0,
        absentNonTeaching: absentNonOtherStaff || 0,
      }

      return ctx.response.status(200).json({
        students: {
          total: totalStudents[0] || 0,
          absent: 0,
          // present: (totalStudents) - (absentStudents)
        },
        staff: staffData,
        inquiries: inquiries.reduce((acc: any, curr: any) => {
          acc[curr.grade_applying] = curr.total
          return acc
        }, {}),
      })
    } catch (error) {
      return ctx.response.status(500).json({
        message: 'Error fetching dashboard data',
        error: error.message,
      })
    }
  }

  async index(ctx: HttpContext) {
    let school_id = ctx.params.school_id
    
    // Fetch entity to ensure name sync
    const entity = await Entity.query().where('id', school_id).where('type', 'SCHOOL').first()
    
    let school = await Schools.query()
      .where('id', school_id)
      .preload('organization')
      // .preload('academicSessions')
      .first()
    
    if (school && entity && school.name !== entity.name) {
      school.name = entity.name
      await school.save()
    }

    return school ? ctx.response.json(school) : ctx.response.notFound();
  }

  async update(ctx: HttpContext) {
    let school_id = ctx.params.school_id
    let school = await Schools.query().where('id', school_id).first()

    if (school) {
      if (ctx.auth.user?.role_id == 1 && school_id == ctx.auth.user.school_id) {
        const data = await UpdateValidatorForSchools.validate(ctx.request.body())
        school.merge(data)
        let updated_school = await school.save()
        return ctx.response.status(201).json(updated_school)
      } else {
        return ctx.response.status(401).json({ message: 'Unauthorized' })
      }
    }
    return ctx.response.status(404).json({ message: 'School not found' })
  }

  public async downloadTemplate({ response }: HttpContext) {
    const workbook = new ExcelJS.Workbook()

    // Main worksheet (where users enter data)
    const worksheet = workbook.addWorksheet('Staff Template')

    // Hidden sheet for dropdown values (hidden in Excel)
    const hiddenSheet = workbook.addWorksheet('Dropdowns', { state: 'veryHidden' })

    // Dropdown values for Staff Role
    const staffRoles = ['Teacher', 'Admin', 'Principal']
    staffRoles.forEach((role, index) => {
      hiddenSheet.getCell(`A${index + 1}`).value = role
    })
    workbook.definedNames.add('StaffRoles', `Dropdowns!$A$1:$A$${staffRoles.length}`)

    // Dropdown values for Gender
    const genderOptions = ['Male', 'Female']
    genderOptions.forEach((gender, index) => {
      hiddenSheet.getCell(`B${index + 1}`).value = gender
    })
    workbook.definedNames.add('GenderOptions', `Dropdowns!$B$1:$B$${genderOptions.length}`)

    // Define main columns
    worksheet.columns = [
      { header: 'Staff Role', key: 'staff_role_id', width: 30 },
      { header: 'First Name', key: 'first_name', width: 20 },
      { header: 'Middle Name', key: 'middle_name', width: 20 },
      { header: 'Last Name', key: 'last_name', width: 20 },
      { header: 'Gender (Male/Female)', key: 'gender', width: 15 },
      { header: 'Birth Date (YYYY-MM-DD)', key: 'birth_date', width: 20 },
      { header: 'Mobile Number', key: 'mobile_number', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
    ]

    // Add a demo row
    worksheet.addRow([
      'Teacher',
      'John',
      'M.',
      'Doe',
      'Male',
      '1990-05-15',
      '9876543210',
      'john.doe@example.com',
    ])

    // Apply dropdown for "Staff Role"
    worksheet.getColumn('staff_role_id').eachCell((cell, rowNumber) => {
      if (rowNumber > 1) {
        // Exclude header
        cell.dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: ['=StaffRoles'],
          showErrorMessage: true,
          errorTitle: 'Invalid Selection',
          error: 'Please select a valid staff role from the dropdown list.',
        }
      }
    })

    // Apply dropdown for "Gender"
    worksheet.getColumn('gender').eachCell((cell, rowNumber) => {
      if (rowNumber > 1) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: ['=GenderOptions'],
          showErrorMessage: true,
          errorTitle: 'Invalid Selection',
          error: 'Please select Male or Female.',
        }
      }
    })

    // Apply validation for Birth Date
    worksheet.getColumn('birth_date').eachCell((cell, rowNumber) => {
      if (rowNumber > 1) {
        cell.dataValidation = {
          type: 'custom',
          formulae: ['=AND(ISNUMBER(A2), A2>DATE(1900,1,1), A2<TODAY())'], // Must be a valid date
          showErrorMessage: true,
          errorTitle: 'Invalid Birth Date',
          error: 'Enter a valid birth date (YYYY-MM-DD) before today.',
        }
      }
    })

    // Apply validation for Mobile Number (10-digit)
    worksheet.getColumn('mobile_number').eachCell((cell, rowNumber) => {
      if (rowNumber > 1) {
        cell.dataValidation = {
          type: 'custom',
          formulae: ['=AND(ISNUMBER(A2),LEN(A2)=10)'], // 10-digit number
          showErrorMessage: true,
          errorTitle: 'Invalid Mobile Number',
          error: 'Enter a valid 10-digit mobile number.',
        }
      }
    })

    // Apply validation for Email (Contains '@' and '.')
    worksheet.getColumn('email').eachCell((cell, rowNumber) => {
      if (rowNumber > 1) {
        cell.dataValidation = {
          type: 'custom',
          formulae: ['=AND(ISNUMBER(SEARCH("@", A2)), ISNUMBER(SEARCH(".", A2)))'],
          showErrorMessage: true,
          errorTitle: 'Invalid Email',
          error: 'Enter a valid email address (must contain "@" and ".").',
        }
      }
    })

    // **Validation Table (for user reference)**
    const validationSheet = workbook.addWorksheet('Validation Rules')
    validationSheet.addRows([
      ['Field', 'Validation Rule'],
      ['Staff Role', 'Must be one of: Teacher, Admin, Principal'],
      ['First Name', 'Required (Text)'],
      ['Middle Name', 'Optional (Text)'],
      ['Last Name', 'Required (Text)'],
      ['Gender', 'Must be Male or Female'],
      ['Birth Date', 'Format: YYYY-MM-DD, Must be before today'],
      ['Mobile Number', '10-digit number required'],
      ['Email', 'Must contain "@" and "."'],
    ])
    validationSheet.getRow(1).font = { bold: true } // Bold headers

    // Write to buffer and send response
    const buffer = await workbook.xlsx.writeBuffer()
    response.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response.header('Content-Disposition', 'attachment; filename="staff_template.xlsx"')
    return response.send(buffer)
  }
}
