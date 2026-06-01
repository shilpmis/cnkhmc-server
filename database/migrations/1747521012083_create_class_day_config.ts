import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'class_day_config'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('school_timetable_config_id').unsigned().references('id').inTable('school_timetable_config').onDelete('CASCADE');
      table.integer('class_id').unsigned().references('id').inTable('classes')
      table.enum('day', ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'])
      table.json('allowed_durations') // [30, 45]
      table.integer('max_consecutive_periods').nullable() // optional
      table.integer('total_breaks').nullable() // optional, e.g. 3
      table.json('break_durations').nullable() // e.g. [15, 35]
      table.time('day_start_time')
      table.time('day_end_time')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}