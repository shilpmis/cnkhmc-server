import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Adds columns to the staff table that were defined in the model/validators
 * but never reached the DB because a previous migration failed or was omitted.
 *
 * This migration dynamically checks for the presence of each column to support both
 * clean database installations (where they are missing) and migrated installations
 * (where they may already exist).
 */
export default class extends BaseSchema {
  protected tableName = 'staff'

  async up() {
    const columnsToAdd = [
      { name: 'minority', type: 'string', length: 50 },
      { name: 'designation', type: 'string', length: 100 },
      { name: 'staff_type', type: 'string', length: 50 },
      { name: 'staff_category', type: 'string', length: 50 },
      { name: 'nature_of_appointment', type: 'string', length: 100 },
      { name: 'registration_authority', type: 'string', length: 255 },
      { name: 'branch_details', type: 'string', length: 255 },
      { name: 'qualification_college', type: 'string', length: 255 },
      { name: 'qualification_university', type: 'string', length: 255 },
      { name: 'short_name', type: 'string', length: 255 },
      { name: 'total_experience', type: 'integer' },
      { name: 'registration_date', type: 'date' },
      { name: 'ayush_teacher_code', type: 'string', length: 255 },
      { name: 'uni_approval_date', type: 'date' },
      { name: 'uni_approval_no', type: 'string', length: 255 },
      { name: 'date_of_appointment', type: 'date' },
      { name: 'date_of_promotion', type: 'date' },
      { name: 'registration_no', type: 'string', length: 255 },
      { name: 'name_of_council', type: 'string', length: 255 },
      { name: 'md_subject_name', type: 'string', length: 255 },
      { name: 'date_of_passing', type: 'string', length: 7 },
      { name: 'voter_id_no', type: 'string', length: 255 },
      { name: 'driving_license_no', type: 'string', length: 255 },
      { name: 'driving_license_validity', type: 'date' }
    ]

    const checkedColumns: any[] = []
    for (const col of columnsToAdd) {
      const hasCol = await this.schema.hasColumn(this.tableName, col.name)
      if (!hasCol) {
        checkedColumns.push(col)
      }
    }

    if (checkedColumns.length > 0) {
      this.schema.alterTable(this.tableName, (table) => {
        for (const col of checkedColumns) {
          if (col.type === 'string') {
            table.string(col.name, col.length).nullable().defaultTo(null)
          } else if (col.type === 'integer') {
            table.integer(col.name).nullable().defaultTo(null)
          } else if (col.type === 'date') {
            table.date(col.name).nullable().defaultTo(null)
          }
        }
      })
    }
  }

  async down() {
    const columnsToDrop = [
      'minority', 'designation', 'staff_type', 'staff_category', 
      'nature_of_appointment', 'registration_authority', 'branch_details', 
      'qualification_college', 'qualification_university', 'short_name', 
      'total_experience', 'registration_date', 'ayush_teacher_code', 
      'uni_approval_date', 'uni_approval_no', 'date_of_appointment', 
      'date_of_promotion', 'registration_no', 'name_of_council', 
      'md_subject_name', 'date_of_passing', 'voter_id_no', 
      'driving_license_no', 'driving_license_validity'
    ]

    const existingColumns: string[] = []
    for (const colName of columnsToDrop) {
      const hasCol = await this.schema.hasColumn(this.tableName, colName)
      if (hasCol) {
        existingColumns.push(colName)
      }
    }

    if (existingColumns.length > 0) {
      this.schema.alterTable(this.tableName, (table) => {
        for (const colName of existingColumns) {
          table.dropColumn(colName)
        }
      })
    }
  }
}
