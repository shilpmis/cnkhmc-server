import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'leave_templates'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('school_id').unsigned().references('id').inTable('schools').onDelete('CASCADE')
      table.integer('academic_year').notNullable()
      table.string('template_name').notNullable()
      table.text('description').nullable()
      table.boolean('is_active').defaultTo(true)

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
