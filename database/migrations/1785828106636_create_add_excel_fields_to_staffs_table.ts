import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('title').nullable()
      table.text('permanent_address').nullable()
      table.string('designation_on_doa').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns('title', 'permanent_address', 'designation_on_doa')
    })
  }
}