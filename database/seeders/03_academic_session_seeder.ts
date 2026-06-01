import AcademicSession from '#models/AcademicSession'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const sessions = [
      {
        id: 1,
        school_id: 1,
        session_name: '2023-2024',
        start_month: 'June',
        end_month: 'May',
        start_year: '2023',
        end_year: '2024',
        is_active: false
      },
      {
        id: 2,
        school_id: 1,
        session_name: '2024-2025',
        start_month: 'June',
        end_month: 'May',
        start_year: '2024',
        end_year: '2025',
        is_active: true
      },
    ]

    for (const session of sessions) {
      await AcademicSession.updateOrCreate({ id: session.id }, session)
    }
  }
}