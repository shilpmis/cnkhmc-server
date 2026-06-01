import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff'

  async up() {
    this.schema.createTable(this.tableName, (table) => {

      table.increments('id')
      table.integer('school_id').unsigned().references('id').inTable('schools').onUpdate('CASCADE').onDelete('CASCADE')
      table.string('employee_code').notNullable().unique();
      table.boolean('is_teaching_role').defaultTo(true).notNullable();
      table
        .integer('staff_role_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('staff_role_master')
        .onDelete('CASCADE')

      // Personal Details
      table.string('first_name', 100).notNullable()
      table.string('middle_name', 100).nullable().defaultTo(null)
      table.string('last_name', 100).notNullable()

      table.string('first_name_in_guj', 100).nullable().defaultTo(null)
      table.string('middle_name_in_guj', 100).nullable().defaultTo(null)
      table.string('last_name_in_guj', 100).nullable().defaultTo(null)

      table.enum('gender', ['Male', 'Female']).notNullable()
      table.date('birth_date').nullable().defaultTo(null)

      table.enum('marital_status', ['Single', 'Married', 'Divorced', 'Widowed']).nullable().defaultTo(null)

      // Contact Details
      table.bigInteger('mobile_number').notNullable()
      table.string('email', 255).unique().nullable().defaultTo(null)

      table.string('emergency_contact_name', 100).nullable().defaultTo(null)
      table.bigInteger('emergency_contact_number').nullable().defaultTo(null)

      // Qualification & Employment
      table.enum('qualification', [
        'D.Ed', 'B.Ed', 'M.Ed', 'B.A + B.Ed', 'B.Sc + B.Ed', 'M.A + B.Ed', 'M.Sc + B.Ed', 'Ph.D',
        'Diploma', 'B.Com', 'BBA', 'MBA', 'M.Com', 'ITI', 'SSC', 'HSC', 'Others'
      ]).nullable().defaultTo(null)

      table.enum('subject_specialization', [
        'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Gujarati',
        'Social Science', 'Computer Science', 'Commerce', 'Economics',
        'Physical Education', 'Arts', 'Music', 'Others'
      ]).nullable().defaultTo(null)

      table.date('joining_date').nullable().defaultTo(null)

      table
        .enum('employment_status', ['Permanent' , 'Trial_Period' , 'Resigned' , 'Contract_Based' , 'Notice_Period'])
        .defaultTo('Permanent')

      table.integer('experience_years').unsigned().nullable().defaultTo(null)

      // Identification
      table.bigInteger('aadhar_no').unique().nullable().defaultTo(null)
      table.string('pan_card_no', 10).unique().nullable().defaultTo(null)
      table.bigInteger('epf_no').unique().nullable().defaultTo(null)
      table.bigInteger('epf_uan_no').unique().nullable().defaultTo(null)

      table.enum('blood_group', ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']).nullable().defaultTo(null)

      table.string('religion', 50).nullable().defaultTo(null)
      table.string('religion_in_guj', 50).nullable().defaultTo(null)

      table.string('caste', 100).nullable().defaultTo(null)
      table.string('caste_in_guj', 100).nullable().defaultTo(null)
      table.enum('category', ['ST', 'SC', 'OBC', 'OPEN']).nullable().defaultTo(null)

      table.string('nationality', 50).nullable().defaultTo(null)

      // Address Details
      table.string('address', 255).nullable().defaultTo(null)
      table.string('district', 100).nullable().defaultTo(null)
      table.string('city', 100).nullable().defaultTo(null)
      table.string('state', 100).nullable().defaultTo(null)
      table.bigInteger('postal_code').unsigned().nullable().defaultTo(null)

      // Bank Details
      table.string('bank_name', 100).nullable().defaultTo(null)
      table.bigInteger('account_no').unique().nullable().defaultTo(null)
      table.string('IFSC_code', 15).nullable().defaultTo(null)

      // Profile Photo
      table.string('profile_photo', 255).nullable().defaultTo(null)

      table.boolean('is_active').defaultTo(true).notNullable();
      table.boolean('is_teching_staff').notNullable();
      // Timestamps
      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at').defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
