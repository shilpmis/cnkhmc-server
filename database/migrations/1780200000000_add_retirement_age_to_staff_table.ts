import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('retirement_age').unsigned().nullable().defaultTo(null)
        .comment('Configurable retirement age for this staff member (alert is shown when age >= this value). If null, falls back to school default (60 years).')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('retirement_age')
    })
  }
}
