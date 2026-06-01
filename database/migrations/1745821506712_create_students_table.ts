import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'students'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['aadhar_no'])
      // table.dropUnique(['aadhar_no'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
