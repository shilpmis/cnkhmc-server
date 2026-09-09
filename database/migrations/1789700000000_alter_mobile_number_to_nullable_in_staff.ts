import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.bigInteger('mobile_number').nullable().defaultTo(null).alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.bigInteger('mobile_number').notNullable().alter()
    })
  }
}
