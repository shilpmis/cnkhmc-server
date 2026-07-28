import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'exam_subjects'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('exam_schedule_id').unsigned().references('id').inTable('exam_schedules').onDelete('CASCADE')
      table.integer('subject_id').unsigned().references('id').inTable('subjects').onDelete('CASCADE')
      table.integer('max_marks').notNullable()
      table.integer('passing_marks').notNullable()
      table.date('exam_date').notNullable()
      table.time('start_time').nullable()
      table.time('end_time').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}