import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'students'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('gr_no')
        .unsigned()
        .nullable().alter({ alterNullable: true })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}