import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'payroll_settings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('school_id').unsigned().references('id').inTable('schools').onDelete('CASCADE')
      table.enum('lop_calculation_base', ['Gross Salary', 'Basic Salary']).defaultTo('Gross Salary')
      table.enum('lop_days_denominator', ['Actual Days in Month', 'Fixed 30 Days']).defaultTo('Actual Days in Month')
      table.decimal('epf_employee_percentage', 5, 2).defaultTo(12.0)
      table.decimal('epf_employer_percentage', 5, 2).defaultTo(12.0)
      table.decimal('esi_employee_percentage', 5, 2).defaultTo(0.75)
      table.decimal('esi_employer_percentage', 5, 2).defaultTo(3.25)
      table.json('tax_slabs').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}