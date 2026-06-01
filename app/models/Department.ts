import { DateTime } from 'luxon'
import { column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Base from '#models/base'
import Entity from '#models/Entity'
import CoursePhase from '#models/CoursePhase'
import Batch from '#models/Batch'

export default class Department extends Base {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare entity_id: number

  @column()
  declare name: string

  @column()
  declare code: string

  @column({
    prepare: (value: string[]) => value ? JSON.stringify(value) : null,
    consume: (value: any) => {
      if (!value) return []
      if (typeof value === 'object') return value
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    }
  })
  declare subjects: string[]

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Entity, {
    foreignKey: 'entity_id',
  })
  declare entity: BelongsTo<typeof Entity>

  @hasMany(() => CoursePhase, {
    foreignKey: 'department_id',
  })
  declare phases: HasMany<typeof CoursePhase>

  @hasMany(() => Batch, {
    foreignKey: 'department_id',
  })
  declare batches: HasMany<typeof Batch>
}
