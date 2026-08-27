import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'daily_diaries'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.json('topic_durations').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('topic_durations')
    })
  }
}