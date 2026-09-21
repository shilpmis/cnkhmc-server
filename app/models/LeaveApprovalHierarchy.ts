import Base from '#models/base'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import StaffMaster from './StaffMaster.js'
import Department from './Department.js'
import Schools from './Schools.js'

export default class LeaveApprovalHierarchy extends Base {
  public static table = 'leave_approval_hierarchies'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare school_id: number

  @column()
  declare academic_year: number | null

  @column()
  declare applicant_role_id: number | null

  @column()
  declare approver_role_id: number | null

  @column()
  declare department_id: number | null

  @column()
  declare require_same_department: boolean

  @column()
  declare min_approver_caliber: number

  @column()
  declare priority: number

  @column()
  declare is_active: boolean

  @belongsTo(() => Schools, {
    localKey: 'id',
    foreignKey: 'school_id',
  })
  declare school: BelongsTo<typeof Schools>

  @belongsTo(() => StaffMaster, {
    localKey: 'id',
    foreignKey: 'applicant_role_id',
  })
  declare applicant_role: BelongsTo<typeof StaffMaster>

  @belongsTo(() => StaffMaster, {
    localKey: 'id',
    foreignKey: 'approver_role_id',
  })
  declare approver_role: BelongsTo<typeof StaffMaster>

  @belongsTo(() => Department, {
    localKey: 'id',
    foreignKey: 'department_id',
  })
  declare department: BelongsTo<typeof Department>
}
