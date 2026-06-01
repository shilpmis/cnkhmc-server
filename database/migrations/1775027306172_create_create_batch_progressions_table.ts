import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'batch_progressions'

  async up() {
    const exists = await this.schema.hasTable(this.tableName)
    if (exists) return

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('batch_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('batches')
        .onDelete('CASCADE')
      table.integer('course_phase_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('course_phases')
        .onDelete('CASCADE')
      table.date('start_date').notNullable()
      table.date('end_date').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
