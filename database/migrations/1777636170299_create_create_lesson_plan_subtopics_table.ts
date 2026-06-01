import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lesson_plan_subtopics'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('topic_id').unsigned().references('id').inTable('lesson_plan_topics').onDelete('CASCADE')
      table.string('name').notNullable()
      table.string('code').nullable()
      table.text('detail').nullable()
      table.boolean('is_completed').defaultTo(false)
      table.integer('order').defaultTo(0)
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}