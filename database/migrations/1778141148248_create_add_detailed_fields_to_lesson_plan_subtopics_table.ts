import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lesson_plan_subtopics'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('miller').nullable()
      table.string('bloom').nullable()
      table.string('priority').nullable()
      table.string('tl_mm').nullable()
      table.string('assessment').nullable()
      table.string('integration').nullable()
      table.text('conclusion').nullable()
      table.text('reference_book').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('miller')
      table.dropColumn('bloom')
      table.dropColumn('priority')
      table.dropColumn('tl_mm')
      table.dropColumn('assessment')
      table.dropColumn('integration')
      table.dropColumn('conclusion')
      table.dropColumn('reference_book')
    })
  }
}