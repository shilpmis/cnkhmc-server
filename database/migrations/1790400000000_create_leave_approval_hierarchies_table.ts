import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'leave_approval_hierarchies'

  async up() {
    const hasTable = await this.schema.hasTable(this.tableName)
    if (!hasTable) {
      this.schema.createTable(this.tableName, (table) => {
        table.increments('id')
        table.integer('school_id').unsigned().references('id').inTable('schools').onDelete('CASCADE')
        table.integer('academic_year').nullable()
        table.integer('applicant_role_id').unsigned().nullable().references('id').inTable('staff_role_master').onDelete('CASCADE')
        table.integer('approver_role_id').unsigned().nullable().references('id').inTable('staff_role_master').onDelete('CASCADE')
        table.integer('department_id').unsigned().nullable().references('id').inTable('departments').onDelete('SET NULL')
        table.boolean('require_same_department').defaultTo(true)
        table.integer('min_approver_caliber').defaultTo(2)
        table.integer('priority').defaultTo(1)
        table.boolean('is_active').defaultTo(true)
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
        table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
      })
    }
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
