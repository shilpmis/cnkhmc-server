import Base from '#models/base'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import LeaveTypeMaster from './LeaveTypeMaster.js'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Staff from './Staff.js'
import User from './User.js'
import LeaveLog from './LeaveLog.js'

export default class StaffLeaveApplication extends Base {
  @column()
  declare uuid: string

  @column()
  declare staff_id: number

  @column()
  declare academic_session_id: number

  @column()
  declare leave_type_id: number

  @column()
  declare applied_by: number | null

  @column()
  declare applied_by_self: boolean

  @column()
  declare approved_by: number | null

  @column({
    serialize: (value) => value ? new Date(value).toISOString() : null,
  })
  declare approved_at: string | null

  @column({
    serialize: (value: Date) => Base.serializeDateAsSQLDateString(value),
  })
  declare from_date: Date
    
  @column({
    serialize: (value: Date) => Base.serializeDateAsSQLDateString(value),
  })
  declare to_date: Date
    
  @column()
  declare number_of_days: number

  @column()
  declare remarks: string | null

  @column()
  declare is_half_day: boolean

  @column()
  declare half_day_type: 'first_half' | 'second_half' | 'none'

  @column()
  declare is_hourly_leave: boolean

  @column()
  declare total_hour: number | null

  @column()
  declare reason: string

  @column()
  declare documents: Object

  @column()
  declare status: 'pending' | 'approved' | 'rejected' | 'cancelled'

  @belongsTo(() => LeaveTypeMaster, {
    localKey: 'id',
    foreignKey: 'leave_type_id',
  })
  declare leave_type: BelongsTo<typeof LeaveTypeMaster>

  @belongsTo(() => Staff, {
    localKey: 'id',
    foreignKey: 'staff_id',
  })
  declare staff: BelongsTo<typeof Staff>

  @belongsTo(() => User, {
    localKey: 'id',
    foreignKey: 'applied_by',
  })
  declare applied_by_user: BelongsTo<typeof User>

  @belongsTo(() => User, {
    localKey: 'id',
    foreignKey: 'approved_by',
  })
  declare approved_by_user: BelongsTo<typeof User>

  @hasMany(() => LeaveLog, {
    localKey: 'id',
    foreignKey: 'leave_application_id',
  })
  declare logs: HasMany<typeof LeaveLog>
}

