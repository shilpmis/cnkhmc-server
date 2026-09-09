import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Schools from '#models/Schools'

export default class PayrollSetting extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare schoolId: number

  @column()
  declare lopCalculationBase: 'Gross Salary' | 'Basic Salary'

  @column()
  declare lopDaysDenominator: 'Actual Days in Month' | 'Fixed 30 Days'

  @column()
  declare epfEmployeePercentage: number

  @column()
  declare epfEmployerPercentage: number

  @column()
  declare esiEmployeePercentage: number

  @column()
  declare esiEmployerPercentage: number

  @column({
    prepare: (value: any) => (value ? JSON.stringify(value) : null),
    consume: (value: any) => {
      if (!value) return null
      if (typeof value === 'object') return value
      try {
        return JSON.parse(value)
      } catch {
        return null
      }
    },
  })
  declare taxSlabs: any

  @belongsTo(() => Schools, {
    localKey: 'id',
    foreignKey: 'schoolId',
  })
  declare school: BelongsTo<typeof Schools>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}