import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lecture_attendance_masters'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('lecture_number').unsigned().notNullable().defaultTo(1)
      table.integer('periods_config_id').unsigned().references('id').inTable('periods_config').nullable()

      table.dropUnique(
        ['academic_year', 'division_id', 'subject_id', 'attendance_date'],
        'lecture_attendance_masters_unique_index'
      )
      table.unique(
        ['academic_year', 'division_id', 'subject_id', 'attendance_date', 'lecture_number'],
        'lecture_attendance_masters_unique_index'
      )
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(
        ['academic_year', 'division_id', 'subject_id', 'attendance_date', 'lecture_number'],
        'lecture_attendance_masters_unique_index'
      )
      table.dropColumn('lecture_number')
      table.dropColumn('periods_config_id')
      table.unique(
        ['academic_year', 'division_id', 'subject_id', 'attendance_date'],
        'lecture_attendance_masters_unique_index'
      )
    })
  }
}
