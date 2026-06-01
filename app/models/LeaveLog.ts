import Base from '#models/base'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import StaffLeaveApplication from './StaffLeaveApplication.js'
import User from './User.js'

export default class LeaveLog extends Base {
  @column()
  declare leave_application_id: number

  @column()
  declare action: 'apply' | 'withdraw' | 'approve' | 'reject'

  @column()
  declare status: 'pending' | 'approved' | 'rejected' | 'cancelled'

  @column()
  declare performed_by: number

  @column()
  declare remarks: string

  @belongsTo(() => StaffLeaveApplication, {
    localKey: 'id',
    foreignKey: 'leave_application_id',
  })
  declare leave_application: BelongsTo<typeof StaffLeaveApplication>

  @belongsTo(() => User, {
    localKey: 'id',
    foreignKey: 'performed_by',
  })
  declare user: BelongsTo<typeof User>
}
