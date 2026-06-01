import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff_leave_applications'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('approved_by').unsigned().references('id').inTable('users').nullable()
      table.timestamp('approved_at').nullable()
      table.text('remarks').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('approved_by')
      table.dropColumn('approved_at')
      table.dropColumn('remarks')
    })
  }
}
