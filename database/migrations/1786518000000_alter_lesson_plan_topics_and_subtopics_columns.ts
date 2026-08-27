import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('lesson_plan_topics', (table) => {
      table.text('name').alter()
    })

    this.schema.alterTable('lesson_plan_subtopics', (table) => {
      table.text('name').alter()
      table.text('tl_mm').alter()
    })
  }

  async down() {
    this.schema.alterTable('lesson_plan_topics', (table) => {
      table.string('name', 255).alter()
    })

    this.schema.alterTable('lesson_plan_subtopics', (table) => {
      table.string('name', 255).alter()
      table.string('tl_mm', 255).alter()
    })
  }
}
