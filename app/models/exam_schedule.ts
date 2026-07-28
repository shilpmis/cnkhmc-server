import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import ExamMaster from './exam_master.js'
import Classes from './Classes.js'
import ExamSubject from './exam_subject.js'

export default class ExamSchedule extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare exam_master_id: number

  @column()
  declare academic_year: number

  @column()
  declare class_id: number

  @column()
  declare start_date: DateTime

  @column()
  declare end_date: DateTime

  @column()
  declare status: string

  @belongsTo(() => ExamMaster, { foreignKey: 'exam_master_id' })
  declare examMaster: BelongsTo<typeof ExamMaster>

  
  @belongsTo(() => Classes, { foreignKey: 'class_id' })
  declare academicClass: BelongsTo<typeof Classes>

  @hasMany(() => ExamSubject)
  declare subjects: HasMany<typeof ExamSubject>

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime
}