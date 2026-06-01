import { belongsTo, column } from '@adonisjs/lucid/orm'
import * as relations from '@adonisjs/lucid/types/relations'
import Quota from './Quota.js'
import Classes from './Classes.js'
import Base from './base.js'

export default class QuotaAllocation extends Base {
  @column()
  declare quota_id: number

  @column()
  declare academic_session_id: number

  @column()
  declare class_id: number

  @column()
  declare total_seats: number

  @column()
  declare filled_seats: number

  @belongsTo(() => Quota, { foreignKey: 'quota_id' })
  declare quota: relations.BelongsTo<typeof Quota>

  @belongsTo(() => Classes, { foreignKey: 'class_id' })
  declare class: relations.BelongsTo<typeof Classes>
}
