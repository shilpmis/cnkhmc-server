import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'concession_fees_plan_master'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('academic_session_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('academic_sessions')
        .onDelete('CASCADE')
      table
        .integer('concession_id')
        .unsigned()
        .references('id')
        .inTable('concessions')
        .onDelete('CASCADE')
      table
        .integer('fees_plan_id')
        .unsigned()
        .references('id')
        .inTable('fees_plans')
        .onDelete('CASCADE')
      table
        .integer('fees_type_id')
        .unsigned()
        .references('id')
        .inTable('fees_types')
        .onDelete('CASCADE')
        .nullable()
      table.enum('deduction_type', ['percentage', 'fixed_amount']).notNullable()
      table.decimal('amount', 10, 2).nullable()
      table.decimal('percentage', 10, 2).nullable()
      table.enum('status', ['Active', 'Inactive']).notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.index(
        ['concession_id', 'fees_plan_id', 'fees_type_id'],
        'concession_fees_plan_master_unique'
      )
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
