import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'chat_room_members'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('last_read_at', { useTz: true }).nullable().defaultTo(null)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('last_read_at')
    })
  }
}