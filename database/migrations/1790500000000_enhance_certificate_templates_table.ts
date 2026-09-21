import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'certificate_templates'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('code', 100).nullable()
      table.string('target_type', 50).defaultTo('staff').notNullable()
      table.string('description', 500).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('code')
      table.dropColumn('target_type')
      table.dropColumn('description')
    })
  }
}
