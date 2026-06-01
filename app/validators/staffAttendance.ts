import vine from '@vinejs/vine'

export const ValidatorForCheckIn = vine.compile(
  vine.object({
    academic_session_id: vine.number(),
    check_in_time: vine.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  })
)

export const ValidatorForCheckOut = vine.compile(
  vine.object({
    check_out_time: vine.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  })
)

export const ValidatorForAdminMarkAttendance = vine.compile(
  vine.object({
    staff_id: vine.number(),
    academic_session_id: vine.number(),
    attendance_date: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    check_in_time: vine.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    check_out_time: vine.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    status: vine.enum(['present', 'absent', 'late', 'half_day'] as const).optional(),
    remarks: vine.string().maxLength(255).optional(),
  })
)

export const ValidatorForEditRequest = vine.compile(
  vine.object({
    staff_attendance_id: vine.number(),
    requested_check_in_time: vine.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    requested_check_out_time: vine.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    reason: vine.string().maxLength(500),
  })
)

export const ValidatorForProcessEditRequest = vine.compile(
  vine.object({
    status: vine.enum(['approved', 'rejected'] as const),
    admin_remarks: vine.string().minLength(5).maxLength(500),
  })
)