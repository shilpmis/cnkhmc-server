import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'admission_inquiries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()

      table
        .integer('school_id')
        .unsigned()
        .references('id')
        .inTable('schools') // Assuming the parent table is `schools`
        .onDelete('CASCADE') // Ensure cascading delete

      table
        .integer('academic_session_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('academic_sessions')
        .onDelete('CASCADE')

      table.string('student_name', 255).notNullable()
      table.date('dob').notNullable()
      table.enum('gender', ['male', 'female', 'other']).notNullable()

      table
        .integer('class_applying')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('class_seat_availabilities')
        .onDelete('CASCADE')

      table.string('parent_name', 255).notNullable()
      table.string('parent_contact', 15).notNullable()
      table.string('parent_email', 255).nullable()

      table.text('address').notNullable()

      // Previous school details (optional)
      table.string('previous_school').nullable()
      table.string('previous_class').nullable()
      table.string('previous_percentage').nullable()
      table.string('previous_year').nullable()
      table.text('special_achievements').nullable()

      // Applying for Quota
      table.boolean('applying_for_quota').notNullable().defaultTo(false)

      table
        .integer('quota_type')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('quotas')
        .onDelete('SET NULL')

      table.enum('status', ['pending', 'eligible', 'approved', 'ineligible']).defaultTo('pending')
      table.text('admin_notes').nullable()

      table.integer('created_by').unsigned().notNullable().references('id').inTable('users')

      table.boolean('is_converted_to_student').notNullable().defaultTo(false)

      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at').defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
