import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import School from './Schools.js'
import HostelRoom from './hostel_room.js'

export default class Hostel extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare schoolId: number

  @column()
  declare name: string

  @column()
  declare type: 'Boys' | 'Girls' | 'Co-ed'

  @column()
  declare address: string | null

  @column()
  declare capacity: number

  @column()
  declare status: 'Active' | 'Inactive'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => School)
  declare school: BelongsTo<typeof School>

  @hasMany(() => HostelRoom)
  declare rooms: HasMany<typeof HostelRoom>
}