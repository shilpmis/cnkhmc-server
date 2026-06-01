import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('lesson_plan_topics', (table) => {
      table.string('code').nullable()
      table.integer('order').defaultTo(0)
    })

    this.schema.alterTable('daily_diaries', (table) => {
      table.json('topic_ids').nullable()
      table.json('subtopic_ids').nullable()
    })
  }

  async down() {
    this.schema.alterTable('lesson_plan_topics', (table) => {
      table.dropColumn('code')
      table.dropColumn('order')
    })

    this.schema.alterTable('daily_diaries', (table) => {
      table.dropColumn('topic_ids')
      table.dropColumn('subtopic_ids')
    })
  }
}