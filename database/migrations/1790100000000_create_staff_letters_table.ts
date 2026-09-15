import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff_letters'

  async up() {
    this.schema.dropTableIfExists(this.tableName)
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('staff_id').unsigned().references('id').inTable('staff').onDelete('CASCADE').notNullable()
      table.string('letter_type', 255).notNullable()
      table.integer('letter_type_id').unsigned().references('id').inTable('staff_configurations').onDelete('SET NULL').nullable()
      table.string('letter_no', 255).nullable()
      table.date('letter_date').nullable()
      table.string('remarks', 500).nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
