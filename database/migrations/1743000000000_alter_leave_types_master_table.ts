import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'leave_types_master'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Remove any duplicate records before adding the unique constraint
      // This is important to prevent migration failure due to existing duplicates
      
      // Add a composite unique constraint on leave_type_name and school_id
      // This ensures leave type names are unique per school
      table.unique(['leave_type_name', 'school_id', 'academic_session_id'], 'unique_leave_type_per_school_session')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Drop the unique constraint
      table.dropUnique(['leave_type_name', 'school_id', 'academic_session_id'], 'unique_leave_type_per_school_session')
    })
  }
}
