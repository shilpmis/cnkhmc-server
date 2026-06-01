import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'students_meta'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['aadhar_dise_no'], 'students_meta_aadhar_dise_no_unique')
      table.dropUnique(['account_no'], 'students_meta_account_no_unique')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
