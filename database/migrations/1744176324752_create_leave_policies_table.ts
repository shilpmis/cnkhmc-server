import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'leave_policies'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign('academic_session_id')
      table.dropColumn('academic_session_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
