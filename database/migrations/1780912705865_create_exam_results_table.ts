import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'exam_results'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('exam_subject_id').unsigned().references('id').inTable('exam_subjects').onDelete('CASCADE')
      table.integer('student_id').unsigned().references('id').inTable('students').onDelete('CASCADE')
      table.decimal('obtained_marks', 5, 2).nullable()
      table.string('status').notNullable().defaultTo('ATTENDED') // ATTENDED, ABSENT, MEDICAL

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}