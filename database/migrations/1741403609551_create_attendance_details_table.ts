import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'attendance_details'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('attendance_master_id').unsigned()
        .references('id').inTable('attendance_masters')
        .onDelete('CASCADE')
      table.integer('student_id').unsigned().references('id').inTable('students')
      table.enum('attendance_status', ['present', 'absent', 'late', 'half_day'])
      table.string('remarks', 255).nullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })

      // Indexes
      table.index(['attendance_master_id', 'student_id'])
      table.index(['student_id', 'attendance_status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}