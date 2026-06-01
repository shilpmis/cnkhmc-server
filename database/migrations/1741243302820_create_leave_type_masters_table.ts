import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'leave_types_master'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('school_id').unsigned().references('id').inTable('schools')
      table.integer('academic_session_id').unsigned().references('id').inTable('academic_sessions')
      table.string('leave_type_name').notNullable() // Sick, Casual, Paid, etc
      table.boolean('is_paid').defaultTo(true)
      table.boolean('affects_payroll').defaultTo(true)
      table.boolean('requires_proof').defaultTo(false)
      table.boolean('is_active').defaultTo(true)

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());
  
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
