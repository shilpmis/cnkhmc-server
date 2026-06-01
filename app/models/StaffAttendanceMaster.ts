import Base from '#models/base'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Staff from './Staff.js'
import User from './User.js'
import StaffAttendanceEditRequest from './StaffAttendanceEditRequest.js'

export default class StaffAttendanceMaster extends Base {
  @column()
  declare academic_session_id: number

  @column()
  declare staff_id: number

  @column({
    serialize: (value: Date) => Base.serializeDateAsSQLDateString(value),
  })
  declare attendance_date: Date

  @column({
    serialize: (value: string) => value ? value : null,
  })
  declare check_in_time: string | null

  @column({
    serialize: (value: string) => value ? value : null,
  })
  declare check_out_time: string | null

  @column()
  declare status: 'present' | 'absent' | 'late' | 'half_day'

  @column()
  declare remarks: string | null

  @column()
  declare marked_by: number | null

  @column()
  declare is_self_marked: boolean

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => Staff, {
    foreignKey: 'staff_id',
    localKey: 'id',
  })
  declare staff: BelongsTo<typeof Staff>

  @belongsTo(() => User, {
    foreignKey: 'marked_by',
    localKey: 'id',
  })
  declare marker: BelongsTo<typeof User>

  @hasMany(() => StaffAttendanceEditRequest, {
    foreignKey: 'staff_attendance_id',
    localKey: 'id',
  })
  declare editRequests: HasMany<typeof StaffAttendanceEditRequest>
}