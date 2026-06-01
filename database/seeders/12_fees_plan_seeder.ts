import FeesPlan from '#models/FeesPlan'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const plans = [
      {
        id: 1, division_id: 1, academic_session_id: 2,
        name: 'Fees Plan for 1st BHMS', description: 'Fees Plan for 1st BHMS',
        total_amount: 14000.5,
      },
      {
        id: 2, division_id: 2, academic_session_id: 2,
        name: 'Fees Plan for 2nd BHMS', description: 'Fees Plan for 2nd BHMS',
        total_amount: 0.0,
      },
    ]

    for (const plan of plans) {
      await FeesPlan.updateOrCreate({ id: plan.id }, plan)
    }
  }
}
