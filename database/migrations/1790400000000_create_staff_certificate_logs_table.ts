import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff_certificate_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('staff_id')
        .unsigned()
        .references('id')
        .inTable('staff')
        .onDelete('CASCADE')
        .notNullable()
      table.string('certificate_type', 100).notNullable().defaultTo('EXPERIENCE_CERTIFICATE')
      table.string('reference_no', 255).nullable()
      table.string('certificate_date', 100).nullable()
      table.string('file_name', 255).notNullable()
      table.text('file_url').notNullable()
      table.string('file_type', 50).notNullable().defaultTo('doc')
      table.integer('generation_number').unsigned().notNullable().defaultTo(1)
      table
        .integer('generated_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .nullable()
      table.json('metadata').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
