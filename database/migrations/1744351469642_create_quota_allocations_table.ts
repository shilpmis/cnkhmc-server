import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'quota_allocations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('academic_year')
        .unsigned()
        
        .nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
