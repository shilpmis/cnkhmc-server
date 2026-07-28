import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'students'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('enrollment_code').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('enrollment_code').notNullable().alter()
    })
  }
}
