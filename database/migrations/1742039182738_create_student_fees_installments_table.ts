import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'student_fees_installments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('discounted_amount', 10, 2).nullable().defaultTo(0) 
      table.boolean('paid_as_refund').defaultTo(false);
      table.decimal('refunded_amount', 10, 2).defaultTo(0)  
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}