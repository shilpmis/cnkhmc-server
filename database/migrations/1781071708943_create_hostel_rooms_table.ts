import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'hostel_rooms'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('hostel_id').unsigned().references('id').inTable('hostels').onDelete('CASCADE')
      table.string('room_number', 50).notNullable()
      table.string('floor', 50).nullable()
      table.integer('capacity').unsigned().defaultTo(0)
      table.enum('status', ['Active', 'Maintenance', 'Inactive']).defaultTo('Active')

      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}