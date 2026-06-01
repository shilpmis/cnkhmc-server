import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'students_meta'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('sub_caste').nullable()
      table.text('quota_fees').nullable()
      table.text('activity_house').nullable()
      table.text('bank_branch_name').nullable()
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns('sub_caste', 'quota_fees', 'activity_house', 'bank_branch_name')
    })
  }
}
