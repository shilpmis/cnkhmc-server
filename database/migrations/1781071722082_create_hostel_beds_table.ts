import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'hostel_beds'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('room_id').unsigned().references('id').inTable('hostel_rooms').onDelete('CASCADE')
      table.string('bed_number', 50).notNullable()
      table.enum('status', ['Available', 'Occupied', 'Maintenance']).defaultTo('Available')

      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}