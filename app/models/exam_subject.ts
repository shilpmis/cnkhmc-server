import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import ExamSchedule from './exam_schedule.js'
import Subjects from './Subjects.js'
import ExamResult from './exam_result.js'

export default class ExamSubject extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare examScheduleId: number

  @column()
  declare subjectId: number

  @column()
  declare maxMarks: number

  @column()
  declare passingMarks: number

  @column()
  declare examDate: DateTime

  @column()
  declare startTime: string | null

  @column()
  declare endTime: string | null

  @belongsTo(() => ExamSchedule)
  declare examSchedule: BelongsTo<typeof ExamSchedule>

  @belongsTo(() => Subjects, { foreignKey: 'subjectId' })
  declare subject: BelongsTo<typeof Subjects>

  @hasMany(() => ExamResult)
  declare results: HasMany<typeof ExamResult>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}