import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('leave_template_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('leave_templates')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['leave_template_id'])
      table.dropColumn('leave_template_id')
    })
  }
}
