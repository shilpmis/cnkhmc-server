import Base from '#models/base'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Staff from './Staff.js'
import LeaveTypeMaster from './LeaveTypeMaster.js'
import AcademicSession from './AcademicSession.js'

export default class StaffLeaveBalance extends Base {
  @column()
  declare staff_id: number

  @column()
  declare leave_type_id: number

  @column()
  declare academic_session_id: number

  @column()
  declare academic_year: number

  @column()
  declare total_leaves: number

  @column()
  declare used_leaves: number

  @column()
  declare pending_leaves: number

  @column()
  declare carried_forward: number

  @column()
  declare available_balance: number

  @belongsTo(() => Staff, {
    localKey: 'id',
    foreignKey: 'staff_id',
  })
  declare staff: BelongsTo<typeof Staff>

  @belongsTo(() => LeaveTypeMaster, {
    localKey: 'id',
    foreignKey: 'leave_type_id',
  })
  declare leave_type: BelongsTo<typeof LeaveTypeMaster>

  @belongsTo(() => AcademicSession, {
    localKey: 'id',
    foreignKey: 'academic_session_id',
  })
  declare academic_session: BelongsTo<typeof AcademicSession>
}
