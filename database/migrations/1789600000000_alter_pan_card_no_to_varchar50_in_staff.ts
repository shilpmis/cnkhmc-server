import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('pan_card_no', 50).nullable().defaultTo(null).alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('pan_card_no', 10).nullable().defaultTo(null).alter()
    })
  }
}
