import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import FeesPlan from '#models/FeesPlan'
import FeesPlanDetails from '#models/FeesPlanDetails'
import StudentEnrollments from '#models/StudentEnrollments'
import StudentFeesMaster from '#models/StudentFeesMaster'

export default class SeedStudentFeesData extends BaseCommand {
  static commandName = 'seed:student-fees-data'
  static description = 'Seed fee templates for quotas and assign to existing students'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Starting fee templates and student quota seeding...')

    // 1. Ensure Quotas 1, 2, 3 exist
    const quotas = await db.from('quotas').select('*')
    this.logger.info(`Found ${quotas.length} existing quotas.`)

    // 2. Define Fee Plans to create/update
    const feePlansToSeed = [
      // 1st BHMS (class_id: 1)
      {
        name: 'GQ - 1st BHMS',
        class_id: 1,
        quota_id: 1, // Government Quota
        academic_year: 2026,
        total_amount: 85000,
        status: 'Active' as const,
        components: [
          { fees_type_id: 5, name: 'Tuition Fee', amount: 75000, installment_type: 'Half Yearly', total_installment: 2 },
          { fees_type_id: 6, name: 'Admission Fee', amount: 5000, installment_type: 'Admission', total_installment: 1 },
          { fees_type_id: 7, name: 'Laboratory & Library Fee', amount: 5000, installment_type: 'Yearly', total_installment: 1 },
        ],
      },
      {
        name: 'MQ - 1st BHMS',
        class_id: 1,
        quota_id: 2, // Management Quota
        academic_year: 2026,
        total_amount: 150000,
        status: 'Active' as const,
        components: [
          { fees_type_id: 5, name: 'Tuition Fee', amount: 135000, installment_type: 'Half Yearly', total_installment: 2 },
          { fees_type_id: 6, name: 'Admission Fee', amount: 7500, installment_type: 'Admission', total_installment: 1 },
          { fees_type_id: 7, name: 'Laboratory & Library Fee', amount: 7500, installment_type: 'Yearly', total_installment: 1 },
        ],
      },
      {
        name: 'NRI - 1st BHMS',
        class_id: 1,
        quota_id: 3, // NRI Quota
        academic_year: 2026,
        total_amount: 250000,
        status: 'Active' as const,
        components: [
          { fees_type_id: 5, name: 'Tuition Fee', amount: 220000, installment_type: 'Half Yearly', total_installment: 2 },
          { fees_type_id: 6, name: 'Admission Fee', amount: 15000, installment_type: 'Admission', total_installment: 1 },
          { fees_type_id: 7, name: 'Laboratory & Library Fee', amount: 15000, installment_type: 'Yearly', total_installment: 1 },
        ],
      },
      // 2nd BHMS (class_id: 2)
      {
        name: 'GQ - 2nd BHMS',
        class_id: 2,
        quota_id: 1,
        academic_year: 2026,
        total_amount: 85000,
        status: 'Active' as const,
        components: [
          { fees_type_id: 5, name: 'Tuition Fee', amount: 75000, installment_type: 'Half Yearly', total_installment: 2 },
          { fees_type_id: 7, name: 'Laboratory & Library Fee', amount: 10000, installment_type: 'Yearly', total_installment: 1 },
        ],
      },
      {
        name: 'MQ - 2nd BHMS',
        class_id: 2,
        quota_id: 2,
        academic_year: 2026,
        total_amount: 150000,
        status: 'Active' as const,
        components: [
          { fees_type_id: 5, name: 'Tuition Fee', amount: 135000, installment_type: 'Half Yearly', total_installment: 2 },
          { fees_type_id: 7, name: 'Laboratory & Library Fee', amount: 15000, installment_type: 'Yearly', total_installment: 1 },
        ],
      },
      // 3rd BHMS (class_id: 3)
      {
        name: 'GQ - 3rd BHMS',
        class_id: 3,
        quota_id: 1,
        academic_year: 2026,
        total_amount: 85000,
        status: 'Active' as const,
        components: [
          { fees_type_id: 5, name: 'Tuition Fee', amount: 75000, installment_type: 'Half Yearly', total_installment: 2 },
          { fees_type_id: 7, name: 'Laboratory & Library Fee', amount: 10000, installment_type: 'Yearly', total_installment: 1 },
        ],
      },
      {
        name: 'MQ - 3rd BHMS',
        class_id: 3,
        quota_id: 2,
        academic_year: 2026,
        total_amount: 150000,
        status: 'Active' as const,
        components: [
          { fees_type_id: 5, name: 'Tuition Fee', amount: 135000, installment_type: 'Half Yearly', total_installment: 2 },
          { fees_type_id: 7, name: 'Laboratory & Library Fee', amount: 15000, installment_type: 'Yearly', total_installment: 1 },
        ],
      },
      // 4th BHMS (class_id: 4)
      {
        name: 'GQ - 4th BHMS',
        class_id: 4,
        quota_id: 1,
        academic_year: 2026,
        total_amount: 85000,
        status: 'Active' as const,
        components: [
          { fees_type_id: 5, name: 'Tuition Fee', amount: 75000, installment_type: 'Half Yearly', total_installment: 2 },
          { fees_type_id: 7, name: 'Laboratory & Library Fee', amount: 10000, installment_type: 'Yearly', total_installment: 1 },
        ],
      },
      {
        name: 'MQ - 4th BHMS',
        class_id: 4,
        quota_id: 2,
        academic_year: 2026,
        total_amount: 150000,
        status: 'Active' as const,
        components: [
          { fees_type_id: 5, name: 'Tuition Fee', amount: 135000, installment_type: 'Half Yearly', total_installment: 2 },
          { fees_type_id: 7, name: 'Laboratory & Library Fee', amount: 15000, installment_type: 'Yearly', total_installment: 1 },
        ],
      },
    ]

    const createdPlansMap = new Map<string, FeesPlan>()

    for (const p of feePlansToSeed) {
      let existing = await FeesPlan.query()
        .where('class_id', p.class_id)
        .andWhere('quota_id', p.quota_id)
        .andWhere('academic_year', p.academic_year)
        .first()

      if (!existing) {
        existing = await FeesPlan.create({
          name: p.name,
          class_id: p.class_id,
          quota_id: p.quota_id,
          academic_year: p.academic_year,
          total_amount: p.total_amount,
          status: p.status,
        })
        this.logger.info(`Created Fee Plan: ${existing.name} (ID: ${existing.id})`)
      } else {
        existing.name = p.name
        existing.total_amount = p.total_amount
        existing.status = p.status
        await existing.save()
        this.logger.info(`Updated Fee Plan: ${existing.name} (ID: ${existing.id})`)
      }

      createdPlansMap.set(`${p.class_id}_${p.quota_id}`, existing)

      // Ensure components
      for (const comp of p.components) {
        let existingDetail = await FeesPlanDetails.query()
          .where('fees_plan_id', existing.id)
          .andWhere('fees_type_id', comp.fees_type_id)
          .first()

        if (!existingDetail) {
          await FeesPlanDetails.create({
            fees_plan_id: existing.id,
            fees_type_id: comp.fees_type_id,
            installment_type: comp.installment_type,
            total_installment: comp.total_installment,
            total_amount: comp.amount,
            status: 'Active',
          })
        } else {
          existingDetail.total_amount = comp.amount
          existingDetail.status = 'Active'
          await existingDetail.save()
        }
      }
    }

    // 3. Assign Quota and Fee Template to all student enrollments
    this.logger.info('Assigning Quota and Fee Templates to students...')
    const enrollments = await StudentEnrollments.query().preload('division')

    let seededCount = 0
    for (let i = 0; i < enrollments.length; i++) {
      const enr = enrollments[i]
      const classId = enr.division?.class_id || 1

      // Distribute quotas:
      // Index % 10: 0-6 -> Government Quota (1), 7-8 -> Management Quota (2), 9 -> NRI Quota (3 for 1st BHMS, else 2)
      const mod = i % 10
      let assignedQuotaId = 1
      if (mod === 7 || mod === 8) {
        assignedQuotaId = 2
      } else if (mod === 9) {
        assignedQuotaId = classId === 1 ? 3 : 2
      }

      enr.quota_id = assignedQuotaId
      await enr.save()

      // Find matching Fee Plan
      let plan = createdPlansMap.get(`${classId}_${assignedQuotaId}`)
      if (!plan) {
        plan = createdPlansMap.get(`${classId}_1`) || createdPlansMap.get('1_1')
      }

      if (plan) {
        let feeMaster = await StudentFeesMaster.query()
          .where('student_id', enr.student_id)
          .first()

        if (!feeMaster) {
          await StudentFeesMaster.create({
            student_id: enr.student_id,
            fees_plan_id: plan.id,
            academic_year: enr.academic_year || 2026,
            total_amount: Number(plan.total_amount),
            paid_amount: 0,
            discounted_amount: 0,
            due_amount: Number(plan.total_amount),
            status: 'Pending',
            is_locked: true,
            locked_at: null,
            locked_amount: Number(plan.total_amount),
            locked_academic_year: enr.academic_year || 2026,
          })
        } else {
          feeMaster.fees_plan_id = plan.id
          feeMaster.total_amount = Number(plan.total_amount)
          feeMaster.due_amount = Math.max(0, Number(plan.total_amount) - Number(feeMaster.paid_amount || 0))
          feeMaster.is_locked = true
          await feeMaster.save()
        }
      }

      seededCount++
    }

    this.logger.success(`Successfully assigned Quota and Fee Templates to ${seededCount} students!`)
  }
}
