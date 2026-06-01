import vine from '@vinejs/vine'

/**
 * Validates the post's creation action
 */
export const CreateValidatorForSalaryComponent = vine.compile(
  vine.object({
    // add here
    component_name: vine.string().trim().minLength(2).maxLength(50),
    component_code: vine.string().trim().minLength(2).maxLength(50),
    component_type: vine.enum(['earning', 'deduction', 'benefits']),
    description: vine.string().trim().minLength(2).maxLength(50),
    calculation_method: vine.enum(['amount', 'percentage']),
    amount: vine.number().max(100000).min(0).nullable(),
    percentage: vine.number().max(100).min(1).nullable(),
    is_based_on_annual_ctc: vine.boolean(),
    name_in_payslip: vine.string().trim().minLength(2).maxLength(50),
    is_taxable: vine.boolean(),
    pro_rata_calculation: vine.boolean(),
    consider_for_epf: vine.boolean(),
    consider_for_esic: vine.boolean(),
    consider_for_esi: vine.boolean(),
    deduction_frequency: vine.enum(['once', 'recurring']).nullable(),
    deduction_type: vine
      .enum(['ends_on_selected_month', 'ends_never', 'recovering_specific_amount'])
      .nullable(),
    benefit_frequency: vine.enum(['once', 'recurring']).nullable(),
    benefit_type: vine
      .enum(['ends_on_selected_month', 'ends_never', 'recovering_specific_amount'])
      .nullable(),
    is_mandatory: vine.boolean(),
    is_mandatory_for_all_templates: vine.boolean(),
    is_active: vine.boolean(),
  })
)

export const UpdateValidatorForSalaryComponent = vine.compile(
  vine.object({
    // add here
    component_name: vine.string().trim().minLength(2).maxLength(50).optional(),
    component_code: vine.string().trim().minLength(2).maxLength(50).optional(),
    description: vine.string().trim().minLength(2).maxLength(50).optional(),
    amount: vine.number().max(100000).min(0).optional().nullable(),
    percentage: vine.number().max(100).min(1).optional().nullable(),
    name_in_payslip: vine.string().trim().minLength(2).maxLength(50).optional(),
    is_active: vine.boolean().optional(),
  })
)

/**
 * Validates the post's update action
 */
export const CreateValidatorForSalaryTemplates = vine.compile(
  vine.object({
    // add here
    template_name: vine.string().trim().minLength(2).maxLength(50),
    template_code: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    description: vine.string().trim().minLength(2).maxLength(50),
    annual_ctc: vine.number().min(100),
    is_active: vine.boolean(),
    is_mandatory: vine.boolean(),
    template_components: vine
      .array(
        vine.object({
          salary_components_id: vine.number(),
          amount: vine.number().max(100000).min(0).nullable(),
          percentage: vine.number().max(100).min(0).nullable(),
          is_based_on_annual_ctc: vine.boolean(),
          is_mandatory: vine.boolean(),
        })
      )
      .minLength(1),
  })
)

export const UpdateValidatorForSalaryTemplates = vine.compile(
  vine.object({
    // add here
    template_name: vine.string().trim().minLength(2).maxLength(50).optional(),
    template_code: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    description: vine.string().trim().minLength(2).maxLength(50).optional(),
    annual_ctc: vine.number().min(100).optional(),
    is_active: vine.boolean().optional(),
    is_mandatory: vine.boolean().optional(),
    existing_salary_components: vine
      .array(
        vine.object({
          salary_components_id: vine.number(),
          amount: vine.number().max(100000).min(0).optional(),
          percentage: vine.number().max(100).min(0).optional(),
          // is_based_on_annual_ctc: vine.boolean().optional(),
          // is_mandatory: vine.boolean().optional(),
        })
      )
      .minLength(1)
      .optional(),
    new_salary_components: vine
      .array(
        vine.object({
          salary_components_id: vine.number(),
          amount: vine.number().max(100000).min(0).nullable(),
          percentage: vine.number().max(100).min(0).nullable(),
          is_based_on_annual_ctc: vine.boolean(),
          is_mandatory: vine.boolean(),
        })
      )
      .minLength(1)
      .optional(),
    remove_salary_components: vine
      .array(
        vine.object({
          salary_components_id: vine.number(),
        })
      )
      .minLength(1)
      .optional(),
  })
)

export const CreateValidatorForStaffSalaryTemplates = vine.compile(
  vine.object({
    base_template_id: vine.number(),
    staff_id: vine.number(),
    // accademic_session_id: vine.number(),
    template_name: vine.string().trim().minLength(2).maxLength(50),
    template_code: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    description: vine.string().trim().minLength(2).maxLength(50),
    annual_ctc: vine.number().min(100),
    template_components: vine
      .array(
        vine.object({
          salary_components_id: vine.number(),
          amount: vine.number().max(100000).min(0).nullable(),
          percentage: vine.number().max(100).min(0).nullable(),
          recovering_end_month: vine.string().nullable(),
          total_recovering_amount: vine.number().nullable(),
          total_recovered_amount: vine.number().nullable(),
        })
      )
      .minLength(1),
  })
)

export const UpdateValidatorForStaffSalaryTemplates = vine.compile(
  vine.object({
    // add here
    base_template_id: vine.number().optional(),
    template_name: vine.string().trim().minLength(2).maxLength(50).optional(),
    template_code: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    description: vine.string().trim().minLength(2).maxLength(50).optional(),
    annual_ctc: vine.number().min(100).optional(),
    existing_salary_components: vine
      .array(
        vine.object({
          salary_components_id: vine.number(),
          amount: vine.number().max(100000).min(0).nullable().optional(),
          percentage: vine.number().max(100).min(0).nullable().optional(),
          recovering_end_month: vine.string().nullable().optional(),
          total_recovering_amount: vine.number().nullable().optional(),
          // total_recovered_amount: vine.number().nullable(),
        })
      )
      .minLength(1)
      .optional(),
    new_salary_components: vine
      .array(
        vine.object({
          salary_components_id: vine.number(),
          amount: vine.number().max(100000).min(0).nullable(),
          percentage: vine.number().max(100).min(0).nullable(),
          recovering_end_month: vine.string().nullable(),
          total_recovering_amount: vine.number().nullable(),
          total_recovered_amount: vine.number().nullable(),
        })
      )
      .minLength(1)
      .optional(),
    remove_salary_components: vine
      .array(
        vine.object({
          salary_components_id: vine.number(),
        })
      )
      .minLength(1)
      .optional(),
  })
)

export const CreatePayRunTemplateValidator = vine.compile(
  vine.object({
    base_template_id: vine.number(),
    staff_enrollments_id: vine.number(),
    payroll_month: vine.string(),
    payroll_year: vine.string(),
    template_name: vine.string().trim().minLength(2).maxLength(50),
    template_code: vine.string().trim().minLength(2).maxLength(50),
    based_anual_ctc: vine.number().min(100),
    total_payroll: vine.number().min(100),
    notes: vine.string().nullable(),
    payroll_components: vine
      .array(
        vine.object({
          // satff_payrun_templates_id: vine.number(),
          salary_components_id: vine.number(),
          payslip_name: vine.string().trim().minLength(2).maxLength(50).nullable(),
          amount: vine.number().nullable(),
          percentage: vine.number().nullable(),
          is_based_on_annual_ctc: vine.boolean(),
          is_based_on_basic_pay: vine.boolean(),
          is_modofied: vine.boolean(),
        })
      )
      .minLength(1),
  })
)

export const UpdateValidatorForStaffPayRun = vine.compile(
  vine.object({
    template_name: vine.string().trim().minLength(2).maxLength(50).optional(),
    notes: vine.string().nullable().optional(),
    status: vine
      .enum([
        'draft',
        'pending',
        'processing',
        'partially_paid',
        'paid',
        'failed',
        'cancelled',
        'on_hold',
      ])
      .optional(),
  })
)
