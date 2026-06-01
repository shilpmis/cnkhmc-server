//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class TeacherLeaveBalance extends Base {
    
        @column()
        declare teacher_id: number
    
        @column()
        declare leave_type_id: number
    
        @column()
        declare academic_year: number
    
        @column()
        declare total_leaves: number
    
        @column()
        declare used_leaves: number
    
        @column()
        declare pending_leaves: number
    
        @column()
        declare carried_forward: number
    
        @column()
        declare available_balance: number
    
        @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
        declare last_updated: DateTime
}