import StaffEnrollment from '#models/StaffEnrollment'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const enrollments = [
      { id: 1, staff_id: 1, academic_year: 2025, status: 'Retained',   school_id: 1 },
      { id: 2, staff_id: 2, academic_year: 2025, status: 'New-Joiner', school_id: 1 },
    ] as any[]

    for (const e of enrollments) {
      await StaffEnrollment.updateOrCreate({ id: e.id }, e)
    }
  }
}
