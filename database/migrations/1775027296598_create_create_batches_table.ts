import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'batches'

  async up() {
    const exists = await this.schema.hasTable(this.tableName)
    if (exists) return

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('entity_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('entities')
        .onDelete('CASCADE')
      table.integer('department_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('departments')
        .onDelete('CASCADE')
      table.string('name').notNullable() // e.g., BHMS 2025
      table.date('start_date').notNullable()
      table.date('expected_end_date').nullable()
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
