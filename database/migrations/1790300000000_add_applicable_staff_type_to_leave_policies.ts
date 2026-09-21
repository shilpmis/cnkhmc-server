import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Adds `applicable_staff_type` to `leave_policies`.
 *
 * This column restricts which staff type (staff.staff_type) can see/use a policy.
 * NULL means the policy is global (applies to all staff types).
 *
 * Existing policies are auto-populated via keyword matching on their leave type name:
 *   - Name contains "Hospital"                   → "Hospital Staff"
 *   - Name contains "Teaching" (any variant)     → "Teaching Staff"
 *   - Name contains "Non Teaching"               → "Non-Teaching"
 *   - NULL / anything else                       → NULL (global)
 *
 * Admins can override individual rows from the Leave Policy settings UI.
 */
export default class extends BaseSchema {
  protected tableName = 'leave_policies'

  async up() {
    const hasCol = await this.schema.hasColumn(this.tableName, 'applicable_staff_type')
    if (!hasCol) {
      this.schema.alterTable(this.tableName, (table) => {
        table.string('applicable_staff_type', 100).nullable().defaultTo(null)
      })
    }

    // Defer data population until after the schema change
    this.defer(async (db) => {
      // Get all leave policies joined with their leave type names
      const rows = await db
        .from('leave_policies as lp')
        .join('leave_types_master as ltm', 'lp.leave_type_id', 'ltm.id')
        .select('lp.id', 'ltm.leave_type_name')

      for (const row of rows) {
        const name: string = (row.leave_type_name || '').toLowerCase()
        let applicable: string | null = null

        if (name.includes('hospital')) {
          applicable = 'Hospital Staff'
        } else if (
          name.includes('non teaching') ||
          name.includes('non-teaching') ||
          name === 'non teaching'
        ) {
          applicable = 'Non-Teaching Staff'
        } else if (name.includes('non vact') || name.includes('non-vact') || name.includes('non vacat')) {
          applicable = 'Non Vactional Teaching'
        } else if (name.includes('vact') || name.includes('vacat')) {
          applicable = 'Vactional Staff Teaching'
        } else if (name.includes('teaching')) {
          applicable = 'Teaching Staff'
        }

        if (applicable !== null) {
          await db.from('leave_policies').where('id', row.id).update({ applicable_staff_type: applicable })
        }
      }
    })
  }

  async down() {
    const hasCol = await this.schema.hasColumn(this.tableName, 'applicable_staff_type')
    if (hasCol) {
      this.schema.alterTable(this.tableName, (table) => {
        table.dropColumn('applicable_staff_type')
      })
    }
  }
}
