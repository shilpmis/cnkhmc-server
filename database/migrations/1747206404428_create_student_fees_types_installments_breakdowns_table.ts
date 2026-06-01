import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'student_fees_types_installments_breakdowns'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('student_fees_type_masters_id').unsigned().references('id').inTable('student_fees_type_masters').onDelete('CASCADE').withKeyName('student_fees_type_masters_id');
      table.integer('installment_no').notNullable();
      table.decimal('installment_amount', 10, 2).notNullable();
      table.date('due_date').notNullable();
      table.enum('status', ['Active' , 'Inactive' ]).notNullable().defaultTo('Active');

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}