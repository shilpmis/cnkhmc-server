import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subjects_division_masters'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('subject_id').unsigned().references('id').inTable('subjects').onDelete('CASCADE');
      table.integer('division_id').unsigned().references('id').inTable('divisions').onDelete('CASCADE');
      table.integer('academic_session_id').unsigned().references('id').inTable('academic_sessions').onDelete('CASCADE');
      table.string('code_for_division').notNullable()
      table.text('description').nullable()
      table.enum('status', ['Active', 'Inactive']).notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}