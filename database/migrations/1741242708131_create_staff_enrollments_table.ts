import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff_enrollments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('academic_session_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('academic_sessions')
        .onDelete('CASCADE')

      table
        .integer('staff_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('staff')
        .onDelete('CASCADE')

      table.enum('status', ['retained', 'transfer', 'resigned']).defaultTo('retained')

      table.string('remarks', 255).nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
