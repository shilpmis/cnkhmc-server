import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'student_extra_fees_installments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.enum('status', [
        'Pending',                  // Not paid at all
        'Partially Paid',           // Partial amount received
        'Paid',                     // Fully paid on time
        'Paid Late',                // Fully paid after due date
        'Overdue',                  // Due date passed and not fully paid
        'Reversal Requested',       // User requested reversal
        'Reversed',                 // Reversal/refund completed
      ]).notNullable()
        .alter()

      table.enum('payment_status', [
        'In Progress ',            // Payment is being processed
        'Success',  
        'Failed',
        // Administrative/Edge States
        'Disputed',
        'Cancelled',
      ])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}