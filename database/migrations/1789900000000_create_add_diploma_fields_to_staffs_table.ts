import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('diploma_degree', 100).nullable().defaultTo(null)
      table.string('diploma_council', 255).nullable().defaultTo(null)
      table.integer('diploma_passing_year').nullable().defaultTo(null)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('diploma_degree')
      table.dropColumn('diploma_council')
      table.dropColumn('diploma_passing_year')
    })
  }
}
