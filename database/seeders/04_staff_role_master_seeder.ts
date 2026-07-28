import StaffMaster from '#models/StaffMaster'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const roles = [
      { id: 1, school_id: 1, role: 'Principal',   is_teaching_role: true,  permissions: {}, working_hours: 8, academic_year: 2025 },
      { id: 2, school_id: 1, role: 'Head-Teacher', is_teaching_role: true,  permissions: {}, working_hours: 8, academic_year: 2025 },
      { id: 3, school_id: 1, role: 'Teacher',      is_teaching_role: true,  permissions: {}, working_hours: 8, academic_year: 2025 },
      { id: 4, school_id: 1, role: 'Clerk',        is_teaching_role: false, permissions: {}, working_hours: 8, academic_year: 2025 },
      { id: 5, school_id: 1, role: 'Peon',         is_teaching_role: false, permissions: {}, working_hours: 8, academic_year: 2025 },
      { id: 6, school_id: 1, role: 'Accountant',   is_teaching_role: false, permissions: {}, working_hours: 8, academic_year: 2025 },
      { id: 7, school_id: 1, role: 'Hospital Staff', is_teaching_role: false, permissions: {}, working_hours: 8, academic_year: 2025 },
      { id: 8, school_id: 1, role: 'Visiting Faculty', is_teaching_role: true, permissions: {}, working_hours: 8, academic_year: 2025 },
      { id: 9, school_id: 1, role: 'Hostel Staff', is_teaching_role: false, permissions: {}, working_hours: 8, academic_year: 2025 },
      { id: 10, school_id: 1, role: 'Mess Staff', is_teaching_role: false, permissions: {}, working_hours: 8, academic_year: 2025 },
    ]

    for (const r of roles) {
      await StaffMaster.updateOrCreate({ id: r.id }, r)
    }
  }
}