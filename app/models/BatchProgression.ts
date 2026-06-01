import { DateTime } from 'luxon'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Base from '#models/base'
import Batch from '#models/Batch'
import CoursePhase from '#models/CoursePhase'

export default class BatchProgression extends Base {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare batch_id: number

  @column()
  declare course_phase_id: number

  @column.date()
  declare start_date: DateTime

  @column.date()
  declare end_date: DateTime | null

  @column()
  declare is_active: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Batch, {
    foreignKey: 'batch_id',
  })
  declare batch: BelongsTo<typeof Batch>

  @belongsTo(() => CoursePhase, {
    foreignKey: 'course_phase_id',
  })
  declare phase: BelongsTo<typeof CoursePhase>
}
