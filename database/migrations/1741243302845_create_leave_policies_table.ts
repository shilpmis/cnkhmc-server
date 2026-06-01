import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'leave_policies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('academic_session_id').unsigned().references('id').inTable('schools') // wrong , should be academic_sessions added in new migration
      table.integer('school_id').unsigned().references('id').inTable('schools')
      table.integer('staff_role_id').unsigned().references('id').inTable('staff_role_master')
      table.integer('leave_type_id').unsigned().references('id').inTable('leave_types_master')
      table.integer('annual_quota').notNullable()
      table.boolean('can_carry_forward').defaultTo(false)
      table.integer('max_carry_forward_days').defaultTo(0)
      table.integer('max_consecutive_days').defaultTo(0)
      table.boolean('requires_approval').defaultTo(true)
      table.json('approval_hierarchy').notNullable() // [{"level": 1, "role_id": 1}, ...]
      table.json('deduction_rules').notNullable() // For payroll integration
      table.boolean('is_active').defaultTo(true)

      table.unique(['staff_role_id', 'leave_type_id'])

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
