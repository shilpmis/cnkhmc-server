import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Hostel from './hostel.js'
import HostelBed from './hostel_bed.js'

export default class HostelRoom extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare hostelId: number

  @column()
  declare roomNumber: string

  @column()
  declare floor: string | null

  @column()
  declare capacity: number

  @column()
  declare status: 'Active' | 'Maintenance' | 'Inactive'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Hostel)
  declare hostel: BelongsTo<typeof Hostel>

  @hasMany(() => HostelBed, { foreignKey: 'roomId' })
  declare beds: HasMany<typeof HostelBed>
}