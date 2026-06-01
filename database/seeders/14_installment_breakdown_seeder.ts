import InstallmentBreakDowns from '#models/InstallmentBreakDowns'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const breakdowns = [
      { id: 1,  fee_plan_details_id: 1, installment_no: 1,  due_date: new Date('2025-01-01'), installment_amount: 500  },
      { id: 2,  fee_plan_details_id: 2, installment_no: 1,  due_date: new Date('2025-01-01'), installment_amount: 3000 },
      { id: 3,  fee_plan_details_id: 2, installment_no: 2,  due_date: new Date('2025-02-01'), installment_amount: 1000 },
      { id: 4,  fee_plan_details_id: 2, installment_no: 3,  due_date: new Date('2025-03-01'), installment_amount: 1000 },
      { id: 5,  fee_plan_details_id: 2, installment_no: 4,  due_date: new Date('2025-04-01'), installment_amount: 1000 },
      { id: 6,  fee_plan_details_id: 2, installment_no: 5,  due_date: new Date('2025-05-01'), installment_amount: 1000 },
      { id: 7,  fee_plan_details_id: 2, installment_no: 6,  due_date: new Date('2025-06-01'), installment_amount: 1000 },
      { id: 8,  fee_plan_details_id: 2, installment_no: 7,  due_date: new Date('2025-07-01'), installment_amount: 1000 },
      { id: 9,  fee_plan_details_id: 2, installment_no: 8,  due_date: new Date('2025-08-01'), installment_amount: 1000 },
      { id: 10, fee_plan_details_id: 2, installment_no: 9,  due_date: new Date('2025-09-01'), installment_amount: 1000 },
      { id: 11, fee_plan_details_id: 2, installment_no: 10, due_date: new Date('2025-10-01'), installment_amount: 1000 },
      { id: 12, fee_plan_details_id: 3, installment_no: 1,  due_date: new Date('2025-05-01'), installment_amount: 750  },
      { id: 13, fee_plan_details_id: 3, installment_no: 2,  due_date: new Date('2025-10-01'), installment_amount: 750  },
    ]

    for (const b of breakdowns) {
      await InstallmentBreakDowns.updateOrCreate({ id: b.id }, b)
    }
  }
}