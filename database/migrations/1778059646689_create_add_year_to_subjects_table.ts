import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subjects'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('year').nullable() // e.g. "1st Year", "2nd Year"
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('year')
    })
  }
}