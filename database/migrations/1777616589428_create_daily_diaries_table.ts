import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'daily_diaries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('periods_config_id').unsigned().references('id').inTable('periods_config').onDelete('CASCADE')
      table.date('date').notNullable()
      table.text('topic_covered').nullable()
      table.text('resources_used').nullable()
      table.text('attendance_remarks').nullable()
      table.integer('staff_enrollment_id').unsigned().references('id').inTable('staff_enrollments').onDelete('CASCADE')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}