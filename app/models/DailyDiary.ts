import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Base from './base.js'
import PeriodsConfig from './PeriodsConfig.js'
import StaffEnrollment from './StaffEnrollment.js'

export default class DailyDiary extends Base {
  public static table = 'daily_diaries'

  @column({ columnName: 'periods_config_id' })
  declare periodsConfigId: number

  @column()
  declare date: string

  @column({ columnName: 'topic_covered' })
  declare topicCovered: string | null

  @column({ columnName: 'resources_used' })
  declare resourcesUsed: string | null

  @column({ columnName: 'attendance_remarks' })
  declare attendanceRemarks: string | null

  @column()
  declare conclusion: string | null

  @column({ columnName: 'reference_book' })
  declare referenceBook: string | null

  @column()
  declare attendance: string | null

  @column({ columnName: 'staff_enrollment_id' })
  declare staffEnrollmentId: number

  @column({ 
    columnName: 'topic_ids',
    consume: (value) => value ? (typeof value === 'string' ? JSON.parse(value) : value) : [],
    prepare: (value) => value ? JSON.stringify(value) : null
  })
  declare topicIds: number[] | null

  @column({ 
    columnName: 'subtopic_ids',
    consume: (value) => value ? (typeof value === 'string' ? JSON.parse(value) : value) : [],
    prepare: (value) => value ? JSON.stringify(value) : null
  })
  declare subtopicIds: number[] | null

  @belongsTo(() => PeriodsConfig, {
    foreignKey: 'periodsConfigId',
  })
  declare periodConfig: BelongsTo<typeof PeriodsConfig>

  @belongsTo(() => StaffEnrollment, {
    foreignKey: 'staffEnrollmentId',
  })
  declare staffEnrollment: BelongsTo<typeof StaffEnrollment>
}
