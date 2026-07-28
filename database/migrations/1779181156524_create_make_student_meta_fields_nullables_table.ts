import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'students_meta'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.bigInteger('aadhar_dise_no').nullable().alter()
      table.string('birth_place', 50).nullable().alter()
      table.string('birth_place_in_guj', 50).nullable().alter()
      table.string('religion', 50).nullable().alter()
      table.string('religion_in_guj', 50).nullable().alter()
      table.string('caste', 100).nullable().alter()
      table.string('caste_in_guj', 100).nullable().alter()
      table.string('category').nullable().alter()
      table.date('admission_date').nullable().alter()
      table.string('address', 100).nullable().alter()
      table.string('district', 100).nullable().alter()
      table.string('city', 100).nullable().alter()
      table.string('state', 100).nullable().alter()
      table.integer('postal_code').unsigned().nullable().alter()
      table.string('bank_name', 100).nullable().alter()
      table.bigInteger('account_no').unsigned().nullable().alter()
      table.string('IFSC_code', 15).nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (_table) => {
      // Revert logic omitted for simplicity
    })
  }
}