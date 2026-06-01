import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'student_fees_installments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .enum('payment_mode', ['Cash', 'Online', 'Bank Transfer', 'Cheque', 'UPI', 'Full Discount'])
        .nullable()
        .alter()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
