//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { column } from '@adonisjs/lucid/orm'

export default class Subjects extends Base {

    @column()
    declare name: string

    @column()
    declare code: string

    @column()
    declare academic_year: number

    @column()
    declare description: string | null

    @column()
    declare status: 'Active' | 'Inactive'

    @column()
    declare year: string | null

}