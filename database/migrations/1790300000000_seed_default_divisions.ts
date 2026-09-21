import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSchema {
  async up() {
    // For every class that has zero divisions, insert a default 'A' division
    const classes = await db.from('classes').select('id', 'academic_year')

    for (const cls of classes) {
      const existingDivision = await db
        .from('divisions')
        .where('class_id', cls.id)
        .first()

      if (!existingDivision) {
        await db.table('divisions').insert({
          class_id: cls.id,
          academic_year: cls.academic_year || 1,
          division: 'A',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        })
      }
    }
  }

  async down() {
    // No-op to prevent unintended cascade data loss
  }
}
