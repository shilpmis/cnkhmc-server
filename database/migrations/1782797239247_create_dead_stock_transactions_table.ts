import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dead_stock_transactions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('dead_stock_id').unsigned().references('id').inTable('dead_stocks').onDelete('CASCADE').notNullable()
      table.integer('department_id').unsigned().references('id').inTable('inventory_departments').onDelete('SET NULL').nullable()
      table.enum('transaction_type', ['ISSUE', 'RETURN', 'DISCARD']).notNullable()
      table.integer('quantity').notNullable()
      table.date('transaction_date').notNullable()
      table.string('remark').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}