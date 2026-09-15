import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Base from './base.js'
import Staff from './Staff.js'
import StaffConfiguration from './StaffConfiguration.js'

export default class StaffLetter extends Base {
  public static table = 'staff_letters'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare staff_id: number

  @column()
  declare letter_type: string

  @column()
  declare letter_type_id: number | null

  @column()
  declare letter_no: string | null

  @column({
    serialize: (value: Date) => Base.serializeDateAsSQLDateString(value),
  })
  declare letter_date: Date | null

  @column()
  declare remarks: string | null

  @belongsTo(() => Staff, {
    foreignKey: 'staff_id',
  })
  declare staff: BelongsTo<typeof Staff>

  @belongsTo(() => StaffConfiguration, {
    foreignKey: 'letter_type_id',
  })
  declare letter_type_config: BelongsTo<typeof StaffConfiguration>
}
