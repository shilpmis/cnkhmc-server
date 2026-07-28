import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Schools from './Schools.js'
import ExamSchedule from './exam_schedule.js'

export default class ExamMaster extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare schoolId: number

  @column()
  declare isActive: boolean

  @belongsTo(() => Schools)
  declare school: BelongsTo<typeof Schools>

  @hasMany(() => ExamSchedule)
  declare schedules: HasMany<typeof ExamSchedule>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}