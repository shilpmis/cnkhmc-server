import Base from '#models/base'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import StaffAttendanceMaster from './StaffAttendanceMaster.js'
import User from './User.js'

export default class StaffAttendanceEditRequest extends Base {
  @column()
  declare staff_attendance_id: number

  @column({
    serialize: (value: string) => value ? value : null,
  })
  declare requested_check_in_time: string | null

  @column({
    serialize: (value: string) => value ? value : null,
  })
  declare requested_check_out_time: string | null

  @column()
  declare reason: string

  @column()
  declare status: 'pending' | 'approved' | 'rejected'

  @column()
  declare admin_remarks: string | null

  @column()
  declare requested_by: number

  @column()
  declare actioned_by: number | null

  @column.dateTime({ autoCreate: false })
  declare actioned_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => StaffAttendanceMaster, {
    foreignKey: 'staff_attendance_id',
    localKey: 'id',
  })
  declare attendance: BelongsTo<typeof StaffAttendanceMaster>

  @belongsTo(() => User, {
    foreignKey: 'requested_by',
    localKey: 'id',
  })
  declare requester: BelongsTo<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'actioned_by',
    localKey: 'id',
  })
  declare actionedBy: BelongsTo<typeof User>
}