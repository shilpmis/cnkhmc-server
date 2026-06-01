import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'leave_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('leave_application_id').unsigned().references('id').inTable('staff_leave_applications')
      table.enum('action', ['apply', 'withdraw', 'approve', 'reject']).notNullable()
      table.enum('status', ['pending', 'approved', 'rejected', 'cancelled']).notNullable()
      table.integer('performed_by').unsigned().references('id').inTable('users')
      table.text('remarks').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
