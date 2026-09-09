import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('category', 50).nullable().defaultTo(null).alter()
      table.string('qualification', 255).nullable().defaultTo(null).alter()
      table.string('subject_specialization', 255).nullable().defaultTo(null).alter()
      table.string('blood_group', 20).nullable().defaultTo(null).alter()
      table.string('marital_status', 50).nullable().defaultTo(null).alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, () => {
      // rollback if needed
    })
  }
}
