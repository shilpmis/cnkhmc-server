import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'leave_policies'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // table.dropForeign('academic_year')
      table.dropColumn('academic_year')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
