import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff_experiences'

  async up() {
    this.schema.dropTableIfExists(this.tableName)
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('staff_id').unsigned().references('id').inTable('staff').onDelete('CASCADE')
      table.string('post_name').nullable()
      table.date('from_date').nullable()
      table.date('to_date').nullable()
      table.string('department').nullable()
      table.string('institute_name').nullable()
      table.string('appointment_regulation').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}