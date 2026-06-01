import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'chat_rooms'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('organization_id').unsigned().notNullable().references('id').inTable('organizations').onDelete('CASCADE').onUpdate('CASCADE')
      table.string('name').nullable()
      table.enum('type', ['DIRECT', 'GROUP']).notNullable().defaultTo('DIRECT')
      table.integer('created_by').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE')

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}