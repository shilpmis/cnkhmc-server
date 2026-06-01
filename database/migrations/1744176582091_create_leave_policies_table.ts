import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'leave_policies'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('academic_session_id').unsigned().references('id').inTable('academic_sessions')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
