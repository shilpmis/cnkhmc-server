import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'classes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('school_id')
        .unsigned()
        .references('id')
        .inTable('schools')
        .onUpdate('CASCADE')
        .onDelete('CASCADE')
      table
        .integer('academic_session_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('academic_sessions')
        .onDelete('CASCADE')

      table
        .enum('class', [
          'Nursery',
          'LKG',
          'UKG',
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
          '10',
          '11',
          '12',
        ])
        .notNullable()

      table.boolean('is_active').defaultTo(true)

      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Index and Keys
      table.unique(['school_id', 'class'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
