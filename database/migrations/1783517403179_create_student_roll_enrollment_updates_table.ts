import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('students', (table) => {
      table.dropColumn('roll_number')
      table.integer('first_year_roll_number').nullable().defaultTo(null)
      table.integer('second_year_roll_number').nullable().defaultTo(null)
      table.integer('third_year_roll_number').nullable().defaultTo(null)
      table.integer('fourth_year_roll_number').nullable().defaultTo(null)
    })

    this.schema.alterTable('schools', (table) => {
      table.string('enrollment_number_format').nullable().defaultTo(null)
    })
  }

  async down() {
    this.schema.alterTable('schools', (table) => {
      table.dropColumn('enrollment_number_format')
    })

    this.schema.alterTable('students', (table) => {
      table.integer('roll_number').nullable().defaultTo(null)
      table.dropColumn('first_year_roll_number')
      table.dropColumn('second_year_roll_number')
      table.dropColumn('third_year_roll_number')
      table.dropColumn('fourth_year_roll_number')
    })
  }
}