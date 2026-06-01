import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff_enrollments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.enum('status' , ['Retained' , 'Transfer' , 'Resigned' , 'New-Joiner']).defaultTo('Retained').alter();
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}