import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lecture_attendance_details'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('lecture_attendance_master_id')
        .unsigned()
        .references('id')
        .inTable('lecture_attendance_masters')
        .onDelete('CASCADE')
        .notNullable()
      table.integer('student_id').unsigned().references('id').inTable('students').notNullable()
      table
        .enum('attendance_status', ['present', 'absent', 'late', 'half_day'])
        .notNullable()
        .defaultTo('absent')
      table.string('remarks').nullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
