import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'concessions_installment_masters'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('student_fees_installment_id')
        .unsigned()
        .references('id')
        .inTable('student_fees_installments')
        .onDelete('CASCADE')
        .withKeyName('fk_student_fees_installment_id')
      table
        .integer('concession_id')
        .unsigned()
        .references('id')
        .inTable('concessions')
        .onDelete('CASCADE')
      table.decimal('concession_amount', 10, 2).notNullable().defaultTo(0)
      table.decimal('applied_amount', 10, 2).notNullable().defaultTo(0) //-- After applying concessions

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
