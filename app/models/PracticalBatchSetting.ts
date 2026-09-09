import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Schools from '#models/Schools'

export default class PracticalBatchSetting extends BaseModel {
  static table = 'practical_batch_settings'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare schoolId: number

  @column({
    prepare: (value: string[]) => JSON.stringify(value),
    consume: (value: string | string[]) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare batches: string[]

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Schools, {
    localKey: 'id',
    foreignKey: 'schoolId',
  })
  declare school: BelongsTo<typeof Schools>
}
