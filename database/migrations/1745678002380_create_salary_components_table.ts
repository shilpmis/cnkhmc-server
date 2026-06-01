import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'salary_components'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('school_id').unsigned().references('id').inTable('schools').onDelete('CASCADE')
      table
        .integer('academic_session_id')
        .unsigned()
        .references('id')
        .inTable('academic_sessions')
        .onDelete('CASCADE')
      table.string('component_name', 100).notNullable()
      table.string('component_code', 50).nullable()
      table.enum('component_type', ['earning', 'deduction', 'benefits']).notNullable()
      table.text('description').nullable()
      table.enum('calculation_method', ['amount', 'percentage']).notNullable()
      table.decimal('amount', 10, 2).defaultTo(0).nullable()
      table.decimal('percentage', 10, 2).defaultTo(0).nullable()
      table.boolean('is_based_on_annual_ctc').defaultTo('false')
      table.string('name_in_payslip', 100).nullable()
      table.boolean('is_taxable').defaultTo('false')
      table.boolean('pro_rata_calculation').defaultTo('false')
      table.boolean('consider_for_epf').defaultTo('true')
      table.boolean('consider_for_esic').defaultTo('true')
      table.boolean('consider_for_esi').defaultTo('true')
      table.boolean('is_mandatory').defaultTo('false')
      table.boolean('is_mandatory_for_all_templates').defaultTo('false')
      table.boolean('is_active').defaultTo('true')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
