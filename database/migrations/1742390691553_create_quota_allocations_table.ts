import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'quota_allocations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
     table.unique(['quota_id', 'class_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}