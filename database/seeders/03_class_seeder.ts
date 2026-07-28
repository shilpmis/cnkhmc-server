import Classes from '#models/Classes'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const classes = [
      { id: 1, class: '1st BHMS', school_id: 1, academic_year: 2025 },
      { id: 2, class: '2nd BHMS', school_id: 1, academic_year: 2025 },
      { id: 3, class: '3rd BHMS', school_id: 1, academic_year: 2025 },
      { id: 4, class: '4th BHMS', school_id: 1, academic_year: 2025 },
    ]

    for (const cls of classes) {
      await Classes.updateOrCreate({ id: cls.id }, cls)
    }
  }
}
