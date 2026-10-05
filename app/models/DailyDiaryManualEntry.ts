import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Base from './base.js'
import Staff from './Staff.js'
import StaffEnrollment from './StaffEnrollment.js'

export default class DailyDiaryManualEntry extends Base {
  public static table = 'daily_diary_manual_entries'

  @column({ columnName: 'staff_id' })
  declare staffId: number

  @column({ columnName: 'staff_enrollment_id' })
  declare staffEnrollmentId: number | null

  @column()
  declare date: string

  @column()
  declare time: string

  @column()
  declare description: string

  @belongsTo(() => Staff, {
    foreignKey: 'staffId',
  })
  declare staff: BelongsTo<typeof Staff>

  @belongsTo(() => StaffEnrollment, {
    foreignKey: 'staffEnrollmentId',
  })
  declare staffEnrollment: BelongsTo<typeof StaffEnrollment>
}
