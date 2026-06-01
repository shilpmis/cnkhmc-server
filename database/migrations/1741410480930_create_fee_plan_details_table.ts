import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fees_plan_details'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      // table
      //   .integer('academic_session_id')
      //   .unsigned()
      //   .notNullable()
      //   .references('id')
      //   .inTable('academic_sessions')
      //   .onDelete('CASCADE')
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
      table
        .enum('installment_type', ['Admission', 'Monthly', 'Quarterly', 'Half Yearly', 'Yearly'])
        .notNullable()
      table.integer('total_installment').notNullable()
      table.decimal('total_amount', 10, 2).notNullable()
      table.enum('status', ['Active', 'Inactive']).notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['fees_plan_id', 'fees_type_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
