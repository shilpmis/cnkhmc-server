import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fees_types'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.enum('applicable_to' , ['student' , 'plan']).defaultTo('plan');
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}