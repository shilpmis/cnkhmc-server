import Base from '#models/base'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import LectureAttendanceMaster from './LectureAttendanceMaster.js'
import Students from './Students.js'

export default class LectureAttendanceDetail extends Base {
  public static table = 'lecture_attendance_details'

  @column()
  declare lecture_attendance_master_id: number

  @column()
  declare student_id: number

  @column()
  declare attendance_status: 'present' | 'absent' | 'late' | 'half_day'

  @column()
  declare remarks: string | null

  @belongsTo(() => LectureAttendanceMaster, {
    foreignKey: 'lecture_attendance_master_id',
    localKey: 'id',
  })
  declare master: BelongsTo<typeof LectureAttendanceMaster>

  @belongsTo(() => Students, {
    foreignKey: 'student_id',
    localKey: 'id',
  })
  declare student: BelongsTo<typeof Students>
}
