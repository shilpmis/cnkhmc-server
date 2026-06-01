//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import FeesPlan from './FeesPlan.js'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Classes from './Classes.js'

export default class Divisions extends Base {
  @column()
  declare class_id: number

  @column()
  declare academic_session_id: number

  @column()
  declare division: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'J' | 'K' | 'L'

  @column()
  declare aliases: string | null

  @hasMany(() => FeesPlan, {
    foreignKey: 'division_id',
    localKey: 'id',
  })
  declare fees_plan: HasMany<typeof FeesPlan>

  @belongsTo(() => Classes, {
    foreignKey: 'class_id',
    localKey: 'id',
  })
  declare class: BelongsTo<typeof Classes>
}
