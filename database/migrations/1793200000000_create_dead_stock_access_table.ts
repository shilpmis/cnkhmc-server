import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Which dead stock (inventory) departments a staff member may see and work with. One row per granted
 * department; a row with no department means every department ("All departments"). A staff member
 * with no rows has no dead stock access, unless their role always has it (admin, principal, ...).
 */
export default class extends BaseSchema {
  protected tableName = 'dead_stock_access'

  async up() {
    if (await this.schema.hasTable(this.tableName)) return
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('staff_id').unsigned().notNullable().references('id').inTable('staff').onDelete('CASCADE')
      table
        .integer('inventory_department_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('inventory_departments')
        .onDelete('CASCADE')
      table.integer('granted_by').unsigned().nullable()
      table.timestamp('created_at').nullable()
      table.timestamp('updated_at').nullable()
      table.index(['staff_id'])
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
