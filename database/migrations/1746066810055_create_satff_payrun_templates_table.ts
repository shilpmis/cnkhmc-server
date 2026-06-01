import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'satff_payrun_templates'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('base_template_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('salary_templates')
        .onDelete('CASCADE')

      table
        .integer('staff_enrollments_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('staff_enrollments')
        .onDelete('CASCADE')

      table.string('payroll_period', 7).notNullable()
      table.string('template_name', 100).notNullable()
      table.string('template_code', 50).notNullable()
      table.decimal('based_anual_ctc', 10, 2).defaultTo(0)
      table.decimal('total_payroll', 10, 2).defaultTo(0.0).notNullable()
      table.text('notes').nullable()
      table.enum('status', [
        'draft',
        'pending',
        'processing',
        'partially_paid',
        'paid',
        'failed',
        'cancelled',
        'on_hold',
      ])

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['staff_enrollments_id', 'payroll_period'], 'staff_payroll_period')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
