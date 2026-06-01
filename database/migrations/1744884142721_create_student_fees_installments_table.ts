import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'student_fees_installments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .foreign('student_fees_master_id', 'fk_student_fees_master_id')
        .references('id')
        .inTable('student_fees_master')
        .onDelete('CASCADE')

      table
        .foreign('installment_id', 'fk_installment_id')
        .references('id')
        .inTable('installment_breakdowns')
        .onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign('student_fees_master_id', 'fk_student_fees_master_id')
      table.dropForeign('installment_id', 'fk_installment_id')
    })
  }
}
