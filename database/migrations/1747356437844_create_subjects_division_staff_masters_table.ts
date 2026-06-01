import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subjects_division_staff_masters'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('subjects_division_id')
        .unsigned()
        .references('id')
        .inTable('subjects_division_masters')
        .onDelete('CASCADE')
      table.integer('staff_enrollment_id').unsigned().references('id').inTable('staff_enrollments')
      table.text('notes').nullable()
      table.enum('status', ['Active', 'Inactive']).notNullable()
      table.unique(['subjects_division_id', 'staff_enrollment_id'], 'staff_subjects_division_unique')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}