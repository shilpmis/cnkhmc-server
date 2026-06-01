import { DateTime } from 'luxon'
import { column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Base from '#models/base'
import Department from '#models/Department'
import BatchProgression from '#models/BatchProgression'

export default class CoursePhase extends Base {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare department_id: number

  @column()
  declare phase_name: string

  @column()
  declare duration_months: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Department, {
    foreignKey: 'department_id',
  })
  declare department: BelongsTo<typeof Department>

  @hasMany(() => BatchProgression, {
    foreignKey: 'course_phase_id',
  })
  declare progressions: HasMany<typeof BatchProgression>
}
