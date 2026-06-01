import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'classes'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('batch_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('batches')
        .onDelete('SET NULL')

      table
        .integer('department_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('departments')
        .onDelete('SET NULL')
      
      table.string('class').alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('batch_id')
      table.dropColumn('department_id')
      // To revert 'class' to enum, logic would be complex and DB-specific.
      // Usually keeping it as string is safer for rollback of data.
    })
  }
}