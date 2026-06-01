import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'student_fees_plan_masters'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('student_fees_master_id')
        .unsigned()
        .references('id')
        .inTable('student_fees_master')
        .onDelete('CASCADE')

      table
        .integer('fees_plan_details_id')
        .unsigned()
        .references('id')
        .inTable('fees_plan_details')
        .onDelete('CASCADE')

      table.decimal('total_amount', 10, 2).notNullable().defaultTo(0)
      table.decimal('discounted_amount', 10, 2).nullable().defaultTo(0) //-- After applying concessions
      table.decimal('paid_amount', 10, 2).defaultTo(0) //-- Tracks total paid
      table.decimal('due_amount', 10, 2)
      table.enum('status', ['Partially Paid', 'Paid', 'Unpaid']).notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
