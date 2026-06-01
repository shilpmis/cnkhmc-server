import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fees_plans'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign('academic_session_id')
      table.dropForeign('division_id')
      table.dropUnique(['academic_session_id', 'division_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
