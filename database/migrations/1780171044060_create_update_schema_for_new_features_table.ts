import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // 1. Create staff_configurations table
    this.schema.createTable('staff_configurations', (table) => {
      table.increments('id').primary()
      table.integer('school_id').unsigned().references('id').inTable('schools').onDelete('CASCADE')
      table.string('config_type', 50).notNullable() // 'STAFF_TYPE', 'STAFF_CATEGORY', 'DESIGNATION'
      table.string('name', 255).notNullable()
      table.integer('parent_id').unsigned().nullable().references('id').inTable('staff_configurations').onDelete('SET NULL')
      table.timestamp('created_at').nullable()
      table.timestamp('updated_at').nullable()
    })

    // 2. Alter staff table to add resignation_date and retirement_date
    const hasResignationDate = await this.schema.hasColumn('staff', 'resignation_date')
    const hasRetirementDate = await this.schema.hasColumn('staff', 'retirement_date')
    if (!hasResignationDate || !hasRetirementDate) {
      this.schema.alterTable('staff', (table) => {
        if (!hasResignationDate) {
          table.date('resignation_date').nullable()
        }
        if (!hasRetirementDate) {
          table.date('retirement_date').nullable()
        }
      })
    }

    // 3. Alter daily_diaries table to add conclusion, reference_book, and attendance
    this.schema.alterTable('daily_diaries', (table) => {
      table.text('conclusion').nullable()
      table.text('reference_book').nullable()
      table.string('attendance', 100).nullable()
    })
  }

  async down() {
    this.schema.dropTable('staff_configurations')

    const hasResignationDate = await this.schema.hasColumn('staff', 'resignation_date')
    const hasRetirementDate = await this.schema.hasColumn('staff', 'retirement_date')
    if (hasResignationDate || hasRetirementDate) {
      this.schema.alterTable('staff', (table) => {
        if (hasResignationDate) {
          table.dropColumn('resignation_date')
        }
        if (hasRetirementDate) {
          table.dropColumn('retirement_date')
        }
      })
    }

    this.schema.alterTable('daily_diaries', (table) => {
      table.dropColumn('conclusion')
      table.dropColumn('reference_book')
      table.dropColumn('attendance')
    })
  }
}