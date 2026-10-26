import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * A non-lecture lesson plan belongs to a whole subject. Its topics are assigned to teachers, and a teacher
 * with a timetable period for that subject writes the daily diary against the plan.
 */
export default class extends BaseSchema {
  async up() {
    if (!(await this.schema.hasColumn('non_lecture_templates', 'subject_id'))) {
      this.schema.alterTable('non_lecture_templates', (table) => {
        table.integer('subject_id').unsigned().nullable().index()
      })
    }
    if (!(await this.schema.hasColumn('non_lecture_template_topics', 'assigned_staff_ids'))) {
      this.schema.alterTable('non_lecture_template_topics', (table) => {
        table.text('assigned_staff_ids').nullable()
      })
    }
    if (!(await this.schema.hasColumn('non_lecture_logs', 'periods_config_id'))) {
      this.schema.alterTable('non_lecture_logs', (table) => {
        table.integer('periods_config_id').unsigned().nullable().index()
      })
    }
  }

  async down() {
    if (await this.schema.hasColumn('non_lecture_logs', 'periods_config_id')) {
      this.schema.alterTable('non_lecture_logs', (table) => table.dropColumn('periods_config_id'))
    }
    if (await this.schema.hasColumn('non_lecture_template_topics', 'assigned_staff_ids')) {
      this.schema.alterTable('non_lecture_template_topics', (table) => table.dropColumn('assigned_staff_ids'))
    }
    if (await this.schema.hasColumn('non_lecture_templates', 'subject_id')) {
      this.schema.alterTable('non_lecture_templates', (table) => table.dropColumn('subject_id'))
    }
  }
}
