import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'entities'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('email').nullable().alter()
      table.string('branch_code').nullable().alter()
      table.bigInteger('contact_number').nullable().alter()
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('email').notNullable().alter()
      table.string('branch_code').notNullable().alter()
      table.bigInteger('contact_number').notNullable().alter()
    })
  }
}
