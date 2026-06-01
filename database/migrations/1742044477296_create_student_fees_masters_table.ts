import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'student_fees_master'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('total_refund_amount', 10, 2).nullable().defaultTo(0)
      table.decimal('refunded_amount', 10, 2).nullable().defaultTo(0)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}