import vine from '@vinejs/vine'


/**
 * Validates the post's creation action
 */
export const CreateValidatorForFeesType = vine.compile(
  vine.object({
    // add here
    name: vine.string().trim().minLength(2).maxLength(50),
    description: vine.string().trim().minLength(2).maxLength(50),
    applicable_to: vine.enum(['student', 'plan']),
    academic_year: vine.number(),
  })
)

/**
 * Validates the post's update action
 */
export const UpdateValidatorForFeesType = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(50).optional(),
    description: vine.string().trim().minLength(2).maxLength(50).optional(),
    status: vine.enum(['Active', 'Inactive']).optional(),
  })
)

export const CreateValidatorForFeesPlan = vine.compile(
  vine.object({
    academic_year: vine.number(),
    fees_plan: vine.object({
      name: vine.string().trim().minLength(2).maxLength(50).optional(),
      description: vine.string().trim().minLength(2).maxLength(50).optional(),
      class_id: vine.number(),
    }),
    plan_details: vine
      .array(
        vine.object({
          // fee_plan_id: vine.number(),
          fees_type_id: vine.number(),
          installment_type: vine.enum([
            'Admission',
            'Monthly',
            'Quarterly',
            'Half Yearly',
            'Yearly',
          ]),
          total_installment: vine.number(), // string().regex(/^\d+(\.\d+)?$/), // Ensures the string contains only numbers with optional decimal points
          total_amount: vine.number().max(100000).min(100),
          installment_breakDowns: vine
            .array(
              vine.object({
                // fee_plan_details_id: vine.number(),
                installment_no: vine.number(),
                /**
                 * TODOD : NEED TO ADD PEROPE VALIDATION
                 */
                installment_amount: vine.number(),
                due_date: vine.date(),
                // totoal_installment: vine.number(),
              })
            )
            .minLength(1),
        })
      )
      .minLength(1),
  })
)

export const UpdateValidatorForFeesPlan = vine.compile(
  vine.object({
    fees_plan: vine
      .object({
        name: vine.string().trim().minLength(2).maxLength(50).optional(),
        description: vine.string().trim().minLength(2).maxLength(50).optional(),
        // status: vine.enum(['Active', 'Inactive']).optional(),
      })
      .optional(),
    plan_details: vine
      .array(
        vine.object({
          // fee_plan_id: vine.number(),
          fees_type_id: vine.number(),
          installment_type: vine.enum([
            'Admission',
            'Monthly',
            'Quarterly',
            'Half Yearly',
            'Yearly',
          ]),
          total_installment: vine.number(),
          total_amount: vine.number().max(100000).min(100),
          installment_breakDowns: vine
            .array(
              vine.object({
                installment_no: vine.number(),
                installment_amount: vine.number(),
                due_date: vine.date(),
              })
            )
            .minLength(1),
        })
      )
      .optional(),
  })
)

export const UpdateValidatorForFeesPlanDetails = vine.compile(
  vine.object({
    general_detail_for_plan: vine
      .object({
        name: vine.string().trim().minLength(2).maxLength(50).optional(),
        description: vine.string().trim().minLength(2).maxLength(50).optional(),
        // status: vine.enum(['Active', 'Inactive']).optional(),
      }).optional(),
    new_fees_type: vine
      .array(
        vine.object({
          // fee_plan_id: vine.number(),
          fees_type_id: vine.number(),
          installment_type: vine.enum([
            'Admission',
            'Monthly',
            'Quarterly',
            'Half Yearly',
            'Yearly',
          ]),
          total_installment: vine.number(),
          total_amount: vine.number().max(100000).min(100),
          installment_breakDowns: vine
            .array(
              vine.object({
                installment_no: vine.number(),
                installment_amount: vine.number(),
                due_date: vine.date(),
              })
            )
            .minLength(1),
        })
      )
      .optional(),
    existing_fees_type: vine
      .array(
        vine.object({
          fees_plan_detail_id : vine.number
          (), // consider this as a id for fees_plan_detail 
          fees_type_id: vine.number(),          
          installment_type: vine.enum([
            'Admission',
            'Monthly',
            'Quarterly',
            'Half Yearly',
            'Yearly',
          ]),
          total_installment: vine.number(),
          total_amount: vine.number().max(100000).min(100),
          installment_breakDowns: vine
            .array(
              vine.object({
                id : vine.number().nullable(),
                installment_no: vine.number(),
                installment_amount: vine.number(),
                due_date: vine.date(),
              })
            )
            .minLength(1),
        })
      )
      .optional(),
    deleted_fees_type : vine.array(vine.number()).optional(),
  })
)

export const CreateValidatorForInstallmentBreakDown = vine.compile(
  vine.object({
    fee_plan_details_id: vine.number(),
    installment_no: vine.number(),
    /**
     * TODOD : NEED TO ADD PEROPE VALIDATION
     */
    installment_amount: vine.number(),
    totoal_installment: vine.number(),
    due_date: vine.date(),
  })
)

export const CreateValidatorForconcessions = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(50),
    description: vine.string().trim().minLength(2).maxLength(50),
    applicable_to: vine.enum(['fees_types', 'plan']),
  })
)

export const CreateValidationForPayFees = vine.compile(
  vine.object({
    fee_plan_details_id: vine.number(),
    installment_id: vine.number(),
    paid_amount: vine.string(),
    discounted_amount: vine.string(),
    paid_as_refund: vine.boolean(),
    refunded_amount: vine.string(),
    payment_mode: vine.enum(['Cash', 'Online', 'Bank Transfer']),
    transaction_reference: vine.string().nullable(),
    payment_date: vine.date(),
    remarks: vine.string().nullable(),
    status: vine.enum(['Pending', 'Partially Paid', 'Paid', 'Overdue', 'Failed']),
  })
)

export const UpdateValidationFprPaidInstallment = vine.compile(
  vine.object({
    status: vine.enum([
      'Pending',                  // Not paid at all
      'Partially Paid',           // Partial amount received
      'Paid',                     // Fully paid on time
      'Paid Late',                // Fully paid after due date
      'Overdue',                  // Due date passed and not fully paid
      'Reversal Requested',       // User requested reversal
      'Reversed',                 // Reversal/refund completed
    ]).optional(),
    payment_status: vine.enum([
      'In Progress',            // Payment is being processed
      'Success',
      'Failed',
      // Administrative/Edge States
      'Disputed',
      'Cancelled',
    ]).optional(),
    remarks: vine.string().optional(),
  })
)

export const CreateValidationForMultipleInstallments = vine.compile(
  vine.object({
    student_id: vine.number(),
    installments: vine
      .array(
        vine.object({
          fee_plan_details_id: vine.number(),
          installment_id: vine.number(),
          paid_amount: vine.number(),
          remaining_amount: vine.number(),
          discounted_amount: vine.number(),
          amount_paid_as_carry_forward: vine.number().nullable(),
          payment_mode: vine.enum([
            'Cash',
            'Online',
            'Bank Transfer',
            'Cheque',
            'UPI',
            'Full Discount',
          ]),
          transaction_reference: vine.string().nullable(),
          payment_date: vine.date(),
          remarks: vine.string().nullable(),
          paid_as_refund: vine.boolean(),
          refunded_amount: vine.number(),
          repaid_installment: vine.boolean(),
          applied_concessions: vine
            .array(
              vine.object({
                concession_id: vine.number(),
                // concession_amount: vine.number().max(1000000).min(10).nullable(),
                applied_amount: vine.number().max(1000000).min(10).nullable(),
              })
            )
            .minLength(1)
            .nullable()
            .optional(),
        })
      )
      .minLength(1),
  })
)

export const UpdateValidationForInstallment = vine.compile(
  vine.object({
    status: vine.enum(['Pending', 'Partially Paid', 'Paid', 'Overdue', 'Failed']).optional(),
    remarks: vine.string().optional(),
  })
)

export const CreateValidationForConcessionType = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(50),
    description: vine.string().trim().minLength(2).maxLength(200),
    applicable_to: vine.enum(['plan', 'students']),
    concessions_to: vine.enum(['plan', 'fees_type']),
    category: vine.enum(['family', 'sports', 'staff', 'education', 'financial', 'other']),
    academic_year: vine.number(),
  })
)

export const UpdateValidationForConcessionType = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(50).optional(),
    description: vine.string().trim().minLength(2).maxLength(200).optional(),
    status: vine.enum(['Active', 'Inactive']).optional(),
    category: vine.enum(['family', 'sports', 'staff', 'education', 'financial', 'other']),
  })
)

export const CreateValidationForApplyConcessionToPlan = vine.compile(
  vine.object({
    concession_id: vine.number(),
    fees_plan_id: vine.number(),
    fees_type_ids: vine.array(vine.number()).nullable(),
    deduction_type: vine.enum(['percentage', 'fixed_amount']),
    amount: vine.number().max(1000000).min(100).nullable(),
    percentage: vine.number().max(100).min(1).nullable(),
  })
)

export const UpdateValidationForAppliedConcessionToPlan = vine.compile(
  vine.object({
    // fees_type_ids: vine.array(vine.number()).nullable().optional(),
    deduction_type: vine.enum(['percentage', 'fixed_amount']).optional(),
    amount: vine.number().max(1000000).min(100).nullable().optional(),
    percentage: vine.number().max(100).min(1).nullable().optional(),
    status: vine.enum(['Active', 'Inactive']).optional(),
  })
)

export const CreateValidationForApplyConcessionToStudent = vine.compile(
  vine.object({
    concession_id: vine.number(),
    student_id: vine.number(),
    fees_plan_id: vine.number(),
    fees_type_ids: vine.array(vine.number()).nullable(),
    deduction_type: vine.enum(['percentage', 'fixed_amount']),
    amount: vine.number().max(1000000).min(100).nullable(),
    percentage: vine.number().max(100).min(1).nullable(),
  })
)

export const UpdateValidationForAppliedConcessionToStudent = vine.compile(
  vine.object({
    deduction_type: vine.enum(['percentage', 'fixed_amount']).optional(),
    amount: vine.number().max(1000000).min(100).nullable().optional(),
    percentage: vine.number().max(100).min(1).nullable().optional(),
    status: vine.enum(['Active', 'Inactive']).optional(),
  })
)

export const CreateValidationForApplyExtraFeesToStudent = vine.compile(
  vine.object({

    student_id: vine.number(),
    academic_year: vine.number(),
    fees_type_id: vine.number(),
    fees_plan_id: vine.number(),
    installment_type: vine.enum([
      'Admission',
      'Monthly',
      'Quarterly',
      'Half Yearly',
      'Yearly',
    ]),
    total_amount: vine.number().max(100000).min(100),
    installment_breakDowns: vine
      .array(
        vine.object({
          installment_no: vine.number(),
          installment_amount: vine.number(),
          due_date: vine.date(),
        })
      )
      .minLength(1),
  })
)

export const CreateValidationForPayMultipleInstallmentsOfExtraFees = vine.compile(
  vine.object({
    student_id: vine.number(),
    student_fees_master_id: vine.number().optional(),
    installments: vine
      .array(
        vine.object({
          student_fees_type_masters_id: vine.number(),
          installment_id: vine.number(),
          paid_amount: vine.number(),
          remaining_amount: vine.number(),
          discounted_amount: vine.number(),
          amount_paid_as_carry_forward: vine.number().nullable(),
          payment_mode: vine.enum([
            'Cash',
            'Online',
            'Bank Transfer',
            'Cheque',
            'UPI',
            'Full Discount',
          ]),
          transaction_reference: vine.string().nullable(),
          payment_date: vine.date(),
          remarks: vine.string().nullable(),
          paid_as_refund: vine.boolean(),
          refunded_amount: vine.number(),
          repaid_installment: vine.boolean(),
          applied_concessions: vine
            .array(
              vine.object({
                concession_id: vine.number(),
                // concession_amount: vine.number().max(1000000).min(10).nullable(),
                applied_amount: vine.number().max(1000000).min(10).nullable(),
              })
            )
            .minLength(1)
            .nullable(),
        })
      )
      .minLength(1),
  })
)
