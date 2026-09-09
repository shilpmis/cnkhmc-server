import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('date_of_promotion', 500).nullable().defaultTo(null).alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.date('date_of_promotion').nullable().defaultTo(null).alter()
    })
  }
}
