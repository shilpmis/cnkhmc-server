import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff_template_components'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('staff_salary_templates_id')
        .unsigned()
        .references('id')
        .inTable('staff_salary_templates')
        .onDelete('CASCADE')
      table
        .integer('salary_components_id')
        .unsigned()
        .references('id')
        .inTable('salary_components')
        .onDelete('CASCADE')
      table.decimal('amount', 10, 2).defaultTo(0).nullable()
      table.decimal('percentage', 10, 2).defaultTo(0).nullable()
      table.boolean('is_mandatory').defaultTo('false')
      table.string('recovering_end_month').nullable()
      table.string('total_recovering_amount').nullable()
      table.string('total_recovered_amount').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
