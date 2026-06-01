import { DateTime } from 'luxon'
import { column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Base from '#models/base'
import Entity from '#models/Entity'
import Department from '#models/Department'
import BatchProgression from '#models/BatchProgression'

export default class Batch extends Base {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare entity_id: number

  @column()
  declare department_id: number

  @column()
  declare name: string

  @column.date()
  declare start_date: DateTime

  @column.date()
  declare expected_end_date: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Entity, {
    foreignKey: 'entity_id',
  })
  declare entity: BelongsTo<typeof Entity>

  @belongsTo(() => Department, {
    foreignKey: 'department_id',
  })
  declare department: BelongsTo<typeof Department>

  @hasMany(() => BatchProgression, {
    foreignKey: 'batch_id',
  })
  declare progressions: HasMany<typeof BatchProgression>
}
