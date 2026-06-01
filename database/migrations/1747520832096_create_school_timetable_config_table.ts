import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'school_timetable_config'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('academic_session_id').unsigned().references('id').inTable('academic_sessions').onDelete('CASCADE');
      table.integer('max_periods_per_day')
      table.integer('default_period_duration') // in minutes
      table.json('allowed_period_durations')
      table.boolean('lab_enabled')
      table.boolean('pt_enabled')
      table.integer('period_gap_duration').nullable() // in minutes
      table.integer('teacher_max_periods_per_day').nullable()
      table.integer('teacher_max_periods_per_week').nullable()
      table.boolean('is_lab_included_in_max_periods')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}