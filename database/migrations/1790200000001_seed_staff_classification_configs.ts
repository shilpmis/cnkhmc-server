import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSchema {
  async up() {
    const schools = await db.from('schools').select('id')

    const defaultStaffTypes = [
      'Teaching',
      'Non Teaching',
      'Hospital',
      'Mess',
      'Hostel',
      'Other'
    ]

    const defaultEmploymentStatuses = [
      'Full Time',
      'Guest/Visiting',
      'On Call',
      'Part Time',
      'Practising Consultant',
      'Adhoc',
      'Contractual'
    ]

    const defaultHospitalCategories = [
      'Medical',
      'Para-Medical',
      'Auxillary',
      'Administrative'
    ]

    for (const school of schools) {
      // 1. Seed Staff (STAFF_TYPE)
      const staffTypeMap = new Map<string, number>()
      for (const st of defaultStaffTypes) {
        const existing = await db
          .from('staff_configurations')
          .where('school_id', school.id)
          .andWhere('config_type', 'STAFF_TYPE')
          .andWhere('name', st)
          .first()

        if (!existing) {
          const [inserted] = await db.table('staff_configurations').insert({
            school_id: school.id,
            config_type: 'STAFF_TYPE',
            name: st,
            parent_id: null,
            created_at: new Date(),
            updated_at: new Date(),
          }).returning('id')
          const id = typeof inserted === 'object' ? inserted.id : inserted
          staffTypeMap.set(st, id)
        } else {
          staffTypeMap.set(st, existing.id)
        }
      }

      // 2. Seed Staff Types / Employment Statuses (EMPLOYMENT_STATUS)
      for (const status of defaultEmploymentStatuses) {
        const existing = await db
          .from('staff_configurations')
          .where('school_id', school.id)
          .andWhere('config_type', 'EMPLOYMENT_STATUS')
          .andWhere('name', status)
          .first()

        if (!existing) {
          await db.table('staff_configurations').insert({
            school_id: school.id,
            config_type: 'EMPLOYMENT_STATUS',
            name: status,
            parent_id: null,
            created_at: new Date(),
            updated_at: new Date(),
          })
        }
      }

      // 3. Seed Staff Categories (STAFF_CATEGORY)
      const hospitalParentId = staffTypeMap.get('Hospital') || null
      for (const cat of defaultHospitalCategories) {
        const existing = await db
          .from('staff_configurations')
          .where('school_id', school.id)
          .andWhere('config_type', 'STAFF_CATEGORY')
          .andWhere('name', cat)
          .first()

        if (!existing) {
          await db.table('staff_configurations').insert({
            school_id: school.id,
            config_type: 'STAFF_CATEGORY',
            name: cat,
            parent_id: hospitalParentId,
            created_at: new Date(),
            updated_at: new Date(),
          })
        }
      }
    }
  }

  async down() {
    // No-op
  }
}
