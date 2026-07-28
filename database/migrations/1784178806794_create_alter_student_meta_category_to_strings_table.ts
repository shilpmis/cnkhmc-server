import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'students_meta'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('category', 50).nullable().alter({ alterNullable: true })
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.enum('category', ['ST', 'SC', 'OBC', 'OPEN']).nullable().alter({ alterNullable: true })
    })
  }
}