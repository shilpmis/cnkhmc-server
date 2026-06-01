import {  column } from '@adonisjs/lucid/orm'
import Base from './base.js'

export default class StudentExtraFeesInstallment extends Base {

  @column()
  declare student_fees_master_id: number

  @column()
  declare student_fees_type_masters_id: number

  @column()
  declare installment_id: number

  @column()
  declare paid_amount: number

  @column()
  declare discounted_amount: number

  @column()
  declare remaining_amount: number

  @column()
  declare amount_paid_as_carry_forward: number | null

  @column()
  declare paid_as_refund: boolean

  @column()
  declare refunded_amount: number

  @column()
  declare payment_mode: 'Cash' | 'Online' | 'Bank Transfer' | 'Cheque' | 'UPI' | 'Full Discount'

  @column()
  declare transaction_reference: string | null

  @column()
  declare payment_date: Date

  @column()
  declare remarks: string | null

  @column()
  declare status: 'Pending' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Paid Late' | 'Failed' | 'Reversal Requested' | 'Reversed';

  @column()
  declare payment_status: 'Success' | 'In Progress' | 'Failed' | 'Disputed' | 'Cancelled';

}