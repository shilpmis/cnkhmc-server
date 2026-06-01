import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'satff_payrun_components'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('satff_payrun_templates_id')
        .unsigned()
        .references('id')
        .inTable('satff_payrun_templates')
        .onDelete('CASCADE')

      table
        .integer('salary_components_id')
        .unsigned()
        .references('id')
        .inTable('salary_components')
        .onDelete('CASCADE')

      table.string('payslip_name', 100).nullable()
      table.decimal('amount', 10, 2).defaultTo(0)
      table.decimal('percentage', 10, 2).defaultTo(0).nullable()
      table.boolean('is_based_on_annual_ctc').defaultTo(false)
      table.boolean('is_based_on_basic_pay').defaultTo(false)
      table.boolean('is_modofied').defaultTo(false)

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
