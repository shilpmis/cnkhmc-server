import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'certificate_templates'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name').notNullable()
      table.string('type').notNullable() // e.g. BONAFIDE, TRANSFER
      table.text('content').notNullable() // HTML or JSON template with placeholders
      table.integer('school_id').unsigned().references('id').inTable('schools').onDelete('CASCADE')
      table.boolean('is_active').defaultTo(true)

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}