import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'hostels'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('school_id').unsigned().references('id').inTable('schools').onDelete('CASCADE')
      table.string('name', 255).notNullable()
      table.enum('type', ['Boys', 'Girls', 'Co-ed']).notNullable()
      table.text('address').nullable()
      table.integer('capacity').unsigned().defaultTo(0)
      table.enum('status', ['Active', 'Inactive']).defaultTo('Active')

      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}