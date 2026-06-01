import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'student_fees_master'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('student_id').unsigned().references('id').inTable('students').onDelete('CASCADE')
      table.integer('academic_session_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('academic_sessions')
      .onDelete('CASCADE');
      table.integer('fees_plan_id').unsigned().references('id').inTable('fees_plans').onDelete('CASCADE')
      table.decimal('total_amount', 10, 2).notNullable().defaultTo(0)
      table.decimal('discounted_amount', 10, 2).nullable().defaultTo(0) //-- After applying concessions
      table.decimal('paid_amount', 10, 2).defaultTo(0)  //-- Tracks total paid
      table.decimal('due_amount', 10, 2) //.computed('total_amount - paid_amount')
      table.enum('status', ['Pending', 'Partially Paid', 'Paid', 'Overdue']).notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['student_id', 'academic_session_id', 'fees_plan_id'] , 'student_fees_master_unique')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}