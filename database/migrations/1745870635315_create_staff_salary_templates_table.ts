import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff_salary_templates'

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

      table.string('template_name', 100).notNullable()
      table.string('template_code', 50).notNullable()
      table.text('description').nullable()
      table.decimal('annual_ctc', 10, 2).defaultTo(0.0).notNullable()
      table.boolean('is_active').defaultTo('false')
      // table.boolean('is_mandatory').defaultTo('false')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
