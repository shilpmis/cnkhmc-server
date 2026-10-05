import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'daily_diary_manual_entries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('staff_id').unsigned().references('id').inTable('staff').onDelete('CASCADE').notNullable()
      table.integer('staff_enrollment_id').unsigned().references('id').inTable('staff_enrollments').onDelete('CASCADE').nullable()
      table.date('date').notNullable()
      table.string('time', 100).notNullable()
      table.text('description').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
