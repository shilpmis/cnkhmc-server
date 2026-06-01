import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'academic_sessions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Drop start_date and end_date columns
      table.dropColumn('start_date')
      table.dropColumn('end_date')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Revert changes if needed
      table.date('start_date').notNullable().unique()
      table.date('end_date').notNullable().unique()

      table.dropColumn('start_month')
      table.dropColumn('end_month')
    })
  }
}
