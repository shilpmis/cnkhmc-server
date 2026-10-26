import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Adds the standard college fee types for every school, for one academic session.
 * Safe to re-run: a type that already exists (same school, session and name, ignoring case) is skipped.
 *
 *   node ace seed:fee-types --dry-run          show what would be added
 *   node ace seed:fee-types                    add to the latest academic session that has fee types
 *   node ace seed:fee-types --year=2026        add to a specific session
 *
 * The yearly rollover copies fee types to the next session, so run this once per school.
 */
// applicable_to: 'plan' fees are part of every student's class template; 'student' fees are optional and are
// charged per student with Apply Extra Fees (only some students take the hostel, mess or a certificate).
const STANDARD_FEE_TYPES: { name: string; description: string; applicable_to: 'plan' | 'student' }[] = [
  { name: 'Tuition Fee', description: 'Annual academic tuition fee', applicable_to: 'plan' },
  { name: 'College Deposit', description: 'Refundable college security deposit', applicable_to: 'plan' },
  { name: 'Hostel Fee', description: 'Hostel accommodation fee', applicable_to: 'student' },
  { name: 'Mess Fee', description: 'Hostel mess and food charges', applicable_to: 'student' },
  { name: 'Hostel Deposit', description: 'Refundable hostel security deposit', applicable_to: 'student' },
  { name: 'Certificate Fee', description: 'Fee for certificates issued by the college', applicable_to: 'student' },
]

export default class SeedFeeTypes extends BaseCommand {
  static commandName = 'seed:fee-types'
  static description = 'Add the standard college fee types (skips ones that already exist)'
  static options: CommandOptions = { startApp: true }

  @flags.boolean({ description: 'Report what would be added without writing' })
  declare dryRun: boolean

  @flags.number({ description: 'Academic session (year) to add them to' })
  declare year: number

  async run() {
    const { default: db } = await import('@adonisjs/lucid/services/db')

    const latest = await db.from('fees_types').max('academic_year as y').first()
    const academicYear = this.year || Number(latest?.y)
    if (!academicYear) {
      this.logger.error('No academic year given and none found. Use --year=2026')
      this.exitCode = 1
      return
    }

    const schools = await db.from('schools').select('id', 'name')
    let added = 0
    let skipped = 0

    for (const school of schools) {
      const existing = await db
        .from('fees_types')
        .where('school_id', school.id)
        .andWhere('academic_year', academicYear)
        .select('name')
      const have = new Set(existing.map((r: any) => String(r.name).trim().toLowerCase()))

      for (const type of STANDARD_FEE_TYPES) {
        if (have.has(type.name.toLowerCase())) {
          skipped++
          this.logger.info(`school ${school.id}, ${academicYear}: "${type.name}" already exists`)
          continue
        }
        if (!this.dryRun) {
          await db.table('fees_types').insert({
            school_id: school.id,
            academic_year: academicYear,
            name: type.name,
            description: type.description,
            applicable_to: type.applicable_to,
            status: 'Active',
            created_at: new Date(),
            updated_at: new Date(),
          })
        }
        added++
        this.logger.success(`school ${school.id}, ${academicYear}: ${this.dryRun ? 'would add' : 'added'} "${type.name}"`)
      }
    }

    this.logger.info(`${this.dryRun ? 'Dry run' : 'Done'}: ${added} ${this.dryRun ? 'to add' : 'added'}, ${skipped} already present`)
  }
}
