import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff'

  async up() {
    const hasReporting = await this.schema.hasColumn(this.tableName, 'reporting_to_staff_id')
    const hasCaliber = await this.schema.hasColumn(this.tableName, 'caliber_level')

    this.schema.alterTable(this.tableName, (table) => {
      if (!hasReporting) {
        table.integer('reporting_to_staff_id').unsigned().nullable().references('id').inTable('staff').onDelete('SET NULL')
      }
      if (!hasCaliber) {
        table.integer('caliber_level').nullable().defaultTo(4)
      }
    })

    // Populate initial caliber levels based on roles / designations
    this.defer(async (db) => {
      // Principal -> Caliber 2
      await db
        .from('staff')
        .whereIn('staff_role_id', (subQuery) => {
          subQuery.from('staff_role_master').select('id').whereRaw('LOWER(role) LIKE ?', ['%principal%'])
        })
        .orWhereRaw('LOWER(designation) LIKE ?', ['%principal%'])
        .update({ caliber_level: 2 })

      // Head-Teacher / HOD -> Caliber 3
      await db
        .from('staff')
        .whereIn('staff_role_id', (subQuery) => {
          subQuery.from('staff_role_master').select('id').whereRaw('LOWER(role) LIKE ? OR LOWER(role) LIKE ?', ['%head%', '%hod%'])
        })
        .orWhereRaw('LOWER(designation) LIKE ? OR LOWER(designation) LIKE ?', ['%head%', '%hod%'])
        .update({ caliber_level: 3 })

      // Peon, Mess, Hostel -> Caliber 5
      await db
        .from('staff')
        .whereIn('staff_role_id', (subQuery) => {
          subQuery.from('staff_role_master').select('id').whereRaw('LOWER(role) LIKE ? OR LOWER(role) LIKE ? OR LOWER(role) LIKE ?', ['%peon%', '%mess%', '%hostel%'])
        })
        .update({ caliber_level: 5 })
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['reporting_to_staff_id'])
      table.dropColumn('reporting_to_staff_id')
      table.dropColumn('caliber_level')
    })
  }
}
