import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'student_fees_installments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('student_fees_master_id').unsigned().references('id').inTable('student_fees_master').onDelete('CASCADE')
      table.integer('installment_id').unsigned().references('id').inTable('installment_breakdowns').onDelete('CASCADE')
      table.decimal('paid_amount', 10, 2).defaultTo(0)
      table.decimal('remaining_amount', 10, 2)  //.computed('installment_amount - paid_amount')
      table.enum('payment_mode', ['Cash', 'Online', 'Bank Transfer']).nullable()
      table.string('transaction_reference', 100).nullable()
      table.date('payment_date').notNullable()
      table.text('remarks').nullable()
      table.enum('status', ['Pending', 'Partially Paid', 'Paid', 'Overdue', 'Failed']).notNullable()
      table.integer('recieved_by').unsigned().references('id').inTable('users').onDelete('CASCADE')

      table.unique(['student_fees_master_id', 'installment_id'] , 'student_fees_installments_unique');

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}