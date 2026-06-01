import { belongsTo, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import Staff from './Staff.js'
import * as relations from '@adonisjs/lucid/types/relations'
import Base from './base.js'
import StaffSalaryTemplates from './StaffSalaryTemplates.js'
import SatffPayrunTemplates from './SatffPayrunTemplates.js'

export default class StaffEnrollment extends Base {
  @column()
  declare academic_session_id: number

  @column()
  declare staff_id: number

  @column()
  declare school_id: number

  @column()
  declare status: 'Retained' | 'Transfer' | 'Resigned' | 'New-Joiner'

  @column()
  declare remarks: string | null

  @belongsTo(() => Staff, {
    foreignKey: 'staff_id', // Fixed from 'staffId' to match column name
    localKey: 'id',
  })
  declare staff: relations.BelongsTo<typeof Staff>

  @hasOne(() => StaffSalaryTemplates, {
    localKey: 'id',
    foreignKey: 'staff_enrollments_id',
  })
  declare staff_salary_templates: relations.HasOne<typeof StaffSalaryTemplates>

  @hasMany(() => SatffPayrunTemplates, {
    localKey: 'id',
    foreignKey: 'staff_enrollments_id',
  })
  declare pay_runs: relations.HasMany<typeof SatffPayrunTemplates>
}
