//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { column } from '@adonisjs/lucid/orm'

export default class InstallmentBreakDowns extends Base {

    public static table = 'installment_breakdowns'

    @column()
    declare fee_plan_details_id : number

    @column()
    declare installment_no : number

    @column()
    declare installment_amount : number

    @column({
        // add serializer
    })
    declare due_date : Date

    @column()
    declare status : 'Active' | 'Inactive' 

}