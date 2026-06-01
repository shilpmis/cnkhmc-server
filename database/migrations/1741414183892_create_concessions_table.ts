import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'concessions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('school_id').unsigned().references('id').inTable('schools').onDelete('CASCADE')
      table.integer('academic_session_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('academic_sessions')
      .onDelete('CASCADE');
      table.string('name').notNullable()
      table.text('description').nullable();
      table.enum('applicable_to' , ['fees_types' , 'plan']).notNullable();
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}