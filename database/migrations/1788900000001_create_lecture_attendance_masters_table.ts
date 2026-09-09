import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lecture_attendance_masters'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('academic_year').unsigned().notNullable()
      table.integer('division_id').unsigned().references('id').inTable('divisions').notNullable()
      table.integer('subject_id').unsigned().references('id').inTable('subjects').notNullable()
      table.integer('teacher_id').unsigned().references('id').inTable('staff').notNullable()
      table.date('attendance_date').notNullable()
      table.enum('session_type', ['lecture', 'lab']).notNullable().defaultTo('lecture')
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })

      // Prevent duplicate marking for the same division + subject + date
      table.unique(
        ['academic_year', 'division_id', 'subject_id', 'attendance_date'],
        'lecture_attendance_masters_unique_index'
      )
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
