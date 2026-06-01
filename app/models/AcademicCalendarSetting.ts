import Base from '#models/base'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type * as relations from '@adonisjs/lucid/types/relations'
import AcademicSession from '#models/AcademicSession'

export default class AcademicCalendarSetting extends Base {
  static table = 'academic_calendar_settings'

  @column()
  declare academic_session_id: number

  @column({
    prepare: (value: string[]) => JSON.stringify(value || []),
    consume: (value: any) => {
      if (!value) return []
      if (typeof value === 'object') return value
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    },
  })
  declare non_working_dates: string[]

  @column()
  declare is_saturday_working: boolean

  @belongsTo(() => AcademicSession, {
    foreignKey: 'academic_session_id',
  })
  declare academic_session: relations.BelongsTo<typeof AcademicSession>
}

