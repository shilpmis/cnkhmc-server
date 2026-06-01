import { column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Base from './base.js'

export default class StaffConfiguration extends Base {
  public static table = 'staff_configurations'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare school_id: number

  @column()
  declare config_type: 'STAFF_TYPE' | 'STAFF_CATEGORY' | 'DESIGNATION'

  @column()
  declare name: string

  @column()
  declare parent_id: number | null

  @belongsTo(() => StaffConfiguration, {
    foreignKey: 'parent_id',
  })
  declare parent: BelongsTo<typeof StaffConfiguration>

  @hasMany(() => StaffConfiguration, {
    foreignKey: 'parent_id',
  })
  declare children: HasMany<typeof StaffConfiguration>
}
