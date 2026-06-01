import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'admission_inquiries'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // First add new columns
      table.string("first_name", 100).nullable().after('student_name')
      table.string("middle_name", 100).nullable().after('first_name')
      table.string("last_name", 100).nullable().after('middle_name')
      table.dropColumn('student_name')
      // Rename date of birth column
      table.renameColumn('dob', 'birth_date')
      
      // Rename parent contact information columns
      table.renameColumn('parent_name', 'father_name')
      table.renameColumn('parent_contact', 'primary_mobile')
      
      // After data migration would be performed separately, we can drop the old column
      // table.dropColumn('student_name')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Restore original column names
      table.renameColumn('birth_date', 'dob')
      table.renameColumn('father_name', 'parent_name')
      table.renameColumn('primary_mobile', 'parent_contact')
      
      // Drop the newly added columns
      table.dropColumn('')
      table.dropColumn('first_name')
      table.dropColumn('middle_name')
      table.dropColumn('last_name')
      
      // If student_name was dropped, restore it
      // table.string("student_name", 255).nullable()
    })
  }
}