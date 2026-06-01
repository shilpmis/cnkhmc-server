import { belongsTo, column } from '@adonisjs/lucid/orm'
import Base from './base.js'
import AttendanceMasters from './AttendanceMasters.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Students from './Students.js'

export default class AattendanceDetail extends Base {

  public static table = 'attendance_details'

  @column()
  declare attendance_master_id: number

  @column()
  declare student_id: number

  @column()
  declare attendance_status: 'present' | 'absent' | 'late' | 'half_day'

  @column()
  declare remarks: string | null

  @belongsTo(() => AttendanceMasters)
  declare attendance_master: BelongsTo<typeof AttendanceMasters>

  @belongsTo(() => Students , {
    foreignKey: 'student_id',
    localKey :'id',
  })
  declare student: BelongsTo<typeof Students>
}