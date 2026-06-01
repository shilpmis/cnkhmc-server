import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lesson_plan_subtopics'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('lesson_plan_number').nullable()
      table.float('required_hours').nullable().defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('lesson_plan_number')
      table.dropColumn('required_hours')
    })
  }
}