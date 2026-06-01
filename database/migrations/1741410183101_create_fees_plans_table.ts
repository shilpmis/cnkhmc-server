import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fees_plans'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name', 100).notNullable()
      table
        .integer('academic_session_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('academic_sessions')
        .onDelete('CASCADE')
      table.string('description', 255).nullable()
      table
        .integer('division_id')
        .unsigned()
        .references('id')
        .inTable('divisions')
        .onDelete('CASCADE')
      table.decimal('total_amount', 10, 2).notNullable()
      table.enum('status', ['Active', 'Inactive']).notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['academic_session_id', 'division_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
