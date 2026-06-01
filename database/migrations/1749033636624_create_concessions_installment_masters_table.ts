import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'concessions_installment_masters'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.enum('installment_status', [
        'Paid',                  // Fully paid
        'Failed',                // General failure (catch-all)
        'In Process', // Cheque payment is in process
        'Reversal Requested',    // User requested reversal
        'Reversed',              // Payment was reversed/refunded
      ]).notNullable()
    })
  }


  async down() {
    this.schema.dropTable(this.tableName)
  }
}