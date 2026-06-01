import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lesson_plan_topics'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('lesson_plan_id').unsigned().references('id').inTable('lesson_plans').onDelete('CASCADE')
      table.string('name').notNullable()
      table.text('description').nullable()
      table.float('required_hours').notNullable().defaultTo(0)
      table.boolean('is_completed').notNullable().defaultTo(false)
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}