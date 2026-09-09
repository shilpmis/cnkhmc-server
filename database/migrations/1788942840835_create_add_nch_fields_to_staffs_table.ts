import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff' // using 'staff' table name

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('nch_registration_no', 100).nullable().defaultTo(null)
      table.date('nch_registration_date').nullable().defaultTo(null)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('nch_registration_no')
      table.dropColumn('nch_registration_date')
    })
  }
}