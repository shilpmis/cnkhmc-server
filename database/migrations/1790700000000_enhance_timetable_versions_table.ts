import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'timetable_versions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('version_name', 255).nullable()
      table.date('start_date').nullable()
      table.date('end_date').nullable()
      table.boolean('is_active').defaultTo(false)
      table.integer('created_by').unsigned().nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('version_name')
      table.dropColumn('start_date')
      table.dropColumn('end_date')
      table.dropColumn('is_active')
      table.dropColumn('created_by')
    })
  }
}
