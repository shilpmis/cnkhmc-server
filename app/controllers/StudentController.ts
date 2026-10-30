import Classes from '#models/Classes'
import Quota from '#models/Quota'
import { STUDENT_COLUMNS, normalizeHead, readSheetRow, type StudentColumnKind } from '#services/student_columns'
import Access from '#services/access_control'
import type { HttpContext } from '@adonisjs/core/http'
import {
  CreateValidatorForMultipleStundets,
  CreateValidatorForUpload,
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
import Schools from '#models/Schools'
import Divisions from '#models/Divisions'
import SpacesService from '#services/SpacesService'
import StudentFeesMaster from '#models/StudentFeesMaster'
import FeesPlan from '#models/FeesPlan'
import { DateTime } from 'luxon'

// Helper function to generate unique enrollment codes
export interface GenerateUniqueEnrollmentCodeParams {
  school_id: number
  trx: any // Replace `any` with the specific type for the transaction object if available
}

export async function generateUniqueEnrollmentCode({
  school_id,
  trx,
}: GenerateUniqueEnrollmentCodeParams): Promise<string> {
  const school = await Schools.query({ client: trx }).where('id', school_id).first()
  let format = school?.enrollment_number_format

  if (!format) {
    // Fallback if no format is provided
    const maxAttempts = 10
    let attempts = 0
    let prefix = 'ENR'

    while (attempts < maxAttempts) {
      const randomPart = Math.floor(1000 + Math.random() * 9000)
      const enrollmentCode = `${prefix}${randomPart}`
      const existingStudent = await Students.query({ client: trx }).where('enrollment_code', enrollmentCode).first()
      if (!existingStudent) return enrollmentCode
      attempts++
    }

    const timestamp = Date.now().toString().slice(-5)
    const randomPart = Math.floor(1000 + Math.random() * 9000)
    return `${prefix}${timestamp}${randomPart}`
  }

  const currentYear = new Date().getFullYear()
  const year4 = currentYear.toString()
  const year2 = year4.slice(-2)

  let codePrefix = format.replace(/{YYYY}/g, year4).replace(/{YY}/g, year2)

  if (codePrefix.includes('{SEQ}')) {
    const prefixBeforeSeq = codePrefix.split('{SEQ}')[0]
    
    // Find the highest sequence number used for this prefix
    const latestStudent = await Students.query({ client: trx })
      .where('enrollment_code', 'LIKE', `${prefixBeforeSeq}%`)
      .orderBy('enrollment_code', 'desc')
      .first()
    
    let nextSeq = 1
    if (latestStudent && latestStudent.enrollment_code) {
      // Extract the sequence number part assuming {SEQ} is at the end or followed by fixed text
      // E.g., if format is ABC-{SEQ}, and we have ABC-0004
      const match = latestStudent.enrollment_code.substring(prefixBeforeSeq.length).match(/^(\d+)/)
      if (match) {
         nextSeq = parseInt(match[1], 10) + 1
      }
    }
    
    const seqString = nextSeq.toString().padStart(4, '0') // 4 digit padding
    return codePrefix.replace(/{SEQ}/g, seqString)
  }

  // If no {SEQ} in format, append random numbers to ensure uniqueness
  const maxAttempts = 10
  let attempts = 0
  while (attempts < maxAttempts) {
    const randomPart = Math.floor(1000 + Math.random() * 9000)
    const enrollmentCode = `${codePrefix}${randomPart}`
    const existingStudent = await Students.query({ client: trx }).where('enrollment_code', enrollmentCode).first()
    if (!existingStudent) return enrollmentCode
    attempts++
  }
  
  const timestamp = Date.now().toString().slice(-5)
  const randomPart = Math.floor(1000 + Math.random() * 9000)
  return `${codePrefix}${timestamp}${randomPart}`
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parsedStr = new Date(str)
    if (!isNaN(parsedStr.getTime()) && parsedStr.toISOString().split('T')[0] === str) {
      return str
    }
  }

  // Match DD-MM-YYYY or MM-DD-YYYY or DD/MM/YYYY or MM/DD/YYYY
  const parts = str.split(/[-/.]/)
  if (parts.length === 3) {
    let dayOrMonth1 = parseInt(parts[0], 10)
    let dayOrMonth2 = parseInt(parts[1], 10)
    let year = parseInt(parts[2], 10)

    if (!isNaN(dayOrMonth1) && !isNaN(dayOrMonth2) && !isNaN(year)) {
      if (parts[2].length === 2) {
        year += year < 50 ? 2000 : 1900
      }

      let candidateStr: string
      if (dayOrMonth2 > 12 && dayOrMonth1 <= 12) {
        // Likely MM/DD/YYYY
        candidateStr = `${year}-${String(dayOrMonth1).padStart(2, '0')}-${String(dayOrMonth2).padStart(2, '0')}`
      } else {
        // Safely default to DD-MM-YYYY
        candidateStr = `${year}-${String(dayOrMonth2).padStart(2, '0')}-${String(dayOrMonth1).padStart(2, '0')}`
      }
      const parsedCandidate = new Date(candidateStr)
      if (!isNaN(parsedCandidate.getTime()) && parsedCandidate.toISOString().split('T')[0] === candidateStr) {
        return candidateStr
      }
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

function parseSafeGender(val: any): any {
  if (val === null || val === undefined || val === '') return null
  const str = String(val).trim().toLowerCase()
  if (['male', 'm'].includes(str)) return 'Male'
  if (['female', 'f'].includes(str)) return 'Female'
  return null
}

function parseSafeCategory(val: any): any {
  if (val === null || val === undefined || val === '') return null
  let str = String(val).trim().toUpperCase()
  if (!str || str === 'NULL') return null
  
  if (['OPEN', 'GENERAL', 'GEN'].includes(str) || str.includes('EWS')) return 'OPEN'
  if (['ST', 'S.T.', 'SCHEDULED TRIBE'].includes(str)) return 'ST'
  if (['SC', 'S.C.', 'SCHEDULED CASTE'].includes(str)) return 'SC'
  if (['OBC', 'O.B.C.', 'SEBC', 'S.E.B.C.', 'BAXI PANCH', 'OTHER BACKWARD CLASS'].includes(str)) return 'OBC'
  
  return null
}

const SCIENTIFIC_NOTATION = /^[+-]?\d+(\.\d+)?e[+-]?\d+$/i

/** One cell of the student sheet, read as the kind of value its head holds. */
function parseSheetValue(val: any, kind: StudentColumnKind): any {
  // the sheet writes "-" for an empty cell
  if (val === null || val === undefined || (typeof val === 'string' && ['', '-'].includes(val.trim()))) {
    return kind === 'bool' ? false : null
  }
  switch (kind) {
    case 'int':
      return parseSafeInt(val)
    case 'float':
      return parseSafeFloat(val)
    case 'date':
      return parseAndFormatDate(val)
    case 'gender':
      return parseSafeGender(val)
    case 'category':
      return parseSafeCategory(val)
    case 'blood':
      return parseSafeBloodGroup(val)
    case 'aadhar':
      return parseSafeAadhar(val)
    case 'bool':
      return ['true', 'yes', 'y', '1'].includes(String(val).trim().toLowerCase())
    default:
      return String(val).trim()
  }
}

function parseAdmissionYear(yearStr: string | null | undefined): number | null {
  if (!yearStr) return null
  const trimmed = yearStr.trim()
  if (trimmed === '') return null

  // E.g. "2025-2026" or "2025-26" or "2025/2026" or "2025/26"
  const matchRange = trimmed.match(/^(\d{4})[-/]\d{2,4}$/)
  if (matchRange) {
    return parseInt(matchRange[1], 10)
  }

  // E.g. "2025"
  const matchSingle = trimmed.match(/^(\d{4})$/)
  if (matchSingle) {
    return parseInt(matchSingle[1], 10)
  }

  return null
}

export default class StundetsController {
  async indexClassStudents(ctx: HttpContext) {
    const division_id = ctx.params.division_id
    const academic_year = ctx.params.academic_year
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

    const search = String(ctx.request.input('search', '')).trim()

    try {
      let studentsQuery = await StudentEnrollments.query()
        .where('division_id', division_id)
        .andWhere('academic_year', academic_year as number)
        .if(search, (q) =>
          q.whereHas('student', (sq) => {
            const term = `%${search}%`
            sq.whereILike('first_name', term)
              .orWhereILike('middle_name', term)
              .orWhereILike('last_name', term)
              .orWhereRaw("CONCAT_WS(' ', first_name, middle_name, last_name) LIKE ?", [term])
              .orWhereILike('father_name', term)
              .orWhereRaw('CAST(gr_no AS CHAR) LIKE ?', [term])
              .orWhereRaw('CAST(first_year_roll_number AS CHAR) LIKE ?', [term])
              .orWhereRaw('CAST(second_year_roll_number AS CHAR) LIKE ?', [term])
              .orWhereRaw('CAST(third_year_roll_number AS CHAR) LIKE ?', [term])
              .orWhereRaw('CAST(fourth_year_roll_number AS CHAR) LIKE ?', [term])
              .orWhereRaw('CAST(aadhar_no AS CHAR) LIKE ?', [term])
              .orWhereRaw('CAST(primary_mobile AS CHAR) LIKE ?', [term])
          })
        )
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
    let acadamic_session_id = ctx.request.qs().academic_session || ctx.request.qs().academic_year

    const is_meta_req = String(ctx.request.input('student_meta', false)) === 'true' || ctx.request.input('student_meta') === true

    if (school_id !== ctx.auth.user?.school_id) {
      return ctx.response
        .status(401)
        .json({ message: 'You are not authorized to perform this action!' })
    }

    try {
      // Fetch the student enrollment record
      let studentEnrollment = null
      if (acadamic_session_id) {
        studentEnrollment = await StudentEnrollments.query()
          .where('student_id', student_id)
          .andWhere('academic_year', acadamic_session_id)
          .preload('division', (dq) => dq.preload('class'))
          .first()
      }

      if (!studentEnrollment) {
        studentEnrollment = await StudentEnrollments.query()
          .where('student_id', student_id)
          .orderBy('id', 'desc')
          .preload('division', (dq) => dq.preload('class'))
          .first()
      }

      let studentQuery = Students.query().where('id', student_id)
      if (is_meta_req) {
        studentQuery = studentQuery.preload('student_meta')
      }
      studentQuery = studentQuery.preload('academic_class', (q) => {
        q.preload('division', (dq) => dq.preload('class')).orderBy('id', 'desc')
      })

      const student = await studentQuery.first()
      if (!student) {
        return ctx.response.status(404).json({ message: 'Student not found!' })
      }

      const serializedStudent = student.serialize()
      const className =
        studentEnrollment?.division?.class?.class ||
        studentEnrollment?.division?.division ||
        studentEnrollment?.division?.aliases ||
        ''

      const combinedData = {
        ...serializedStudent,
        class_id: studentEnrollment ? studentEnrollment.division_id : null,
        class_name: className,
        enrollment_no: student.enrollment_code,
        division: studentEnrollment ? studentEnrollment.division_id : null,
        academic_year: studentEnrollment ? studentEnrollment.academic_year : null,
      }

      return ctx.response.status(200).json({
        success: true,
        data: combinedData,
        ...combinedData,
      })
    } catch (error) {
      return ctx.response
        .status(500)
        .json({ message: 'Error fetching student', error: error.message })
    }
  }

  async fetchStudentInDetail(ctx: HttpContext) {
    let student_id = ctx.params.student_id
    let academic_year = ctx.request.qs().academic_session || ctx.request.qs().academic_year

    if (!student_id) {
      return ctx.response.status(400).json({ message: 'Student ID is required' })
    }

    try {
      let query = StudentEnrollments.query()
        .preload('quota')
        .preload('student', (studentQuery) => {
          studentQuery.preload('student_meta')
        })
        .preload('division', (divisionQuery) => {
          divisionQuery.preload('class')
        })
        .preload('fees_status', (feesStatusQuery) => {
          feesStatusQuery.preload('paid_fees')
          feesStatusQuery.preload('fees_plan')
          if (academic_year) {
            feesStatusQuery.where('academic_year', academic_year as number)
          }
        })
        .preload('provided_concession', (cQuery) => {
          cQuery.preload('fees_plan', (fpQuery) => {
            if (academic_year) {
              fpQuery.where('academic_year', academic_year as number)
            }
          })
          if (academic_year) {
            cQuery.where('academic_year', academic_year as number)
          }
        })
        .where('student_id', student_id)

      if (academic_year) {
        query = query.andWhere('academic_year', academic_year as number)
      } else {
        query = query.orderBy('id', 'desc')
      }

      let detailed_student_data = await query.first()

      if (!detailed_student_data) {
        // Fallback: load student directly
        const fallbackStudent = await Students.query()
          .where('id', student_id)
          .preload('student_meta')
          .preload('academic_class', (ac) => ac.preload('division', (d) => d.preload('class')).orderBy('id', 'desc'))
          .first()

        if (!fallbackStudent) {
          return ctx.response.status(404).json({ message: 'Student not found' })
        }

        const serialized = fallbackStudent.serialize()
        return ctx.response.status(200).json({
          success: true,
          data: serialized,
          ...serialized,
        })
      }

      const serializedData = detailed_student_data.serialize()
      return ctx.response.status(200).json({
        success: true,
        data: serializedData,
        ...serializedData,
      })
    } catch (error) {
      return ctx.response.status(500).json({ message: 'Error fetching student detail', error: error.message })
    }
  }

  async createSingleStudent(ctx: HttpContext) {
    console.log('--- Hit createSingleStudent ---')
    console.log('User Role ID:', ctx.auth.user?.role_id)
    const academic_year = ctx.request.qs().academic_session
    const trx = await db.transaction()
    try {
    // Session check removed

      let school_id = ctx.auth.user!.school_id

      let payload = await CreateValidatorStundet.validate(ctx.request.body())

      let std = await Divisions.query()
        .where('id', payload.students_data.class_id)
        // .andWhere('school_id', ctx.auth.user!.school_id as number)
        .first()

      if (!std) {
        return ctx.response.status(404).json({ message: 'Class not found.' })
      }
      
      console.log('Role check array includes?', [1, 2, 3, 4, 5, 8, 11].includes(Number(ctx.auth.user!.role_id)))

      if (!(await Access.allows(ctx.auth.user!, 'create', 'Student', [1, 2, 3, 4, 5, 8, 11]))) {
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
        } as any,
        { client: trx }
      )

      // Create student meta data within the transaction
      let student_meta_data_payload = await StudentMeta.create(
        { ...payload.student_meta_data, student_id: student_data.id } as any,
        { client: trx }
      )

      // Resolve enrollment academic year from admission_year if valid
      let enrollment_academic_year = Number(academic_year)
      const parsedYear = parseAdmissionYear(payload.student_meta_data?.admission_year)
      if (parsedYear !== null) {
        enrollment_academic_year = parsedYear
      }

      // Extract assigned quota and fee template if provided
      const rawPayload = payload as any
      const assignedQuotaId = rawPayload.quota_id || rawPayload.students_data?.quota_id || null
      const assignedFeesPlanId = rawPayload.fees_plan_id || rawPayload.students_data?.fees_plan_id || null

      // Add a row in the student_enrollments table within the transaction
      await StudentEnrollments.create(
        {
          student_id: student_data.id,
          division_id: class_id,
          academic_year: enrollment_academic_year,
          quota_id: assignedQuotaId ? Number(assignedQuotaId) : null,
          is_new_admission: true,
          status: 'pursuing',
          remarks: remarks || '',
        },
        { client: trx }
      )

      // If a Fee Template (FeesPlan) was selected, initialize and lock it to the student under cohort grandfathering
      if (assignedFeesPlanId) {
        const plan = await FeesPlan.query({ client: trx }).where('id', assignedFeesPlanId).first()
        if (plan) {
          await StudentFeesMaster.create(
            {
              student_id: student_data.id,
              fees_plan_id: plan.id,
              academic_year: enrollment_academic_year,
              total_amount: Number(plan.total_amount),
              paid_amount: 0,
              discounted_amount: 0,
              due_amount: Number(plan.total_amount),
              status: 'Pending',
              is_locked: true,
              locked_at: DateTime.now(),
              locked_amount: Number(plan.total_amount),
              locked_academic_year: enrollment_academic_year,
            },
            { client: trx }
          )
        }
      }

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

    if (std.school_id !== school_id || !(await Access.allows(ctx.auth.user!, 'create', 'Student', [1, 2, 3, 4, 5, 8, 11]))) {
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
          student_meta = await student_meta.merge(payload.student_meta_data as any).save()

          if (payload.student_meta_data.admission_year !== undefined) {
            const parsedYear = parseAdmissionYear(payload.student_meta_data.admission_year)
            if (parsedYear !== null) {
              StudentEnrollment.useTransaction(trx)
              StudentEnrollment.academic_year = parsedYear
              await StudentEnrollment.save()
            }
          }
        }
      }

      // Handle Quota and Fee Template update if provided
      const updatePayload = payload as any
      const assignedQuotaId = updatePayload.quota_id ?? updatePayload.students_data?.quota_id
      if (assignedQuotaId !== undefined) {
        StudentEnrollment.useTransaction(trx)
        StudentEnrollment.quota_id = assignedQuotaId ? Number(assignedQuotaId) : null
        await StudentEnrollment.save()
      }

      const assignedFeesPlanId = updatePayload.fees_plan_id ?? updatePayload.students_data?.fees_plan_id
      if (assignedFeesPlanId) {
        const plan = await FeesPlan.query({ client: trx }).where('id', assignedFeesPlanId).first()
        if (plan) {
          let feeMaster = await StudentFeesMaster.query({ client: trx }).where('student_id', student_id).first()
          if (feeMaster) {
            await feeMaster.useTransaction(trx).merge({
              fees_plan_id: plan.id,
              total_amount: Number(plan.total_amount),
              due_amount: Math.max(
                0,
                Number(plan.total_amount) - Number(feeMaster.paid_amount) - Number(feeMaster.discounted_amount)
              ),
              is_locked: true,
              locked_at: DateTime.now(),
              locked_amount: Number(plan.total_amount),
              locked_academic_year: plan.academic_year,
            }).save()
          } else {
            await StudentFeesMaster.create({
              student_id: Number(student_id),
              fees_plan_id: plan.id,
              academic_year: plan.academic_year,
              total_amount: Number(plan.total_amount),
              paid_amount: 0,
              discounted_amount: 0,
              due_amount: Number(plan.total_amount),
              status: 'Pending',
              is_locked: true,
              locked_at: DateTime.now(),
              locked_amount: Number(plan.total_amount),
              locked_academic_year: plan.academic_year,
            }, { client: trx })
          }
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
    const academic_year = ctx.params.academic_year

    if (!(await Access.allows(ctx.auth.user!, 'create', 'Student', [1, 2, 3, 4, 5, 8, 11]))) {
      return ctx.response
        .status(401)
        .json({ message: 'You are not authorized to perform this action!' })
    }

    if (!division_id) {
      return ctx.response.status(400).json({ message: 'Class ID is required.' })
    }

    // Session check removed

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
    let jsonData: any[] = []

    if (file.extname === 'xlsx' || file.extname === 'xls') {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.readFile(filePath)
      const worksheet = workbook.getWorksheet(1)
      const headers: string[] = []

      worksheet?.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = cell.text ? cell.text.trim() : `Col_${colNumber}`
      })

      worksheet?.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return
        const rowData: any = {}
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber]
          if (header) {
            let val = cell.value
            if (val !== null && val !== undefined && typeof val === 'object' && !(val instanceof Date)) {
              if ('text' in val && typeof (val as any).text === 'string') val = (val as any).text
              else if ('result' in val) val = (val as any).result
              else if ('richText' in val && Array.isArray((val as any).richText)) val = (val as any).richText.map((r: any) => r.text).join('')
              else if ('hyperlink' in val) val = (val as any).text || (val as any).hyperlink
            }
            rowData[header] = val
          }
        })
        if (Object.values(rowData).some((v) => v !== null && v !== undefined && v !== '')) {
          jsonData.push(rowData)
        }
      })
    } else {
      jsonData = await parseAndReturnJSON(filePath)
    }

    if (!jsonData.length) {
      return ctx.response.badRequest({ message: 'File is empty or improperly formatted.' })
    }

    const isCollege = school.school_type === 'COLLEGE'
    let validatedData = []
    let errors = []

    // Quotas of this school by name, so the ADMISSION_QUOTA head can be matched
    const quotaRows = await Quota.query().where('school_id', school_id as number)
    const quotaByName = new Map(quotaRows.map((q) => [normalizeHead(q.name), q.id]))
    const rowQuotaIds: Array<number | null> = []
    const seenAadhar = new Map<string, number>()
    const seenDise = new Map<string, number>()

    for (const [index, rawRow] of jsonData.entries()) {
      const data = readSheetRow(rawRow)
      const students_data: Record<string, any> = {
        school_id: school_id as number,
        is_active: true,
        student_type: isCollege ? 'COLLEGE' : 'SCHOOL',
      }
      const student_meta_data: Record<string, any> = {}
      for (const col of STUDENT_COLUMNS) {
        if (col.table === 'derived') continue
        const target = col.table === 'students' ? students_data : student_meta_data
        target[col.key] = parseSheetValue(data[col.key], col.kind)
      }
      if (typeof data.category_merit === 'string') {
        const rank = data.category_merit.match(/(\d+)/)
        student_meta_data.category_merit = rank ? Number(rank[1]) : null
      }
      students_data.first_name = students_data.first_name || 'Student'
      students_data.last_name = students_data.last_name || ''
      students_data.primary_mobile = students_data.primary_mobile || 9999999999
      // Excel shows long numbers as 5.15293E+11 and keeps only those digits: the real number is gone, so refuse it
      const rowProblems: { field: string; message: string }[] = []
      for (const col of STUDENT_COLUMNS) {
        const cell = data[col.key]
        if (col.table !== 'derived' && typeof cell === 'string' && SCIENTIFIC_NOTATION.test(cell.trim())) {
          rowProblems.push({ field: col.header, message: `"${cell.trim()}" is in scientific notation, so its digits are lost. Format the column as Text in Excel and enter the full number.` })
        }
      }
      // the same Aadhaar / U-DISE number cannot belong to two students
      for (const [key, seen, head] of [
        ['aadhar_no', seenAadhar, 'STUDENT_AADHAAR_CARDNO'],
        ['aadhar_dise_no', seenDise, 'STUDENT_U_DIESNO'],
      ] as const) {
        const value = (key === 'aadhar_no' ? students_data : student_meta_data)[key]
        if (value !== null && value !== undefined) {
          const earlier = seen.get(String(value))
          if (earlier !== undefined) rowProblems.push({ field: head, message: `${value} is already used by row ${earlier}` })
          else seen.set(String(value), index + 1)
        }
      }
      if (rowProblems.length) {
        errors.push({ row: index + 1, message: rowProblems.map((p) => `${p.field}: ${p.message}`).join('; '), errors: rowProblems })
        continue
      }

      const transformedData = { students_data, student_meta_data }
      const quotaId = data.admission_quota ? quotaByName.get(normalizeHead(data.admission_quota)) ?? null : null
      try {
        const payload = await CreateValidatorForUpload.validate(transformedData)
        validatedData.push(payload)
        rowQuotaIds.push(quotaId)
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
      for (const [validatedIndex, validated_student] of validatedData.entries()) {
        const student_data = await Students.create(
          {
            ...validated_student.students_data,
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

        let enrollment_academic_year = Number(academic_year)
        const parsedYear = parseAdmissionYear(validated_student.student_meta_data?.admission_year)
        if (parsedYear !== null) {
          enrollment_academic_year = parsedYear
        }

        await StudentEnrollments.create(
          {
            student_id: student_data.id,
            division_id: division_id,
            academic_year: enrollment_academic_year,
            status: 'pursuing',
            is_new_admission: false,
            quota_id: rowQuotaIds[validatedIndex] ?? null,
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
      if (error.code === 'ER_DUP_ENTRY') {
        const key = String(error.sqlMessage || '')
        const head = key.includes('aadhar_dise_no')
          ? 'STUDENT_U_DIESNO'
          : key.includes('aadhar_no')
            ? 'STUDENT_AADHAAR_CARDNO'
            : key.includes('account_no')
              ? 'Bank_Account_Number'
              : key.includes('enrollment_code')
                ? 'Enrollment number'
                : 'a unique field'
        const message = `Nothing was saved: a student in the file has the same ${head} as a student that already exists. Remove or correct that value and upload again.`
        return ctx.response.status(400).json({ message, errors: [{ row: 0, message, errors: [{ field: head, message }] }] })
      }
      return ctx.response
        .status(500)
        .json({ message: 'Internal server error', error: error.message, code: error.code, sqlMessage: error.sqlMessage })
    }
  }

  public async exportToExcel(ctx: HttpContext) {
    const { fields, export_all_divisions } = ctx.request.only(['fields', 'export_all_divisions'])

    const division_id = ctx.params.class_id
    const academic_year = ctx.params.academic_year

    if (!division_id || !fields) {
      return ctx.response.badRequest({ error: 'Class ID and fields are required' })
    }

    // Session check removed

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
        .andWhere('academic_year', academic_year as number)
        .preload('quota')
        .preload('student', (studentQuery) => {
          studentQuery.preload('student_meta')
        })
    } else {
      divisions = [division]
      class_students = await StudentEnrollments.query()
        .where('division_id', division_id)
        .andWhere('academic_year', academic_year as number)
        .preload('quota')
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
        _division_id: enrollment.division_id,
        _quota_name: enrollment.quota?.name ?? ''
      }
    })

    // Create Excel Workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Class Data')

    // Prepare Headers
    // Only the heads of the final student sheet can be exported, in sheet order
    const requested = new Set<string>([...(fields.students || []), ...(fields.student_meta || [])])
    const headers = STUDENT_COLUMNS.map((col) => col.key).filter((key) => requested.has(key))
    worksheet.addRow(headers)

    const dateFields = [
      'birth_date',
      'admission_date',
      'student_lc_date',
      'internship_provisional_date',
      'internship_starting_date',
      'internship_completion_date',
      'final_bhms_passing_date',
      'admission_cancel_date',
      'admission_transfer_date',
    ]

    const textFields = [
      'aadhar_no',
      'primary_mobile',
      'secondary_mobile',
      'aadhar_dise_no',
      'gr_no',
      'roll_number',
      'account_no',
      'IFSC_code',
      'pen',
      'abha_card_no',
      'school_udise_no',
      'father_mobile',
      'mother_mobile',
      'guardian_mobile',
      'neet_roll_no',
      'neet_application_number',
      'ayush_id',
      'abc_id',
      'admission_number',
      'enrollment_code',
      'student_code',
      'student_lc_no',
      'internship_provisional_number',
      'postal_code',
      'permanent_pincode',
      'university_spid_no',
      'roll_no_internship',
      'bank_branch_pincode',
    ]

    const formatStudentDate = (val: any): string => {
      if (val === null || val === undefined || val === '') return ''
      if (val instanceof Date) {
        if (isNaN(val.getTime())) return ''
        const y = val.getUTCFullYear()
        const m = String(val.getUTCMonth() + 1).padStart(2, '0')
        const d = String(val.getUTCDate()).padStart(2, '0')
        return `${d}/${m}/${y}`
      }
      if (typeof val === 'string') {
        const trimmed = val.trim()
        if (!trimmed) return ''
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed
        const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
        if (match) {
          const [, y, m, d] = match
          return `${d}/${m}/${y}`
        }
        const parsed = new Date(trimmed)
        if (!isNaN(parsed.getTime())) {
          const y = parsed.getFullYear()
          const m = String(parsed.getMonth() + 1).padStart(2, '0')
          const d = String(parsed.getDate()).padStart(2, '0')
          return `${d}/${m}/${y}`
        }
        return trimmed
      }
      return String(val)
    }

    // Add Data
    mergedData.forEach((data: any) => {
      const currentDiv = divisionsMap.get(data._division_id)
      const rowValues = headers.map((header: string) => {
        if (header === 'class') return currentDiv?.class?.class || division.class.class
        if (header === 'full_name') {
          return [data.first_name, data.middle_name, data.last_name].filter(Boolean).join(' ')
        }
        if (header === 'admission_quota') return data.admission_quota || data._quota_name || ''
        
        const rawVal = (data as Record<string, any>)[header]
        if (rawVal === null || rawVal === undefined || rawVal === '') return ''

        if (dateFields.includes(header)) {
          return formatStudentDate(rawVal)
        }
        if (textFields.includes(header)) {
          return String(rawVal).trim()
        }
        return rawVal
      })
      const addedRow = worksheet.addRow(rowValues)
      headers.forEach((header, idx) => {
        if (dateFields.includes(header) || textFields.includes(header)) {
          const cell = addedRow.getCell(idx + 1)
          cell.numFmt = '@'
        }
      })
    })

    // Generate File Buffer
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer())

    // Generate unique value for the file name
    const uniqueValue = new Date().getTime()
    const filename = export_all_divisions
      ? `class_${division.class.class}_all_divisions_data_${uniqueValue}.xlsx`
      : `class_${division.class.class}-${division.division}_data_${uniqueValue}.xlsx`

    // Upload to DigitalOcean Spaces
    try {
      const uploadResult = await SpacesService.uploadExport('students', filename, buffer)
      ctx.response.header('x-cloud-url', uploadResult.url)
      ctx.response.header('Access-Control-Expose-Headers', 'x-cloud-url')
    } catch (e) {
      console.error('[StudentController] Failed to upload export to Spaces:', e)
    }

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

  public async bulkAssignPracticalBatch(ctx: HttpContext) {
    const payload = ctx.request.body()
    const { student_ids, practical_batch } = payload

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return ctx.response.status(400).json({ message: 'student_ids must be a non-empty array.' })
    }

    const trx = await db.transaction()
    try {
      await Students.query({ client: trx })
        .whereIn('id', student_ids)
        .update({ practical_batch: practical_batch || null })

      await trx.commit()
      return ctx.response.json({ message: 'Students assigned to batch successfully!' })
    } catch (e) {
      await trx.rollback()
      return ctx.response.status(500).json({ message: 'Failed to assign students to batch.', error: e.message })
    }
  }
}
