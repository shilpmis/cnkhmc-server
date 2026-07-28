import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'hostel_allocations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('student_id').unsigned().references('id').inTable('students').onDelete('CASCADE')
      table.integer('bed_id').unsigned().references('id').inTable('hostel_beds').onDelete('CASCADE')
      table.dateTime('allocation_date').notNullable()
      table.dateTime('vacation_date').nullable()
      table.enum('status', ['Active', 'Vacated']).defaultTo('Active')

      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}