import Base from '#models/base'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import LectureAttendanceDetail from './LectureAttendanceDetail.js'
import Divisions from './Divisions.js'
import Subjects from './Subjects.js'

export default class LectureAttendanceMaster extends Base {
  public static table = 'lecture_attendance_masters'

  @column()
  declare academic_year: number

  @column()
  declare division_id: number

  @column()
  declare subject_id: number

  @column()
  declare teacher_id: number

  @column()
  declare attendance_date: string

  @column()
  declare session_type: 'lecture' | 'lab'

  @hasMany(() => LectureAttendanceDetail, {
    foreignKey: 'lecture_attendance_master_id',
    localKey: 'id',
  })
  declare attendance_details: HasMany<typeof LectureAttendanceDetail>

  @belongsTo(() => Divisions, {
    foreignKey: 'division_id',
    localKey: 'id',
  })
  declare division: BelongsTo<typeof Divisions>

  @belongsTo(() => Subjects, {
    foreignKey: 'subject_id',
    localKey: 'id',
  })
  declare subject: BelongsTo<typeof Subjects>
}
