import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'periods_config'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('is_library').defaultTo(false)
      table.boolean('is_seminar').defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('is_library')
      table.dropColumn('is_seminar')
    })
  }
}
