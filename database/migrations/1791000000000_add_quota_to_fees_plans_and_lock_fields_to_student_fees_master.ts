import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // 1. Add quota_id to fees_plans table if it doesn't exist
    const hasFeesPlans = await this.schema.hasTable('fees_plans')
    if (hasFeesPlans) {
      const hasQuotaId = await this.schema.hasColumn('fees_plans', 'quota_id')
      if (!hasQuotaId) {
        this.schema.alterTable('fees_plans', (table) => {
          table
            .integer('quota_id')
            .unsigned()
            .nullable()
            .references('id')
            .inTable('quotas')
            .onDelete('SET NULL')
        })
      }
    }

    // 2. Add grandfathering / lock-in fields to student_fees_master
    const hasStudentFeesMaster = await this.schema.hasTable('student_fees_master')
    if (hasStudentFeesMaster) {
      const hasIsLocked = await this.schema.hasColumn('student_fees_master', 'is_locked')
      if (!hasIsLocked) {
        this.schema.alterTable('student_fees_master', (table) => {
          table.boolean('is_locked').defaultTo(true).comment('Cohort grandfathering lock-in flag')
          table.timestamp('locked_at').nullable().comment('Timestamp when fee structure was locked')
          table.decimal('locked_amount', 10, 2).nullable().comment('Locked total fee amount snapshot')
          table.integer('locked_academic_year').unsigned().nullable().comment('Enrollment cohort year')
        })
      }
    }

    // 3. Seed standard quotas (Government Quota, Management Quota, NRI Quota) if missing
    this.defer(async (db) => {
      const defaultQuotas = [
        { name: 'Government Quota', description: 'Standard state government subsidized merit quota', is_active: 1 },
        { name: 'Management Quota', description: 'Institutional management quota seat allocation', is_active: 1 },
        { name: 'NRI Quota', description: 'Non-Resident Indian / International quota seat allocation', is_active: 1 },
      ]

      const schools = await db.from('schools').select('id')
      // On a brand-new database there is no school yet (the seeders create it), so there is nothing to attach quotas to
      if (schools.length === 0) return
      const targetSchoolId = schools[0].id
      const currentYear = new Date().getFullYear()

      for (const q of defaultQuotas) {
        const existing = await db
          .from('quotas')
          .where('name', q.name)
          .where('school_id', targetSchoolId)
          .first()

        if (!existing) {
          await db.table('quotas').insert({
            name: q.name,
            description: q.description,
            school_id: targetSchoolId,
            academic_year: currentYear,
            is_active: 1,
            created_at: new Date(),
            updated_at: new Date(),
          })
        }
      }
    })
  }

  async down() {
    const hasFeesPlans = await this.schema.hasTable('fees_plans')
    if (hasFeesPlans) {
      const hasQuotaId = await this.schema.hasColumn('fees_plans', 'quota_id')
      if (hasQuotaId) {
        this.schema.alterTable('fees_plans', (table) => {
          table.dropColumn('quota_id')
        })
      }
    }

    const hasStudentFeesMaster = await this.schema.hasTable('student_fees_master')
    if (hasStudentFeesMaster) {
      this.schema.alterTable('student_fees_master', (table) => {
        table.dropColumn('is_locked')
        table.dropColumn('locked_at')
        table.dropColumn('locked_amount')
        table.dropColumn('locked_academic_year')
      })
    }
  }
}
