import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import Classes from './Classes.js'
import * as relations from '@adonisjs/lucid/types/relations'
import QuotaAllocation from './QuotaAllocation.js'
import Base from './base.js'

export default class ClassSeatAvailability extends Base {
  @column()
  declare class_id: number

  @column()
  declare academic_session_id: number

  @column()
  declare total_seats: number

  @column()
  declare quota_allocated_seats: number

  @column()
  declare general_available_seats: number

  @column()
  declare filled_seats: number

  @column()
  declare remaining_seats: number

  @belongsTo(() => Classes, { foreignKey: 'class_id' })
  declare class: relations.BelongsTo<typeof Classes>

  @hasMany(() => QuotaAllocation, {
    foreignKey: 'class_id',
    localKey: 'class_id',
  })
  declare quota_allocation: relations.HasMany<typeof QuotaAllocation>
}
