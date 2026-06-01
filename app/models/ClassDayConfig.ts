import Base from '#models/base'
import PeriodsConfig from './PeriodsConfig.js'
import Classes from './Classes.js'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import { column, hasMany, belongsTo } from '@adonisjs/lucid/orm'

export default class ClassDayConfig extends Base {

    static table = 'class_day_config'

    @column()
    declare school_timetable_config_id: number

    @column()
    declare class_id: number

    @column()
    declare day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'  // e.g. "Monday", "Tuesday", etc.

    @column({
        prepare: (value: any) => {
            if (value === null || value === undefined) return value
            return typeof value === 'string' ? value : JSON.stringify(value)
        },
        consume: (value: any) => {
            if (value === null || value === undefined) return value
            return typeof value === 'string' ? JSON.parse(value) : value
        }
    })
    declare allowed_durations: any // e.g. [30, 45]

    @column()
    declare max_consecutive_periods: number | null  // optional, e.g. 3

    @column()
    declare total_breaks: number // optional, e.g. "08:00"

    @column({
        prepare: (value: any) => {
            if (value === null || value === undefined) return value
            return typeof value === 'string' ? value : JSON.stringify(value)
        },
        consume: (value: any) => {
            if (value === null || value === undefined) return value
            return typeof value === 'string' ? JSON.parse(value) : value
        }
    })
    declare break_durations: any // e.g. [15, 45]

    @column()
    declare day_start_time: string | null // optional

    @column()
    declare day_end_time: string | null // optional

    @hasMany(() => PeriodsConfig, {
        foreignKey: 'class_day_config_id',
        localKey: 'id',
    })
    declare period_config: HasMany<typeof PeriodsConfig>

    @belongsTo(() => Classes, {
        foreignKey: 'class_id',
    })
    declare class: BelongsTo<typeof Classes>

}