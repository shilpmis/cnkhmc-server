import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'student_fees_installments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('amount_paid_as_carry_forward', 10, 2).defaultTo(0)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
