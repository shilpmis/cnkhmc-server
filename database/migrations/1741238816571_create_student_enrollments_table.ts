import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'student_enrollments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('academic_year')
        .unsigned()
        .notNullable()
        

      table
        .integer('division_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('divisions')
        .onDelete('CASCADE')

      table
        .integer('student_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('students')
        .onDelete('CASCADE')

      table.integer('quota_id').unsigned().references('id').inTable('quotas').onDelete('CASCADE')

      table.enum('status', ['pursuing', 'permoted', 'failed', 'drop']).defaultTo('pursuing')

      table.string('remarks', 255).nullable()

      table.boolean('is_new_admission').notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
