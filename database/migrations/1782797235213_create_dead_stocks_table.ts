import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dead_stocks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('item_name').notNullable()
      table.string('invoice_number').nullable()
      table.string('supplier_name').nullable()
      table.date('purchase_date').nullable()
      table.decimal('unit_price', 10, 2).notNullable()
      table.integer('total_quantity').notNullable()
      table.decimal('total_amount', 12, 2).notNullable()
      table.date('expiry_date').nullable()
      table.integer('available_quantity').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}