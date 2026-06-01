import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'quota_allocations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('academic_session_id')
        .unsigned()
        .references('id')
        .inTable('academic_sessions')
        .onDelete('CASCADE')
        .nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
