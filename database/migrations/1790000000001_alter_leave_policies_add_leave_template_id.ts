import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'leave_policies'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('leave_template_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('leave_templates')
        .onDelete('CASCADE')
      table.integer('staff_role_id').unsigned().nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['leave_template_id'])
      table.dropColumn('leave_template_id')
    })
  }
}
