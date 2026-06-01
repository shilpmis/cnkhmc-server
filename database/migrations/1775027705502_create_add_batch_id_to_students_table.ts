import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'students'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('batch_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('batches')
        .onDelete('SET NULL')
      table.enum('student_type', ['SCHOOL', 'COLLEGE']).notNullable().defaultTo('SCHOOL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('batch_id')
      table.dropColumn('student_type')
    })
  }
}
