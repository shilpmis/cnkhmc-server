import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'exam_schedules'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('exam_master_id').unsigned().references('id').inTable('exam_masters').onDelete('CASCADE')
      table.integer('academic_year').notNullable()
      table.integer('class_id').unsigned().references('id').inTable('classes').onDelete('CASCADE')
      table.date('start_date').notNullable()
      table.date('end_date').notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}