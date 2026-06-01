import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'concessions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.enum('applicable_to' , ['plan' , 'students']).notNullable().alter();
      table.enum('concessions_to' , ['plan' , 'fees_type']).notNullable();
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}