import Base from '#models/base'
import { column, hasOne } from '@adonisjs/lucid/orm'
import type { HasOne } from '@adonisjs/lucid/types/relations'
import Divisions from '#models/Divisions'

export default class ClassTeacherMaster extends Base {
  @column()
  declare academic_year: number

  @column()
  declare division_id: number

  @column()
  declare staff_id: number

  @column()
  declare status: 'Active' | 'Inactive'

  @hasOne(() => Divisions, {
    localKey: 'division_id',
    foreignKey: 'id',
    serializeAs: 'class',
  })
  declare divisions: HasOne<typeof Divisions>
}
