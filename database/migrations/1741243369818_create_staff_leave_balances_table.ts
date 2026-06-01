import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff_leave_balances'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('academic_session_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('academic_sessions')
      .onDelete('CASCADE');
      table.integer('staff_id').unsigned().references('id').inTable('staff')
      table.integer('leave_type_id').unsigned().references('id').inTable('leave_types_master')
      table.integer('academic_year').notNullable()
      table.decimal('total_leaves', 8, 1).notNullable()
      table.decimal('used_leaves', 8, 1).defaultTo(0)
      table.decimal('pending_leaves', 8, 1).defaultTo(0) // Leaves in approval state
      table.decimal('carried_forward', 8, 1).defaultTo(0)
      table.decimal('available_balance', 8, 1).notNullable()
      table.timestamp('last_updated')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}