import { column } from '@adonisjs/lucid/orm'
import Base from './base.js'

export default class StudentFeesPlanMaster extends Base {
  @column()
  declare student_fees_master_id: number

  @column()
  declare fees_plan_details_id: number

  @column()
  declare total_amount: number

  @column()
  declare discounted_amount: number

  @column()
  declare paid_amount: number

  @column()
  declare due_amount: number

  @column()
  declare status: 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue'

  @column()
  declare paid_installments: Date
}
