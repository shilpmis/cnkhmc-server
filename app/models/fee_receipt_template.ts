import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Schools from './Schools.js'

export default class FeeReceiptTemplate extends BaseModel {
  public static table = 'fee_receipt_templates'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare code: string | null

  @column()
  declare content: string

  @column()
  declare description: string | null

  @column({ columnName: 'school_id' })
  declare schoolId: number | null

  @column({ columnName: 'is_active' })
  declare isActive: boolean

  @belongsTo(() => Schools, {
    foreignKey: 'schoolId',
  })
  declare school: BelongsTo<typeof Schools>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
