import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'concessions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {

      table.enum('applicable_to' , ['fees_types' , 'plan' , 'students']).notNullable().alter();
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}