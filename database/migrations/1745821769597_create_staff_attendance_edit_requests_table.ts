import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff_attendance_edit_requests'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('staff_attendance_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('staff_attendance_masters')
        .onDelete('CASCADE')
      table.time('requested_check_in_time').nullable()
      table.time('requested_check_out_time').nullable()
      table.string('reason', 500).notNullable()
      table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending')
      table.string('admin_remarks', 500).nullable()
      table.integer('requested_by')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
      table.integer('actioned_by')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
      table.timestamp('actioned_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })

      // Indexes
      table.index(['staff_attendance_id', 'status'])
      table.index(['requested_by'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}