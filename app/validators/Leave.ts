import vine from '@vinejs/vine'

export const CreateValidatorForLeaveType = vine.compile(
  vine.object({
    leave_type_name: vine.string().trim().minLength(2).maxLength(25),
    academic_session_id: vine.number(),
    is_paid: vine.boolean(),
    affects_payroll: vine.boolean(),
    requires_proof: vine.boolean(),
    is_active: vine.boolean(),
  })
)

export const UpdateValidatorForLeaveType = vine.compile(
  vine.object({
    leave_type_name: vine.string().trim().minLength(2).maxLength(25).optional(),
    is_paid: vine.boolean().optional(),
    affects_payroll: vine.boolean(),
    requires_proof: vine.boolean().optional(),
    is_active: vine.boolean().optional(),
  })
)

export const CreateValidatorForLeavePolicies = vine.compile(
  vine.object({
    academic_session_id: vine.number(),
    staff_role_id: vine.number(),
    leave_type_id: vine.number(),
    annual_quota: vine.number(),
    can_carry_forward: vine.boolean(),
    max_carry_forward_days: vine.number(),
    max_consecutive_days: vine.number(),
    requires_approval: vine.boolean(),
    approval_hierarchy: vine.object({}),
    deduction_rules: vine.object({}),
  })
)

export const UpdateValidatorForLeavePolicies = vine.compile(
  vine.object({
    // staff_role_id: vine.number(),
    // leave_type_id: vine.number(),
    annual_quota: vine.number().optional(),
    can_carry_forward: vine.boolean().optional(),
    max_carry_forward_days: vine.number().optional(),
    max_consecutive_days: vine.number().optional(),
    requires_approval: vine.boolean().optional(),
    approval_hierarchy: vine.object({}).optional(),
    deduction_rules: vine.object({}).optional(),
  })
)

export const CreateValidatorForOtherStaffsLeaveBalance = vine.compile(
  vine.object({
    other_staff_id: vine.number(),
    leave_type_id: vine.number(),
    academic_year: vine.number(),
    total_leaves: vine.number(),
    used_leaves: vine.number(),
    pending_leaves: vine.number(),
    carried_forward: vine.number(),
    available_balance: vine.number(),
  })
)

export const CreateValidatorForStaffLeaveBalance = vine.compile(
  vine.object({
    academic_session_id: vine.number(),
    teacher_id: vine.number(),
    leave_type_id: vine.number(),
    academic_year: vine.number(),
    total_leaves: vine.number(),
    used_leaves: vine.number(),
    pending_leaves: vine.number(),
    carried_forward: vine.number(),
    available_balance: vine.number(),
  })
)

export const CreateValidatorForLeaveApplication = vine.compile(
  vine.object({
    academic_session_id: vine.number(),
    staff_id: vine.number(),
    leave_type_id: vine.number(),
    from_date: vine.date(),
    to_date: vine.date(),
    reason: vine.string(),
    is_half_day: vine.boolean(),
    half_day_type: vine.enum(['first_half', 'second_half', 'none']),
    is_hourly_leave: vine.boolean(),
    total_hour: vine.number().max(4).nullable(),
    documents: vine.object({}).optional(),
  })
)

export const UpdateValidatorForLeaveApplication = vine.compile(
  vine.object({
    leave_type_id: vine.number().optional(),
    from_date: vine.date().optional(),
    to_date: vine.date().optional(),
    reason: vine.string().optional(),
    is_half_day: vine.boolean().optional(),
    half_day_type: vine.enum(['first_half', 'second_half', 'none']).optional(),
    is_hourly_leave: vine.boolean().optional(),
    total_hour: vine.number().max(4).nullable().optional(),
  })
)

export const ValidatorForApproveApplication = vine.compile(
  vine.object({
    status: vine.enum(['approved', 'rejected', 'cancelled']),
    remarks: vine.string().trim().minLength(2).maxLength(200),
  })
)

export const ValidatorForCancelApplication = vine.compile(
  vine.object({
    remarks: vine.string().trim().minLength(2).maxLength(200),
  })
)

export const SearchValidatorForStaff = vine.compile(
  vine.object({
    search_term: vine.string().trim().optional(),
    staff_type: vine.enum(['teaching', 'non_teaching', 'all']).optional(),
    page: vine.number().optional(),
    per_page: vine.number().optional(),
  })
)
