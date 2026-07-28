import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lesson_plans'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('subject_id').unsigned().references('id').inTable('subjects').onDelete('CASCADE')
      table.integer('academic_year').notNullable()
      table.integer('school_id').unsigned().references('id').inTable('schools').onDelete('CASCADE')
      table.float('total_required_hours').notNullable().defaultTo(0)
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}