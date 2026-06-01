import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The date_of_passing column in the staff table was created as varchar(7)
 * in the legacy DB. This migration changes it to a proper date column.
 */
export default class extends BaseSchema {
  protected tableName = 'staff'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.date('date_of_passing').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('date_of_passing', 7).nullable().alter()
    })
  }
}
