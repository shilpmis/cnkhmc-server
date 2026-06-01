import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lesson_plan_subtopics'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('competency').nullable()
      table.text('outcome').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('competency')
      table.dropColumn('outcome')
    })
  }
}