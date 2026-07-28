import StudentEnrollments from '#models/StudentEnrollments'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const enrollments = [
      { id: 1, student_id: 1, academic_year: 2025, status: 'pursuing',  division_id: 1, is_new_admission: false },
      { id: 2, student_id: 2, academic_year: 2025, status: 'pursuing',  division_id: 1, is_new_admission: false },
      { id: 3, student_id: 3, academic_year: 2025, status: 'pursuing',  division_id: 2, is_new_admission: false },
      { id: 4, student_id: 4, academic_year: 2025, status: 'pursuing',  division_id: 2, is_new_admission: false },
      { id: 5, student_id: 3, academic_year: 2025, status: 'promoted',  division_id: 1, is_new_admission: true  },
      { id: 6, student_id: 4, academic_year: 2025, status: 'promoted',  division_id: 1, is_new_admission: true  },
      { id: 7, student_id: 1, academic_year: 2025, status: 'failed',    division_id: 1, is_new_admission: true  },
      { id: 8, student_id: 1, academic_year: 2025, status: 'pursuing',  division_id: 1, is_new_admission: false },
    ] as any[]

    for (const e of enrollments) {
      await StudentEnrollments.updateOrCreate({ id: e.id }, e)
    }
  }
}
