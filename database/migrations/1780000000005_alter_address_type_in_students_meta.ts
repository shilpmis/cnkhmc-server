import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'students_meta'

  public async up() {
    // Explicitly set ROW_FORMAT=DYNAMIC to assist with row size management
    await this.schema.raw('ALTER TABLE students_meta ROW_FORMAT=DYNAMIC')

    this.schema.alterTable(this.tableName, (table) => {
      table.text('address').nullable().alter()
      table.text('birth_place').nullable().alter()
      table.text('religion').nullable().alter()
      table.text('caste').nullable().alter()
      table.text('privious_school').nullable().alter()
      table.text('district').nullable().alter()
      table.text('city').nullable().alter()
      table.text('state').nullable().alter()
      table.text('bank_name').nullable().alter()
    })
  }

  public async down() {
    await this.schema.raw('ALTER TABLE students_meta ROW_FORMAT=DYNAMIC')

    this.schema.alterTable(this.tableName, (table) => {
      table.string('address', 100).nullable().alter()
      table.string('birth_place', 50).nullable().alter()
      table.string('religion', 50).nullable().alter()
      table.string('caste', 100).nullable().alter()
      table.string('privious_school', 100).nullable().alter()
      table.string('district', 100).nullable().alter()
      table.string('city', 100).nullable().alter()
      table.string('state', 100).nullable().alter()
      table.string('bank_name', 100).nullable().alter()
    })
  }
}
