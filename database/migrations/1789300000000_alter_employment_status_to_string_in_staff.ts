import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('employment_status', 100).nullable().defaultTo('Permanent').alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, () => {
      // rollback if needed
    })
  }
}
