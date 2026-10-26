import Students from '#models/Students'
import KavachaColumns from '#services/kavacha_columns'
import Staff from '#models/Staff'
import type { HttpContext } from '@adonisjs/core/http'

export default class GlobalSearchController {
  public async getStuentSearchResults({ auth, request, response }: HttpContext) {
    try {
      const school_id = auth.user?.school_id || request.input('school_id')
      const {
        academic_year,
        name,
        gr_no,
        aadhar_no,
        primary_mobile,
        enrollment_code,
        query: genericQuery,
        search,
      } = request.qs()

      if (!school_id) {
        return response.badRequest({ message: 'Invalid request: School ID is missing.' })
      }

      const studentsQuery = Students
        .query()
        .preload('academic_class', (query) => {
          query.preload('division', (dQuery) => {
            dQuery.preload('class')
          })
          if (academic_year) {
            query.where('academic_year', academic_year)
          }
          query.orderBy('id', 'desc')
        })
        .preload('student_meta')
        .select([
          'id',
          'enrollment_code',
          'first_name',
          'middle_name',
          'last_name',
          'father_name',
          'mother_name',
          'gender',
          'gr_no',
          'profile_photo',
          'first_year_roll_number',
          'second_year_roll_number',
          'third_year_roll_number',
          'fourth_year_roll_number',
          'primary_mobile',
        ])
        .where('school_id', school_id as number)

      const searchQuery = (genericQuery || search || '').trim()

      if (searchQuery) {
        const tokens = searchQuery.split(/\s+/).filter(Boolean)
        studentsQuery.andWhere((subQuery) => {
          if (tokens.length > 1) {
            subQuery.where((tokQuery) => {
              for (const tok of tokens) {
                tokQuery.where((tq) => {
                  tq.whereILike('first_name', `%${tok}%`)
                    .orWhereILike('middle_name', `%${tok}%`)
                    .orWhereILike('last_name', `%${tok}%`)
                    .orWhereILike('father_name', `%${tok}%`)
                    .orWhere('enrollment_code', 'LIKE', `%${tok}%`)
                    .orWhere('gr_no', 'LIKE', `%${tok}%`)
                })
              }
            })
            subQuery.orWhereRaw("CONCAT_WS(' ', first_name, middle_name, last_name) LIKE ?", [`%${searchQuery}%`])
            subQuery.orWhereRaw("CONCAT_WS(' ', first_name, last_name) LIKE ?", [`%${searchQuery}%`])
            subQuery.orWhereRaw("CONCAT_WS(' ', last_name, first_name) LIKE ?", [`%${searchQuery}%`])
          } else {
            subQuery
              .whereILike('first_name', `%${searchQuery}%`)
              .orWhereILike('middle_name', `%${searchQuery}%`)
              .orWhereILike('last_name', `%${searchQuery}%`)
              .orWhereILike('father_name', `%${searchQuery}%`)
              .orWhere('enrollment_code', 'LIKE', `%${searchQuery}%`)
              .orWhere('gr_no', 'LIKE', `%${searchQuery}%`)
              .orWhere('primary_mobile', 'LIKE', `%${searchQuery}%`)
          }
        })
      }

      if (name && (!searchQuery || name.trim() !== searchQuery)) {
        const nameTrimmed = name.trim()
        const tokens = nameTrimmed.split(/\s+/).filter(Boolean)
        studentsQuery.andWhere((subQuery) => {
          if (tokens.length > 1) {
            subQuery.where((tokQuery) => {
              for (const tok of tokens) {
                tokQuery.where((tq) => {
                  tq.whereILike('first_name', `%${tok}%`)
                    .orWhereILike('middle_name', `%${tok}%`)
                    .orWhereILike('last_name', `%${tok}%`)
                    .orWhereILike('father_name', `%${tok}%`)
                })
              }
            })
            subQuery.orWhereRaw("CONCAT_WS(' ', first_name, middle_name, last_name) LIKE ?", [`%${nameTrimmed}%`])
            subQuery.orWhereRaw("CONCAT_WS(' ', first_name, last_name) LIKE ?", [`%${nameTrimmed}%`])
          } else {
            subQuery
              .whereILike('first_name', `%${nameTrimmed}%`)
              .orWhereILike('middle_name', `%${nameTrimmed}%`)
              .orWhereILike('last_name', `%${nameTrimmed}%`)
              .orWhereILike('father_name', `%${nameTrimmed}%`)
          }
        })
      }

      if (gr_no && (!searchQuery || String(gr_no).trim() !== searchQuery)) {
        const grNoStr = String(gr_no).trim()
        if (/^\d+$/.test(grNoStr)) {
          studentsQuery.andWhere('gr_no', 'LIKE', `%${grNoStr}%`)
        }
      }

      if (aadhar_no) {
        studentsQuery.andWhere('aadhar_no_bidx', KavachaColumns.lookup('students', 'aadhar_no', aadhar_no))
      }

      if (primary_mobile) {
        studentsQuery.andWhere('primary_mobile', 'LIKE', `%${primary_mobile}%`)
      }

      if (enrollment_code) {
        studentsQuery.andWhere('enrollment_code', 'LIKE', `%${enrollment_code}%`)
      }

      const students = await studentsQuery.limit(50)

      const enrichedStudents = students.map((s) => {
        const serialized = s.serialize()
        const primaryEnrollment = s.academic_class && s.academic_class.length > 0 ? s.academic_class[0] : null
        const className =
          primaryEnrollment?.division?.class?.class ||
          primaryEnrollment?.division?.division ||
          primaryEnrollment?.division?.aliases ||
          ''
        return {
          ...serialized,
          enrollment_no: s.enrollment_code,
          class_name: className,
          division_name: primaryEnrollment?.division?.division || '',
          class_id: primaryEnrollment?.division_id || null,
        }
      })

      return response.ok(enrichedStudents)
    } catch (error) {
      console.error('Error fetching student search results:', error)
      return response.internalServerError({ message: 'Internal server error' })
    }
  }

  public async getStaffSearchResults({ auth, request, response }: HttpContext) {
    try {
      const school_id = auth.user?.school_id
      const {
        academic_year,
        name,
        employee_code,
        aadhar_no,
        mobile_number,
        email,
        detailed,
        is_active,
        enrollment_status,
      } = request.qs()

      if (!school_id || !academic_year) {
        return response.badRequest({ message: 'Invalid request: Missing required parameters.' })
      }

      // Base query starting with Staff model filtered by school
      const staffQuery = Staff.query()
        .where('school_id', school_id as number)

      // Filter by staff enrollment for the academic session
      staffQuery.whereHas('enrollments', (enrollmentQuery) => {
        enrollmentQuery.where('academic_year', academic_year as number)
        
        // Optional filter by enrollment status if provided
        if (enrollment_status) {
          enrollmentQuery.where('status', enrollment_status)
        }
      })

      // Apply additional filters if provided
      if (name) {
        staffQuery.andWhere((query) => {
          query
            .whereILike('first_name', `%${name}%`)
            .orWhereILike('middle_name', `%${name}%`)
            .orWhereILike('last_name', `%${name}%`)
        })
      }

      if (employee_code) {
        staffQuery.andWhere('employee_code', 'LIKE', `%${employee_code}%`)
      }

      if (aadhar_no) {
        staffQuery.andWhere('aadhar_no_bidx', KavachaColumns.lookup('staff', 'aadhar_no', aadhar_no))
      }

      if (mobile_number) {
        staffQuery.andWhere('mobile_number', 'LIKE', `%${mobile_number}%`)
      }

      if (email) {
        staffQuery.andWhere('email', 'LIKE', `%${email}%`)
      }

      if (is_active !== undefined) {
        staffQuery.andWhere('is_active', is_active === 'true')
      }

      // Always preload role type and enrollments for the specific academic session
      staffQuery.preload('role_type');
      
      // Preload enrollments filtered by academic session
      staffQuery.preload('enrollments', (query) => {
        query.where('academic_year', academic_year as number)
      });

      if (detailed === 'true') {
        staffQuery
          .preload('school')
          .preload('assigend_classes', (query) => {
            query.where('academic_year', academic_year as number)
              .preload('divisions', (divisionQuery) => {
                divisionQuery.preload('class')
              })
          });
      }

      const staff = await staffQuery

      return response.ok(staff)
    } catch (error) {
      console.error('Error fetching staff search results:', error)
      return response.internalServerError({ message: 'Internal server error' })
    }
  }
}
