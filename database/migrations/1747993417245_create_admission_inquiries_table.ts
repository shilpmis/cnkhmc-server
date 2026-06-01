import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'admission_inquiries'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('student_enrollments_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('student_enrollments')
        .onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}