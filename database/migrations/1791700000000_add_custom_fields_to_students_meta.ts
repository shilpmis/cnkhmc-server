import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Holds the values of the extra student columns a school adds in the student column
 * configuration, as { "<column id>": "<value>" }.
 */
export default class extends BaseSchema {
  protected tableName = 'students_meta'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.json('custom_fields').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('custom_fields')
    })
  }
}
