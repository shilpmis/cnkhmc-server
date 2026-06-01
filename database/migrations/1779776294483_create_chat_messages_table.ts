import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'chat_messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('chat_room_id').unsigned().notNullable().references('id').inTable('chat_rooms').onDelete('CASCADE').onUpdate('CASCADE')
      table.integer('sender_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE')
      table.text('content').notNullable()
      table.enum('type', ['TEXT', 'IMAGE', 'FILE']).notNullable().defaultTo('TEXT')

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}