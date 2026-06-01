import Classes from '#models/Classes'
import type { HttpContext } from '@adonisjs/core/http'
import {
  CreateValidatorForMultipleStundets,
  // CreateValidatorForUpload,
  // CreateValidatorForUpload,
  CreateValidatorStundet,
  UpdateValidatorForStundets,
} from '#validators/Students'
import Students from '#models/Students'
import StudentMeta from '#models/StudentMeta'
import db from '@adonisjs/lucid/services/db'
import { parseAndReturnJSON } from '../../utility/parseCsv.js'
import path from 'path'
import app from '@adonisjs/core/services/app'
import ExcelJS from 'exceljs'
import StudentEnrollments from '#models/StudentEnrollments'
import AcademicSession from '#models/AcademicSession'
import Schools from '#models/Schools'
import Divisions from '#models/Divisions'

// Helper function to generate unique enrollment codes
interface GenerateUniqueEnrollmentCodeParams {
  prefix: string
  trx: any // Replace `any` with the specific type for the transaction object if available
}

async function generateUniqueEnrollmentCode({
  prefix,
  trx,
}: GenerateUniqueEnrollmentCodeParams): Promise<string> {
  const maxAttempts = 10
  let attempts = 0

  while (attempts < maxAttempts) {
    // Generate a random code
    const randomPart = Math.floor(1000 + Math.random() * 9000)
    const enrollmentCode = `${prefix}${randomPart}`

    // Check if this code already exists in the database
    const existingStudent = await Students.query({ client: trx })
      .where('enrollment_code', enrollmentCode)
      .first()

    // If no student has this code, return it
    if (!existingStudent) {
      return enrollmentCode
    }

    attempts++
  }

  // If we've tried multiple times and still have collisions,
  // use timestamp + random to ensure uniqueness
  const timestamp = Date.now().toString().slice(-5)
  const randomPart = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}${timestamp}${randomPart}`
}

function parseAndFormatDate(dateStr: any): string | null {
  if (!dateStr) return null
  if (dateStr instanceof Date) {
    if (!isNaN(dateStr.getTime())) {
      return dateStr.toISOString().split('T')[0]
    }
    return null
  }
  const str = String(dateStr).trim()
  if (str === '' || str.toLowerCase() === 'null') return null

  // Match YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str

  // Match DD-MM-YYYY or MM-DD-YYYY or DD/MM/YYYY or MM/DD/YYYY
  const parts = str.split(/[-/.]/)
  if (parts.length === 3) {
    let dayOrMonth1 = parseInt(parts[0], 10)
    let dayOrMonth2 = parseInt(parts[1], 10)
    let year = parseInt(parts[2], 10)

    if (parts[2].length === 2) {
      year += year < 50 ? 2000 : 1900
    }

    if (dayOrMonth2 > 12 && dayOrMonth1 <= 12) {
      // Likely MM/DD/YYYY
      return `${year}-${String(dayOrMonth1).padStart(2, '0')}-${String(dayOrMonth2).padStart(2, '0')}`
    } else {
      // Safely default to DD-MM-YYYY
      return `${year}-${String(dayOrMonth2).padStart(2, '0')}-${String(dayOrMonth1).padStart(2, '0')}`
    }
  }

  // Fallback
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0]
  }
  return null
}

function parseSafeInt(val: any): number | null {
  if (val === null || val === undefined || val === '') return null
  const str = String(val).trim()
  if (str === '' || str.toLowerCase() === 'null') return null
  const parsed = parseInt(str, 10)
  return isNaN(parsed) ? null : parsed
}

function parseSafeFloat(val: any): number | null {
  if (val === null || val === undefined || val === '') return null
  const str = String(val).trim()
  if (str === '' || str.toLowerCase() === 'null') return null
  const parsed = parseFloat(str)
  return isNaN(parsed) ? null : parsed
}

function parseSafeAadhar(val: any): number | null {
  if (val === null || val === undefined || val === '') return null
  const str = String(val).trim()
  if (str === '' || str.toLowerCase() === 'null') return null
  
  if (str.includes('.') || parseFloat(str) < 1) {
    return null
  }
  const parsed = parseInt(str, 10)
  return isNaN(parsed) ? null : parsed
}

function parseSafeBloodGroup(val: any): string | null {
  if (val === null || val === undefined || val === '') return null
  let str = String(val).trim().toUpperCase().replace(/\s+/g, '')
  if (!str || str === 'NULL') return null
  
  str = str.replace(/VE$/i, '')
  
  if (str === 'OPOSITIVE') return 'O+'
  if (str === 'ONEGATIVE') return 'O-'
  if (str === 'APOSITIVE') return 'A+'
  if (str === 'ANEGATIVE') return 'A-'
  if (str === 'BPOSITIVE') return 'B+'
  if (str === 'BNEGATIVE') return 'B-'
  if (str === 'ABPOSITIVE') return 'AB+'
  if (str === 'ABNEGATIVE') return 'AB-'

  const validGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
  if (validGroups.includes(str)) {
    return str
  }
  return null
}

export default class StundetsController {
  async indexClassStudents(ctx: HttpContext) {
    const division_id = ctx.params.division_id
    const academic_session_id = ctx.params.academic_session_id
    const page = ctx.request.input('page', 1)
    const is_meta_req = ctx.request.input('student_meta', false) === 'true'

    const division = await Divisions.query().where('id', division_id).first()

    if (!division) {
      return ctx.response
        .status(404)
        .json({ message: 'No class has been found! Please provide a valid class.' })
    }

    let check_class = await Classes.query()
      .where('id', division?.class_id)
      .andWhere('school_id', ctx.auth.user!.school_id as number)
      .first()

    if (!check_class) {
      return ctx.response
        .status(401)
        .json({ message: 'You are not authorized to perform this action!' })
    }

    try {
      let studentsQuery = await StudentEnrollments.query()
        .where('division_id', division_id)
        .andWhere('academic_session_id', academic_session_id as number)
        .preload('student', (studentQuery) => {
          if (is_meta_req) {
            studentQuery.preload('student_meta')
          }
        })
        .paginate(page, 10)

      const students = studentsQuery.all()
      const pageMeta = studentsQuery.getMeta()

      let res = {
        data: students.map((student) => {
          return {
            ...student.student.serialize(),
            // acadamic_class: student.,
            class_id: division?.class_id,
          }
        }),
        meta: pageMeta,
      }

      return ctx.response.status(200).json(res)
    } catch (error) {
      return ctx.response
        .status(500)
        .json({ message: 'Error fetching students', error: error.message })
    }
  }

  async fetchStudent(ctx: HttpContext) {
    const student_id = ctx.params.student_id
    const school_id = ctx.auth.user!.school_id
    let acadamic_session_id = ctx.request.qs().academic_session;

    if(!acadamic_session_id){
      return ctx.response.status(400).json({ message: 'Academic session is required' })
    }
    
    const is_meta_req = ctx.request.input('student_meta', false) === 'true'

    if (school_id !== ctx.auth.user?.school_id) {
      return ctx.response
        .status(401)
        .json({ message: 'You are  not authorized to perform this action!' })
    }

    let active_session = await AcademicSession.query()
      .where('id', acadamic_session_id)
      .andWhere('school_id', school_id as number)
      .first()
    
    if(!active_session){
      return ctx.response.status(404).json({ message: 'No active academic session found!' })
    }

    // if (!active_session) {
    //   return ctx.response.status(404).json({ message: 'No active academic session found!' })
    // }

    try {
      // Fetch the student enrollment record
      const studentEnrollment = await StudentEnrollments.query()
        .where('student_id', student_id)
        .andWhere('academic_session_id', acadamic_session_id)
        .first()

      if (!studentEnrollment) {
        return ctx.response.status(404).json({ message: 'No Student Enrollment Available!' })
      }

      let student: Students | null = null

      if (is_meta_req) {
        student = await Students.query().where('id', student_id).preload('student_meta').first()
      } else {
        student = await Students.query().where('id', student_id).first()
      }
      return ctx.response
        .status(200)
        .json({ ...student?.serialize(), class_id: studentEnrollment.division_id })
    } catch (error) {
      return ctx.response
        .status(500)
        .json({ message: 'Error fetching student', error: error.message })
    }
  }

  async fetchStudentInDetail(ctx: HttpContext) {
    let student_id = ctx.params.student_id
    let academic_session_id = ctx.request.qs().academic_session

    if (!student_id) {
      return ctx.response.status(400).json({ message: 'Student ID is required' })
    }

    if (!academic_session_id) {
      return ctx.response.status(400).json({ message: 'Academic session is required' })
    }

    let academic_session = await AcademicSession.query()
      .where('id', academic_session_id as number)
      .andWhere('school_id', ctx.auth.user!.school_id as number)
      .first()

    if (!academic_session) {
      return ctx.response.status(404).json({ message: 'Academic session not found' })
    }

    let detailed_student_data = await StudentEnrollments.query()
      .preload('student', (studentQuery) => {
        studentQuery.preload('student_meta')
      })
      .preload('division', (divisionQuery) => {
        divisionQuery.preload('class')
        // divisionQuery.where('academic_session_id', academic_session_id as number)
      })
      .preload('fees_status', (feesStatusQuery) => {
        feesStatusQuery.preload('paid_fees')
        feesStatusQuery.where('academic_session_id', academic_session_id as number)
      })
      .preload('provided_concession', (query) => {
        query.preload('fees_plan', (query) => {
          query.where('academic_session_id', academic_session_id as number)
        })
        query.where('academic_session_id', academic_session_id as number)
      })
      //. where('academic_session_id', academic_session_id)
      .where('student_id', student_id)
      .andWhere('academic_session_id', academic_session_id as number)
      .first()

    if (!detailed_student_data) {
      return ctx.response.status(404).json({ message: 'Student not found' })
    }
    return ctx.response.status(200).json(detailed_student_data)
  }

  async createSingleStudent(ctx: HttpContext) {
    const academic_session_id = ctx.request.qs().academic_session
    const trx = await db.transaction()
    try {
      const academicSession = await AcademicSession.query()
        .where('id', academic_session_id as number)
        .andWhere('school_id', ctx.auth.user!.school_id as number)
        .first()

      if (!academicSession) {
        return ctx.response.status(404).json({ message: 'Academic Session not found' })
      }

      let school_id = ctx.auth.user!.school_id

      let payload = await CreateValidatorStundet.validate(ctx.request.body())

      let std = await Divisions.query()
        .where('id', payload.students_data.class_id)
        // .andWhere('school_id', ctx.auth.user!.school_id as number)
        .first()

      if (!std) {
        return ctx.response.status(404).json({ message: 'Class not found.' })
      }

      if (ctx.auth.user?.role_id != 1) {
        return ctx.response
          .status(401)
          .json({ message: 'You are not authorized to perform this action!' })
      }

      // Remove class_id from payload.students_data
      const { class_id, remarks, ...studentDataWithoutClassId } = payload.students_data

      // Create student within the transaction with unique enrollment code
      let student_data = await Students.create(
        {
          ...studentDataWithoutClassId,
          school_id: school_id as number,
          enrollment_code: await generateUniqueEnrollmentCode({ prefix: 'ENR', trx }),
        } as any,
        { client: trx }
      )

      // Create student meta data within the transaction
      let student_meta_data_payload = await StudentMeta.create(
        { ...payload.student_meta_data, student_id: student_data.id } as any,
        { client: trx }
      )

      // Add a row in the student_enrollments table within the transaction
      await StudentEnrollments.create(
        {
          student_id: student_data.id,
          division_id: class_id,
          academic_session_id: academicSession.id,
          is_new_admission: true,
          status: 'pursuing',
          remarks: remarks || '',
        },
        { client: trx }
      )

      // Commit the transaction
      await trx.commit()

      return ctx.response
        .status(201)
        .json({ student_data: student_data, student_meta: student_meta_data_payload })
    } catch (error) {
      // Rollback the transaction in case of error
      console.log('Error while create single student', error)
      await trx.rollback()
      return ctx.response.status(500).json({ message: 'Error creating student', error: error })
    }
  }

  /**
   * TODO : Need to update as per academic session
   */
  async createMultipleStudents(ctx: HttpContext) {
    let school_id = ctx.auth.user!.school_id
    let class_id = ctx.params.class_id

    if (!class_id) {
      return ctx.response.badRequest({ message: 'Class is required' })
    }

    let std = await Classes.findOrFail(class_id)

    if (std.school_id !== school_id || ctx.auth.user?.role_id !== 1) {
      return ctx.response
        .status(401)
        .json({ message: 'You are not authorized to perform this action!' })
    }

    let payload = await CreateValidatorForMultipleStundets.validate(ctx.request.body())

    let res_array: any = []
    // Start a transaction
    const trx = await db.transaction()

    try {
      for (var i = 0; i < payload.length; i++) {
        let student_data = await Students.create(
          {
            ...payload[i].students_data,
            school_id: school_id as number,
            enrollment_code: await generateUniqueEnrollmentCode({ prefix: 'ENR', trx }),
          } as any,
          { client: trx }
        )

        let student_meta_data_payload = await StudentMeta.create(
          {
            ...payload[i].student_meta_data,
            student_id: student_data.id,
          } as any,
          { client: trx }
        )

        res_array.push({ student_data: student_data, student_meta: student_meta_data_payload })
      }

      //  Commit the transaction if both inserts succeed
      await trx.commit()

      return ctx.response.status(201).json(res_array)
    } catch (error) {
      //  Rollback if any step fails
      await trx.rollback()
      return ctx.response
        .status(500)
        .json({ message: 'Something went wrong!', error: error.message })
    }
  }

  async updateStudents(ctx: HttpContext) {
    let student_id = ctx.params.student_id

    let StudentEnrollment = await StudentEnrollments.query()
      .where('student_id', student_id)
      .preload('student', (studentQuery) => {
        studentQuery.preload('student_meta')
      })
      .first()

    if (!StudentEnrollment) {
      return ctx.response.status(404).json({ message: 'Student Enrollment not found.' })
    }

    let enroll_student = StudentEnrollment.serialize()

    if (enroll_student.student.school_id !== ctx.auth.user?.school_id) {
      return ctx.response
        .status(401)
        .json({ message: 'You are not authorized to perform this action!' })
    }

    // let student = await Students.findOrFail(student_id);
    // let student_meta = await StudentMeta.findByOrFail('student_id', student_id);

    let student = StudentEnrollment.student
    let student_meta = StudentEnrollment.student.student_meta

    let payload = await UpdateValidatorForStundets.validate(ctx.request.body())
    const trx = await db.transaction()

    try {
      if (payload.students_data && Object.keys(payload.students_data).length > 0) {
        const { class_id, ...studentData } = payload.students_data as any
        
        if (class_id) {
          const div = await Divisions.query().where('id', class_id).first()
          if (div) {
            StudentEnrollment.useTransaction(trx)
            StudentEnrollment.division_id = class_id
            await StudentEnrollment.save()
          }
        }

        student.useTransaction(trx)
        student = await student.merge(studentData).save()
      }

      if (payload.student_meta_data && Object.keys(payload.student_meta_data).length > 0) {
        if (student_meta) {
          student_meta.useTransaction(trx)
          student_meta = await student_meta.merge(payload.student_meta_data).save()
        }
      }

      await trx.commit()

      return ctx.response.status(200).json({
        students_data: student,
        student_meta_data: student_meta,
      })
    } catch (error) {
      console.log('Erro while Update Student', error)
      await trx.rollback()
      return ctx.response
        .status(500)
        .json({ message: 'Something went wrong!', error: error.message })
    }
  }

  public async bulkUploadStudents(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id
    const division_id = ctx.params.division_id
    const academic_session_id = ctx.params.academic_session_id
    const role_id = ctx.auth.user!.role_id

    if (role_id !== 1) {
      return ctx.response
        .status(403)
        .json({ message: 'You are not authorized to perform this action.' })
    }

    if (!division_id) {
      return ctx.response.status(400).json({ message: 'Class ID is required.' })
    }

    let check_ActiveSession = await AcademicSession.query()
      .where('id', academic_session_id as number)
      .andWhere('school_id', school_id as number)
      .andWhere('is_active', true)
      .first()

    if (!check_ActiveSession) {
      return ctx.response.status(400).json({ message: 'Academic session not found.' })
    }

    let school = await Schools.find(school_id)

    if (!school) {
      return ctx.response.status(400).json({ message: 'School not found.' })
    }

    const classRecord = await Divisions.query().preload('class').where('id', division_id).first()

    if (!classRecord || classRecord.class.school_id !== school_id) {
      return ctx.response.status(400).json({ message: 'Class not found for your school.' })
    }

    const file = ctx.request.file('file', {
      extnames: ['csv', 'xlsx', 'xls'],
      size: '20mb',
    })

    if (!file) {
      return ctx.response.status(400).json({ message: 'No file uploaded.' })
    }

    const uploadDir = path.join(app.tmpPath(), 'uploads')
    await file.move(uploadDir)

    if (!file.isValid) {
      return ctx.response.badRequest({ message: file.errors })
    }

    const filePath = path.join(uploadDir, file.clientName)
    const jsonData = await parseAndReturnJSON(filePath)

    if (!jsonData.length) {
      return ctx.response.badRequest({ message: 'CSV file is empty or improperly formatted.' })
    }

    const isCollege = school.school_type === 'COLLEGE'
    let validatedData = []
    let errors = []

    for (const [index, data] of jsonData.entries()) {
      let transformedData
      if (isCollege) {
        transformedData = {
          students_data: {
            first_name: data['FIRST_NAME'],
            middle_name: data['MIDDLE_NAME'] || null,
            last_name: data['LAST_NAME'],
            gender: data['GENDER'] === '' ? null : data['GENDER'] || null,
            gr_no: parseSafeInt(data['GR No.'] || data['GR No']),
            primary_mobile: parseSafeInt(data['MOBILE_NO1']) || 9999999999,
            school_id: school_id as number,
            is_active: true,
            first_name_in_guj: data['S.LANGUAGE_FIRST_NAME'] || null,
            middle_name_in_guj: data['S.LANGUAGE_MIDDLE_NAME'] || null,
            last_name_in_guj: data['S.LANGUAGE_LAST_NAME'] || null,
            birth_date: parseAndFormatDate(data['DATE_OF_BIRTH']),
            roll_number: parseSafeInt(data['ROLL_NO']),
            father_name: data['FATHER_NAME'] || null,
            father_name_in_guj: data['S.LANGUAGE_Father Name'] || null,
            mother_name: data['MOTHER_NAME'] || null,
            mother_name_in_guj: data['S.LANGUAGE_Mother Name'] || null,
            aadhar_no: parseSafeAadhar(data['STUDENT_AADHAAR_CARDNO']),
            student_type: 'COLLEGE' as const,
          },
          student_meta_data: {
            // Core fields
            aadhar_dise_no: parseSafeInt(data['STUDENT_U_DIESNO'] || data['DISE Number']),
            birth_place: data['BIRTH PLACE'] || null,
            birth_place_in_guj: data['Birth Place In Gujarati'] || null,
            religion: data['RELIGION'] || null,
            religion_in_guj: data['Religion In Gujarati'] || null,
            caste: data['CASTE'] || data['Caste'] || null,
            caste_in_guj: data['Caste In Gujarati'] || null,
            category: data['CATEGORY'] || null,
            admission_date: parseAndFormatDate(data['ADMISSION_DATE']),
            secondary_mobile: parseSafeInt(data['MOBILE_NO2']),
            privious_school: data['PREVIOUS_SCHOOL_NAME'] || null,
            address: data['CURRENT ADDRESS'] || null,

            // New Address Details
            current_area: data['Current Area'] || null,
            city: data['Current CITY'] || null,
            state: data['Current STATE'] || null,
            postal_code: data['Currrent PIN_CODE'] || null,
            current_country: data['Current COUNTRY'] || null,
            permanent_address: data['PERMANENT ADDRESS'] || null,
            permanent_area: data['Permanent Area'] || null,
            permanent_city: data['Permanent City'] || null,
            permanent_state: data['Permanent STATE'] || null,
            permanent_pincode: data['Permanent PIN_CODE'] || null,
            permanent_country: data['Permanent COUNTRY'] || null,
            country_code: data['COUNTRY_CODE'] || null,
            nationality: data['NATIONALITY'] || null,
            student_code: data['STUDENT_CODE'] || null,

            // Academic/Admission
            admission_standard: data['ADMISSION_STANDARD'] || null,
            subject_group: data['SUBJECT_GROUP'] || null,
            birth_taluka: data['Birth Taluka'] || null,
            birth_district: data['Birth District'] || null,
            student_leaving_reason: data['STUDENT_LEAVING_REASON'] || null,
            student_lc_date: parseAndFormatDate(data['STUDENT_LC_DATE']),
            student_lc_no: data['STUDENT_LC_NO'] || null,
            pen: data['PEN'] || null,
            abha_card_no: data['AbhaCardNo'] || null,
            school_udise_no: data['School UDISE No'] || null,

            // Family & Contact
            email_id: data['EMAIL_ID'] || null,
            website: data['WEBSITE'] || null,
            mother_tongue: data['MOTHER_TOUNG'] || null,

            // Father Details
            father_qualification: data['FATHER_QUALIFICATION'] || null,
            father_occupation: data['FATHER_OCCUPATION'] || null,
            father_email: data['FATHER_EMAIL'] || null,
            father_organisation: data['FATHER_ORGANISATION'] || null,
            father_office_address: data['FATHER_OFFICE_ADDRESS1'] || null,
            father_office_phone: data['FATHER_OFFICE_PHONENO'] || null,
            father_mobile: data['FATHER_MOBILENO'] ? String(data['FATHER_MOBILENO']) : null,

            // Mother Details
            mother_qualification: data['MOTHER_QUALIFICATION'] || null,
            mother_occupation: data['MOTHER_OCCUPATION'] || null,
            mother_email: data['MOTHER_EMAIL'] || null,
            mother_organisation: data['MOTHER_ORGANISATION'] || null,
            mother_office_address: data['MOTHER_OFFICE_ADDRESS1'] || null,
            mother_office_phone: data['MOTHER_OFFICE_PHONENO'] || null,
            mother_mobile: data['MOTHER_MOBILENO'] ? String(data['MOTHER_MOBILENO']) : null,

            // Guardian Details
            guardian_name: data['GARDIAN_NAME'] || null,
            guardian_qualification: data['GARDIAN_QUALIFICATION'] || null,
            guardian_occupation: data['GARDIAN_OCCUPATION'] || null,
            guardian_email: data['GARDIAN_EMAIL'] || null,
            guardian_organisation: data['GARDIAN_ORGANISATION'] || null,
            guardian_office_address: data['GARDIAN_OFFICE_ADDRESS1'] || null,
            guardian_office_phone: data['GARDIAN_OFFICE_PHONENO'] || null,
            guardian_mobile: data['GARDIAN_MOBILENO'] ? String(data['GARDIAN_MOBILENO']) : null,
            guardian_relation: data['Relation with Local Guardian'] || null,

            // Academic History
            ssc_passing_year: data['S.S.C. Passing Year'] || null,
            hsc_passing_year: data['H.S.C. Passing Year'] || null,
            hsc_attempts: parseSafeInt(data['How Many Attempt?']),
            hsc_obtained_marks: parseSafeFloat(data['H.S.C. Obtained Marks']),
            hsc_pcb_marks_with_practical: parseSafeFloat(data['H.S.C. PCB Marks with Practical']),

            // NEET
            entrance_exam_name: data['Name of Entrance Exam'] || null,
            neet_score: parseSafeFloat(data['NEET score']),
            neet_roll_no: data['NEET Roll No.'] || null,
            neet_application_number: data['NEET Application Number'] || null,
            neet_all_india_rank: parseSafeInt(data['NEET All India Rank']),
            neet_percentile: data['NEET Percentile (%)'] || null,
            general_merit: parseSafeInt(data['General Merit']),
            category_merit: parseSafeInt(data['Category Merit']),

            // Internship
            internship_provisional_number: data['Internship Provisional Number'] || null,
            internship_provisional_date: parseAndFormatDate(data['Internship Provisional Date']),
            internship_starting_date: parseAndFormatDate(data['Internship Starting Date']),
            internship_completion_date: parseAndFormatDate(data['Internship Completion Date']),

            // Progress
            first_year_attempt: parseSafeInt(data['1st year Attempt']),
            second_year_attempt: parseSafeInt(data['2nd Year Attempt']),
            third_year_attempt: parseSafeInt(data['3rd Year Attempt']),
            fourth_year_attempt: parseSafeInt(data['4th year Attempt']),
            final_bhms_passing_date: parseAndFormatDate(data['Final BHMS Date of Passing']),

            // Administrative
            ayush_id: data['Ayush ID'] || null,
            abc_id: data['ABC ID'] || null,
            admission_cancel:
              data['Admission Cancel']?.toString().toLowerCase() === 'true' ||
              data['Admission Cancel']?.toString().toLowerCase() === 'yes',
            admission_cancel_year: data['Admission Cancel Year'] || null,
            admission_cancel_date: parseAndFormatDate(data['Admission Cancel Date']),
            admission_transfer:
              data['Admission Transfer']?.toString().toLowerCase() === 'true' ||
              data['Admission Transfer']?.toString().toLowerCase() === 'yes',
            admission_transfer_date: parseAndFormatDate(data['Admission Transfer Date']),
            admission_transfer_to_college: data['Admission transfer to College'] || null,
            admission_transfer_from_college: data['Admission Transfer From College'] || null,

            // Additional legacy fields if needed
            blood_group: parseSafeBloodGroup(data['BLOOD_GROUP']),
            bank_name: data['Bank_Name'] || null,
            account_no: parseSafeInt(data['Bank_Account_Number']),
            IFSC_code: data['IFSC_Code'] || null,
            
            // New fields from 22-12-2025 format
            admission_year: data['Admission Year'] || null,
            sub_caste: data['Sub Caste'] || null,
            quota_fees: data['Quota Fees'] || null,
            activity_house: data['ACTIVITY_HOUSE'] || null,
            bank_branch_name: data['Bank_Branch_Name'] || null,
          },
        }
      } else {
        transformedData = {
          students_data: {
            first_name: data['First Name'],
            middle_name: data['Middle Name'] || null,
            last_name: data['Last Name'],
            gender: data['Gender'] === '' ? null : data['Gender'] || null,
            gr_no: parseSafeInt(data['GR No']),
            primary_mobile: parseSafeInt(data['Mobile No']) || 9999999999,
            school_id: school_id as number,
            is_active: true,
            first_name_in_guj: data['First Name Gujarati'] || null,
            middle_name_in_guj: data['Middle Name Gujarati'] || null,
            last_name_in_guj: data['Last Name Gujarati'] || null,
            birth_date: parseAndFormatDate(data['Date of Birth']),
            roll_number: parseSafeInt(data['Roll Number']),
            father_name: data['Father Name'] || null,
            father_name_in_guj: data['Father Name in Gujarati'] || null,
            mother_name: data['Mother Name'] || null,
            mother_name_in_guj: data['Mother Name in Gujarati'] || null,
            aadhar_no: parseSafeAadhar(data['Aadhar No']),
            student_type: 'SCHOOL' as const,
          },
          student_meta_data: {
            aadhar_dise_no: parseSafeInt(data['DISE Number']),
            birth_place: data['Birth Place'] || null,
            birth_place_in_guj: data['Birth Place In Gujarati'] || null,
            religion: data['Religion'] || null,
            religion_in_guj: data['Religion In Gujarati'] || null,
            caste: data['Caste'] || null,
            caste_in_guj: data['Caste In Gujarati'] || null,
            category: data['Category'] || null,
            admission_date: parseAndFormatDate(data['Admission Date']),
            admission_class_id: null,
            secondary_mobile: parseSafeInt(data['Other Mobile No']),
            privious_school: data['Previous School'] || null,
            privious_school_in_guj: data['Previous School In Gujarati'] || null,
            address: data['Address'] || null,
            district: data['District'] || null,
            city: data['City'] || null,
            state: data['State'] || null,
            postal_code: data['Postal Code'] || null,
            bank_name: data['Bank Name'] || null,
            account_no: parseSafeInt(data['Account Number']),
            IFSC_code: data['IFSC Code'] || null,
          },
        }
      }
      try {
        // const paylaod = await CreateValidatorForUpload.validate(transformedData)
        validatedData.push(transformedData)
      } catch (validationError) {
        errors.push({
          row: index + 1,
          message: validationError.message || 'Validation failed',
          errors: validationError.messages || [],
        })
      }
    }
    if (errors.length) {
      return ctx.response.status(400).json({ errors })
    }
    // Start transaction after validation
    const trx = await db.transaction()
    try {
      for (const validated_student of validatedData) {
        const student_data = await Students.create(
          {
            ...validated_student.students_data,
            enrollment_code: await generateUniqueEnrollmentCode({
              prefix: school.branch_code,
              trx,
            }),
          } as any,
          { client: trx }
        )

        await StudentMeta.create(
          {
            ...validated_student.student_meta_data,
            student_id: student_data.id,
          } as any,
          { client: trx }
        )

        await StudentEnrollments.create(
          {
            student_id: student_data.id,
            division_id: division_id,
            academic_session_id: academic_session_id as number,
            status: 'pursuing',
            is_new_admission: false,
          },
          { client: trx }
        )
      }

      await trx.commit()
      return ctx.response.status(201).json({
        message: 'Bulk upload successful.',
        totalInserted: validatedData.length,
      })
    } catch (error) {
      await trx.rollback()
      console.error('[BulkUpload ERROR]', error)
      return ctx.response
        .status(500)
        .json({ message: 'Internal server error', error: error.message, code: error.code, sqlMessage: error.sqlMessage })
    }
  }

  public async exportToExcel(ctx: HttpContext) {
    const { fields, export_all_divisions } = ctx.request.only(['fields', 'export_all_divisions'])

    const division_id = ctx.params.class_id
    const academic_session_id = ctx.params.academic_session_id

    if (!division_id || !fields) {
      return ctx.response.badRequest({ error: 'Class ID and fields are required' })
    }

    let academic_session = await AcademicSession.query()
      .where('id', academic_session_id as number)
      .andWhere('school_id', ctx.auth.user!.school_id as number)
      .first()

    if (!academic_session) {
      return ctx.response.badRequest({ error: 'Academic session not found' })
    }

    let division = await Divisions.query()
      .preload('class', (query) => {
        query
          .select('id', 'class')
          .where('school_id', ctx.auth.user!.school_id as number)
          .andWhereNotNull('class') // Ensure the class value is not null
      })
      .where('id', division_id)
      // .andWhere('school_id', ctx.auth.user!.school_id as number)
      .andWhereHas('class', (query) => {
        query.whereNotNull('class') // Ensure the class value exists
      })
      .first()

    if (!division) {
      return ctx.response.badRequest({ error: 'Class not found' })
    }

    let class_students: StudentEnrollments[] = []
    let divisions: Divisions[] = []

    if (export_all_divisions) {
      divisions = await Divisions.query()
        .preload('class', (query) => {
          query
            .select('id', 'class')
            .where('school_id', ctx.auth.user!.school_id as number)
            .andWhereNotNull('class')
        })
        .where('class_id', division.class_id)
        .andWhereHas('class', (query) => {
          query.whereNotNull('class')
        })

      const divisionIds = divisions.map((d) => d.id)

      class_students = await StudentEnrollments.query()
        .whereIn('division_id', divisionIds)
        .andWhere('academic_session_id', academic_session_id as number)
        .preload('student', (studentQuery) => {
          studentQuery.preload('student_meta')
        })
    } else {
      divisions = [division]
      class_students = await StudentEnrollments.query()
        .where('division_id', division_id)
        .andWhere('academic_session_id', academic_session_id as number)
        .preload('student', (studentQuery) => {
          studentQuery.preload('student_meta')
        })
    }

    if (class_students.length === 0) {
      return ctx.response.badRequest({ error: 'No students found' })
    }

    const divisionsMap = new Map(divisions.map((d) => [d.id, d]))

    // Merge `students` and `student_meta` data by `student_id`
    const mergedData = class_students.map((enrollment: StudentEnrollments) => {
      const studentMeta = enrollment.student.student_meta
      return { 
        ...enrollment.student.serialize(), 
        ...(studentMeta ? studentMeta.serialize() : {}),
        _division_id: enrollment.division_id 
      }
    })

    // Create Excel Workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Class Data')

    // Prepare Headers
    const headers = ['class', 'division', ...fields.students, ...fields.student_meta]
    worksheet.addRow(headers)

    // Add Data
    mergedData.forEach((data: any) => {
      const currentDiv = divisionsMap.get(data._division_id)
      const rowValues = headers.map((header: string) => {
        if (header === 'class') return currentDiv?.class?.class || division.class.class
        if (header === 'division') return currentDiv?.division || ''
        return (data as Record<string, any>)[header] || ''
      })
      worksheet.addRow(rowValues)
    })

    // Generate File Buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Generate unique value for the file name
    const uniqueValue = new Date().getTime()
    const filename = export_all_divisions
      ? `class_${division.class.class}_all_divisions_data_${uniqueValue}.xlsx`
      : `class_${division.class.class}-${division.division}_data_${uniqueValue}.xlsx`

    // Send Excel File as Response
    ctx.response.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    ctx.response.header(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    )

    return ctx.response.send(buffer)
  }
}
