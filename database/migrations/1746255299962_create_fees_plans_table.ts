import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fees_plans'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // table.dropForeign('academic_year')
      table.dropForeign('division_id')
      table.dropUnique(['academic_year', 'division_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
