import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'student_enrollments'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('promoted_by').unsigned().nullable()

      table.timestamp('promoted_at', { useTz: true }).nullable()

      table.integer('updated_by').unsigned().nullable()

      // Fix timestamps to use timezone if not already
      table.timestamp('created_at', { useTz: true }).alter()
      table.timestamp('updated_at', { useTz: true }).alter()

      // Optional: Rename column or alter enum (if needed)
      // table.enu('status', ['pursuing', 'promoted', 'failed', 'drop']).alter()
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('promoted_by')
      table.dropColumn('promoted_at')
      table.dropColumn('updated_by')

      // Reset timestamp precision (optional rollback)
      table.timestamp('created_at').alter()
      table.timestamp('updated_at').alter()

      // Optional rollback enum change
      // table.enu('status', ['pursuing', 'permoted', 'failed', 'drop']).alter()
    })
  }
}
