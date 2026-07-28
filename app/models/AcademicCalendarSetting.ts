import Base from '#models/base'
import { column } from '@adonisjs/lucid/orm'

export default class AcademicCalendarSetting extends Base {
  static table = 'academic_calendar_settings'

  @column()
  declare academic_year: number

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

  
  
}

