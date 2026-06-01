import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'labs_config'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('school_timetable_config_id').unsigned().references('id').inTable('school_timetable_config').onDelete('CASCADE');
      table.string('name')
      table.string('type') // e.g. "science", "computer"
      table.integer('max_capacity') // in term of class
      table.integer('availability_per_day').nullable() // optional

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}