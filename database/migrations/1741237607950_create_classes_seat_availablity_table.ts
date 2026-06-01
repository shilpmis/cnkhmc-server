import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateClassSeatAvailabilityTable extends BaseSchema {
  protected tableName = 'class_seat_availabilities'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table
        .integer('academic_session_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('academic_sessions')
        .onDelete('CASCADE')
      table
        .integer('class_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('classes')
        .onDelete('CASCADE')
      table.integer('total_seats').notNullable()
      table.integer('general_available_seats').notNullable().defaultTo(0)
      table.integer('quota_allocated_seats').notNullable().defaultTo(0)
      table.integer('filled_seats').notNullable().defaultTo(0)
      table.integer('remaining_seats').notNullable().defaultTo(0)

      table.timestamp('created_at')
      table.timestamp('updated_at')

      //unique constraint for class_id and academic_session_id
      table.unique(['class_id', 'academic_session_id'], 'uq_class_academic_session')
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
