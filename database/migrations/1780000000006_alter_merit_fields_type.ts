import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'students_meta'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.bigInteger('general_merit').nullable().alter()
      table.bigInteger('category_merit').nullable().alter()
      table.bigInteger('neet_all_india_rank').nullable().alter()
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('general_merit').nullable().alter()
      table.integer('category_merit').nullable().alter()
      table.integer('neet_all_india_rank').nullable().alter()
    })
  }
}
