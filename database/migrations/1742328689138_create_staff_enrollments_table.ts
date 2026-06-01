import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff_enrollments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('school_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('schools')
      .onDelete('CASCADE');
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}