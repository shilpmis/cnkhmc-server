import FeesType from '#models/FeesType'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const types = [
      { id: 1, school_id: 1, academic_session_id: 2, name: 'Admission Fee', description: 'Admission Fee' },
      { id: 2, school_id: 1, academic_session_id: 2, name: 'Tuition Fee',   description: 'Tuition Fee'   },
      { id: 3, school_id: 1, academic_session_id: 2, name: 'Activity Fee',  description: 'Activity Fee'  },
    ]

    for (const t of types) {
      await FeesType.updateOrCreate({ id: t.id }, t)
    }
  }
}