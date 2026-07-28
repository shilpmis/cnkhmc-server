import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import ExamSubject from './exam_subject.js'
import Students from './Students.js'

export default class ExamResult extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare examSubjectId: number

  @column()
  declare studentId: number

  @column()
  declare obtainedMarks: number | null

  @column()
  declare status: 'ATTENDED' | 'ABSENT' | 'MEDICAL'

  @belongsTo(() => ExamSubject)
  declare examSubject: BelongsTo<typeof ExamSubject>

  @belongsTo(() => Students)
  declare student: BelongsTo<typeof Students>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}