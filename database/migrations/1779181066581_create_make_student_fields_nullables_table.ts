import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'students'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('middle_name', 100).nullable().alter()
      table.string('gender').nullable().alter()
      table.integer('gr_no').unsigned().nullable().alter()
      table.date('birth_date').nullable().alter()
      table.string('father_name', 100).nullable().alter()
      table.string('mother_name_in_guj', 100).nullable().alter()
      table.bigInteger('aadhar_no').unsigned().nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Revert is complex without data loss, leaving as is or implement if necessary
      table.string('middle_name', 100).notNullable().alter()
      table.string('gender').notNullable().alter()
      table.integer('gr_no').unsigned().notNullable().alter()
      table.date('birth_date').notNullable().alter()
      table.string('father_name', 100).notNullable().alter()
      table.string('mother_name_in_guj', 100).notNullable().alter()
      table.bigInteger('aadhar_no').unsigned().notNullable().alter()
    })
  }
}