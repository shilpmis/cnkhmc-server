import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'periods_config'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('batch_name').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('batch_name')
    })
  }
}