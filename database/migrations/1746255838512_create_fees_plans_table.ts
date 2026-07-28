import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fees_plans'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .foreign('academic_year', 'fk_academic_year')
        

      table
        .foreign('division_id', 'fk_division_id')
        .references('id')
        .inTable('divisions')
        .onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // table.dropForeign('academic_year')
      table.dropForeign('division_id', 'fk_division_id')
    })
  }
}
