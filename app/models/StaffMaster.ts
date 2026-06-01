//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { column } from '@adonisjs/lucid/orm'

export default class StaffMaster extends Base {

    public static table = 'staff_role_master'

    @column()
    declare school_id: number

    @column()
    declare role: string

    @column()
    declare is_teaching_role: boolean

    @column()
    declare working_hours: number

    @column()
    declare academic_session_id: number

    @column({
        serializeAs: null,
        prepare: (value: any) => (value !== null && value !== undefined ? JSON.stringify(value) : null),
        consume: (value: any) => {
            if (value === null || value === undefined) return {}
            if (typeof value === 'string') {
                try { return JSON.parse(value) } catch { return {} }
            }
            return value
        },
    })
    declare permissions: Object

}