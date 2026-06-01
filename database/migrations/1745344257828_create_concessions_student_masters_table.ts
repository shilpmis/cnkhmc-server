import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'concessions_student_masters'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('applied_discount', 10, 2).defaultTo(0)

      // table.timestamp('created_at')
      // table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
