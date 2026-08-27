import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lesson_plan_topics'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.float('completed_hours').defaultTo(0).notNullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('completed_hours')
    })
  }
}