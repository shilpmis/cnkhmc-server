import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import HostelRoom from './hostel_room.js'
import HostelAllocation from './hostel_allocation.js'

export default class HostelBed extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'room_id' })
  declare roomId: number

  @column({ columnName: 'bed_number' })
  declare bedNumber: string

  @column()
  declare status: 'Available' | 'Occupied' | 'Maintenance'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => HostelRoom, { foreignKey: 'roomId' })
  declare room: BelongsTo<typeof HostelRoom>

  @hasMany(() => HostelAllocation, { foreignKey: 'bedId' })
  declare allocations: HasMany<typeof HostelAllocation>
}