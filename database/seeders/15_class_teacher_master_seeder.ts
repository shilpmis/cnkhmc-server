import ClassTeacherMaster from '#models/Classteachermaster'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const records = [
      { id: 1, division_id: 1, staff_id: 1, academic_session_id: 2, status: 'Active' },
      { id: 2, division_id: 2, staff_id: 1, academic_session_id: 2, status: 'Active' },
    ]

    for (const r of records) {
      await ClassTeacherMaster.updateOrCreate({ id: r.id }, r)
    }
  }
}
