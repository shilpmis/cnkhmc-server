import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'student_extra_fees_installments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('student_fees_master_id').unsigned().references('id').inTable('student_fees_master').onDelete('CASCADE')
      table.integer('student_fees_type_masters_id').unsigned().references('id').inTable('student_fees_type_masters').onDelete('CASCADE').withKeyName('fk_student_fees_type_masters_id')
      table.integer('installment_id').unsigned().references('id').inTable('student_fees_types_installments_breakdowns').onDelete('CASCADE').withKeyName('fk_student_fees_types_installment_id')
      table.decimal('paid_amount', 10, 2).defaultTo(0)
      table.decimal('discounted_amount', 10, 2).nullable().defaultTo(0) 
      table.decimal('remaining_amount', 10, 2)  //.computed('installment_amount - paid_amount')
      table.string('transaction_reference', 100).nullable()
      table.date('payment_date').notNullable()
      table.text('remarks').nullable()
      table.boolean('paid_as_refund').defaultTo(false);
      table.decimal('refunded_amount', 10, 2).defaultTo(0)
      table.enum('payment_mode', ['Cash', 'Online', 'Bank Transfer', 'Cheque', 'UPI', 'Full Discount']).notNullable()
      table.integer('recieved_by').unsigned().references('id').inTable('users').onDelete('CASCADE')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}