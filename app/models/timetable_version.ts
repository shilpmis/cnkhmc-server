import Base from '#models/base'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import Divisions from './Divisions.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './User.js'

export default class TimetableVersion extends Base {
  static table = 'timetable_versions'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare division_id: number

  @column()
  declare academic_year: number

  @column()
  declare version_name: string | null

  @column()
  declare start_date: string | null

  @column()
  declare end_date: string | null

  @column()
  declare is_active: boolean

  @column()
  declare created_by: number | null

  @column()
  declare version_data: string

  @belongsTo(() => Divisions, {
    foreignKey: 'division_id',
  })
  declare division: BelongsTo<typeof Divisions>

  @belongsTo(() => User, {
    foreignKey: 'created_by',
  })
  declare user: BelongsTo<typeof User>
}