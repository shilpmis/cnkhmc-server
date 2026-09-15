import Base from '#models/base'
import { column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import LeavePolicies from './LeavePolicies.js'
import Staff from './Staff.js'

export default class LeaveTemplate extends Base {
  public static table = 'leave_templates'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare school_id: number

  @column()
  declare academic_year: number

  @column()
  declare template_name: string

  @column()
  declare description: string | null

  @column()
  declare is_active: boolean

  @hasMany(() => LeavePolicies, {
    foreignKey: 'leave_template_id',
    localKey: 'id',
  })
  declare leave_policies: HasMany<typeof LeavePolicies>

  @hasMany(() => Staff, {
    foreignKey: 'leave_template_id',
    localKey: 'id',
  })
  declare staff_members: HasMany<typeof Staff>
}
