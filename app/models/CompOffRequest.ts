import Base from '#models/base'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Staff from './Staff.js'
import User from './User.js'
import Schools from './Schools.js'

export default class CompOffRequest extends Base {
  static table = 'comp_off_requests'

  @column()
  declare uuid: string

  @column()
  declare staff_id: number

  @column()
  declare school_id: number

  @column()
  declare academic_year: number | null

  @column({
    serialize: (value: Date | string) => (value ? Base.serializeDateAsSQLDateString(value as Date) : null),
  })
  declare worked_date: Date | string

  @column()
  declare day_type: 'full_day' | 'half_day'

  @column()
  declare credited_days: number

  @column()
  declare reason: string

  @column()
  declare description: string | null

  @column()
  declare status: 'pending' | 'approved' | 'rejected' | 'cancelled'

  @column()
  declare approved_by: number | null

  @column()
  declare admin_remarks: string | null

  @belongsTo(() => Staff, {
    localKey: 'id',
    foreignKey: 'staff_id',
  })
  declare staff: BelongsTo<typeof Staff>

  @belongsTo(() => Schools, {
    localKey: 'id',
    foreignKey: 'school_id',
  })
  declare school: BelongsTo<typeof Schools>

  @belongsTo(() => User, {
    localKey: 'id',
    foreignKey: 'approved_by',
  })
  declare approved_by_user: BelongsTo<typeof User>
}
