import Base from './base.js'
import { beforeSave, column, belongsTo } from '@adonisjs/lucid/orm'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import hash from '@adonisjs/core/services/hash'
import Schools from './Schools.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Staff from './Staff.js'
import RoleMaster from './RoleMaster.js'

export default class User extends Base {
  @column()
  declare organization_id: number | null

  @column()
  declare school_id: number | null

  @column()
  declare name: string

  @column()
  declare username: string | null

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare role_id: number

  @column()
  declare is_teacher: boolean

  @column()
  declare staff_id: number | null

  @column()
  declare is_active: boolean

  @belongsTo(() => Schools, {
    foreignKey: 'school_id',
  })
  declare school: BelongsTo<typeof Schools>

  @belongsTo(() => Staff, {
    foreignKey: 'staff_id',
  })
  declare staff: BelongsTo<typeof Staff>
  
  @belongsTo(() => RoleMaster, {
    foreignKey: 'role_id',
  })
  declare role: BelongsTo<typeof RoleMaster>

  @beforeSave()
  static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await hash.make(user.password)
    }
  }

  static accessTokens = DbAccessTokensProvider.forModel(User)
}
