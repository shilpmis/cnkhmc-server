import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSchema {
  async up() {
    const schools = await db.from('schools').select('id')
    const defaultStatuses = [
      'Permanent',
      'Trial Period',
      'Contract Based',
      'Notice Period',
      'Resigned',
      'Visiting',
      'Probation'
    ]

    for (const school of schools) {
      for (const status of defaultStatuses) {
        const existing = await db
          .from('staff_configurations')
          .where('school_id', school.id)
          .andWhere('config_type', 'EMPLOYMENT_STATUS')
          .andWhere('name', status)
          .first()

        if (!existing) {
          await db.table('staff_configurations').insert({
            school_id: school.id,
            config_type: 'EMPLOYMENT_STATUS',
            name: status,
            parent_id: null,
            created_at: new Date(),
            updated_at: new Date(),
          })
        }
      }
    }
  }

  async down() {
    // No-op
  }
}
