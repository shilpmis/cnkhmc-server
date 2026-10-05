import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Schools from '#models/Schools'

export default class StudentColumnSetting extends BaseModel {
  static table = 'student_column_settings'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'school_id' })
  declare schoolId: number

  @column({
    columnName: 'enabled_columns',
    prepare: (value: string[]) => JSON.stringify(value),
    consume: (value: string | string[]) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare enabledColumns: string[]

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
