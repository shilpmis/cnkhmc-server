import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff_attendance_masters'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('academic_session_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('academic_sessions')
        .onDelete('CASCADE')
      table.integer('staff_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('staff')
        .onDelete('CASCADE')
      table.date('attendance_date').notNullable()
      table.time('check_in_time').nullable()
      table.time('check_out_time').nullable()
      table.enum('status', ['present', 'absent', 'late', 'half_day']).defaultTo('present')
      table.string('remarks', 255).nullable()
      table.integer('marked_by')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
      table.boolean('is_self_marked').defaultTo(false)
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })

      // Indexes for better query performance
      table.unique(['academic_session_id', 'staff_id', 'attendance_date'], 'staff_attendance_unique_index')
      table.index(['staff_id', 'attendance_date'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}