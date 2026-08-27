import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Base from './base.js'
import Staff from './Staff.js'
import User from './User.js'

export default class DiaryLogPermission extends Base {
  public static table = 'diary_log_permissions'

  @column({ columnName: 'staff_id' })
  declare staffId: number

  @column()
  declare date: string

  @column({ columnName: 'granted_by_user_id' })
  declare grantedByUserId: number | null

  @belongsTo(() => Staff, {
    foreignKey: 'staffId',
  })
  declare staff: BelongsTo<typeof Staff>

  @belongsTo(() => User, {
    foreignKey: 'grantedByUserId',
  })
  declare grantedByUser: BelongsTo<typeof User>
}
