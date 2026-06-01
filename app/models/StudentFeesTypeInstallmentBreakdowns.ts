import Base from '#models/base'
import { column } from '@adonisjs/lucid/orm'

export default class StudentFeesTypeInstallmentBreakdowns extends Base {

    public static table = 'student_fees_types_installments_breakdowns'

    @column()
    declare student_fees_type_masters_id: number

    @column()
    declare installment_no: number

    @column()
    declare installment_amount: number

    @column({
        // add serializer
    })
    declare due_date : Date

    @column()
    declare status: 'Active' | 'Inactive'

}