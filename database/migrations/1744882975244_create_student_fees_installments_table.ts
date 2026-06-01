import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'student_fees_installments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign('student_fees_master_id')
      table.dropForeign('installment_id')

      table.dropIndex(
        ['student_fees_master_id', 'installment_id'],
        'student_fees_installments_unique'
      )
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
