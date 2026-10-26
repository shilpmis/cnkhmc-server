import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Heads of the final student sheet that had no column yet: name as per Aadhaar, university SPID number,
 * admission category, tuition fees, internship roll number and the bank branch pin code.
 */
export default class extends BaseSchema {
  protected tableName = 'students_meta'

  private columns: Array<[string, number]> = [
    ['name_as_per_aadhar', 150],
    ['university_spid_no', 50],
    ['admission_category', 100],
    ['tuition_fees', 50],
    ['roll_no_internship', 30],
    ['bank_branch_pincode', 20],
  ]

  async up() {
    for (const [name] of this.columns) {
      if (!(await this.schema.hasColumn(this.tableName, name))) {
        this.schema.alterTable(this.tableName, (table) => {
          // students_meta is close to the row-size limit, so short text goes into TEXT columns (stored off-row)
          table.text(name).nullable()
        })
      }
    }
  }

  async down() {
    for (const [name] of this.columns) {
      if (await this.schema.hasColumn(this.tableName, name)) {
        this.schema.alterTable(this.tableName, (table) => table.dropColumn(name))
      }
    }
  }
}
