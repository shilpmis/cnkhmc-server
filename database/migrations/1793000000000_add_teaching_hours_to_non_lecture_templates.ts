import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Hours the timetable has to give a non-lecture subject over the session. `total_hours` is the sum of
 * the plan's topics and changes with every edit; this is the figure the school allots on purpose.
 * Left empty, the timetable falls back to `total_hours`.
 */
export default class extends BaseSchema {
  async up() {
    if (!(await this.schema.hasColumn('non_lecture_templates', 'teaching_hours'))) {
      this.schema.alterTable('non_lecture_templates', (table) => {
        table.decimal('teaching_hours', 6, 2).nullable()
      })
    }
  }

  async down() {
    if (await this.schema.hasColumn('non_lecture_templates', 'teaching_hours')) {
      this.schema.alterTable('non_lecture_templates', (table) => table.dropColumn('teaching_hours'))
    }
  }
}
