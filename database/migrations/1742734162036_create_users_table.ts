import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('is_teacher')
      table.dropForeign('teacher_id')
      table.dropColumn('teacher_id')
      table
        .integer('staff_id')
        .unsigned()
        .references('id')
        .inTable('staff')
        .onUpdate('CASCADE')
        .onDelete('CASCADE')
        .nullable()
        .defaultTo(null)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
