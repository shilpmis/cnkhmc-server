import Base from '#models/base'
import { column, hasMany } from '@adonisjs/lucid/orm'
import LabConfig from './LabConfig.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import ClassDayConfig from './ClassDayConfig.js'

export default class SchoolTimeTableConfig extends Base {

    static table = 'school_timetable_config'

    @column()
    declare academic_year: number

    @column()
    declare max_periods_per_day: number

    @column()
    declare default_period_duration: number

    @column({
        prepare: (value: any) => value && JSON.stringify(value),
        consume: (value: any) => {
            if (!value) return []
            if (typeof value === 'object') return value
            try {
                return JSON.parse(value)
            } catch {
                return []
            }
        }
    })
    declare allowed_period_durations: any // JSON stringified array of allowed durations 

    @column()
    declare lab_enabled: boolean

    @column()
    declare pt_enabled: boolean

    @column()
    declare period_gap_duration: number | null

    @column()
    declare teacher_max_periods_per_day: number | null

    @column()
    declare teacher_max_periods_per_week: number | null

    @column()
    declare is_lab_included_in_max_periods: boolean

    @hasMany(() => LabConfig, {
        localKey: 'id',
        foreignKey: 'school_timetable_config_id',
    })
    declare lab_config: HasMany<typeof LabConfig>

    @hasMany(() => ClassDayConfig, {
        localKey: 'id',
        foreignKey: 'school_timetable_config_id',
    })
    declare class_day_config: HasMany<typeof ClassDayConfig>

}