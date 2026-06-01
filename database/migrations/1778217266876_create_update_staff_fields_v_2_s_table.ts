import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('ayush_id_no').nullable()
      table.string('state_council_reg_no').nullable()
      table.string('university_appointment_letter_no').nullable()
      table.date('university_appointment_date').nullable()
      table.string('area_of_expertise').nullable()
      table.string('ug_degree').nullable()
      table.string('ug_passing_university').nullable()
      table.integer('ug_passing_year').nullable()
      table.string('pg_degree').nullable()
      table.string('pg_passing_university').nullable()
      table.integer('pg_passing_year').nullable()
      table.string('other_degree').nullable()
      table.string('other_passing_university').nullable()
      table.integer('other_passing_year').nullable()
      table.string('pay_scale').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('ayush_id_no')
      table.dropColumn('state_council_reg_no')
      table.dropColumn('university_appointment_letter_no')
      table.dropColumn('university_appointment_date')
      table.dropColumn('area_of_expertise')
      table.dropColumn('ug_degree')
      table.dropColumn('ug_passing_university')
      table.dropColumn('ug_passing_year')
      table.dropColumn('pg_degree')
      table.dropColumn('pg_passing_university')
      table.dropColumn('pg_passing_year')
      table.dropColumn('other_degree')
      table.dropColumn('other_passing_university')
      table.dropColumn('other_passing_year')
      table.dropColumn('pay_scale')
    })
  }
}