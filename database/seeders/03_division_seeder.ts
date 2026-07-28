import Divisions from '#models/Divisions'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const divisions: any[] = [
      { id: 1, division: 'A', class_id: 1, academic_year: 2025, aliases: '1st Year Division A' },
      { id: 2, division: 'A', class_id: 2, academic_year: 2025, aliases: '2nd Year Division A' },
      { id: 3, division: 'A', class_id: 3, academic_year: 2025, aliases: '3rd Year Division A' },
      { id: 4, division: 'A', class_id: 4, academic_year: 2025, aliases: '4th Year Division A' },
    ]

    for (const div of divisions) {
      await Divisions.updateOrCreate({ id: div.id }, div)
    }
  }
}
