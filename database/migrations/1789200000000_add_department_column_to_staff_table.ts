import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff'

  async up() {
    const hasCol = await this.schema.hasColumn(this.tableName, 'department')
    if (!hasCol) {
      this.schema.alterTable(this.tableName, (table) => {
        table.string('department', 100).nullable().defaultTo(null)
      })
    }
  }

  async down() {
    const hasCol = await this.schema.hasColumn(this.tableName, 'department')
    if (hasCol) {
      this.schema.alterTable(this.tableName, (table) => {
        table.dropColumn('department')
      })
    }
  }
}
