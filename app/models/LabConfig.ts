//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { column } from '@adonisjs/lucid/orm'

export default class LabConfig extends Base {

    static table = 'labs_config'
    
    @column()
    declare school_timetable_config_id: number

    @column()
    declare name: string

    @column()
    declare type: string // e.g. "science", "computer"

    @column()
    declare max_capacity: number

    @column()
    declare availability_per_day: number | null // optional
}