import vine from '@vinejs/vine'

export const CreateCompOffRequestValidator = vine.compile(
  vine.object({
    worked_date: vine.string().trim(),
    day_type: vine.enum(['full_day', 'half_day']),
    reason: vine.string().trim().minLength(3).maxLength(255),
    description: vine.string().trim().optional(),
  })
)

export const ProcessCompOffRequestValidator = vine.compile(
  vine.object({
    status: vine.enum(['approved', 'rejected']),
    admin_remarks: vine.string().trim().optional(),
  })
)
