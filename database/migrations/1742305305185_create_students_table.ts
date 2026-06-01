import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'students'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['aadhar_no']);
      table.bigInteger('aadhar_no').unsigned().nullable().alter({alterNullable : true});
      table.unique(['aadhar_no']);
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}