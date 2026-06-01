import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'student_fees_type_masters'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('student_enrollments_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('student_enrollments')
        .onDelete('CASCADE')
      table
        .integer('fees_plan_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('fees_plans')
        .onDelete('CASCADE')
      table
        .integer('fees_type_id')
        .unsigned()
        .references('id')
        .inTable('fees_types')
        .onDelete('CASCADE')
      table.enum('installment_type', ['Admission', 'Monthly', 'Quarterly', 'Half Yearly', 'Yearly']).notNullable()
      table.decimal('total_amount', 10, 2).notNullable()
      table.decimal('paid_amount', 10, 2).notNullable()
      table.enum('status', ['Active', 'Inactive']).notNullable()


      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}