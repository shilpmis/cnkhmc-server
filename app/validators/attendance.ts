import vine from '@vinejs/vine'

export const ValidatorForMarkAttendance = vine.compile(
  vine.object({
    date: vine.date(),
    academic_session_id: vine.number(),
    is_marked: vine.boolean(),
    class_id: vine.number(),
    marked_by: vine.number(),
    attendance_data: vine.array(
      vine.object({
        student_id: vine.number(),
        status: vine.enum(['present', 'absent', 'late', 'half_day']),
        remarks: vine.string().optional(),
      })
    ),
  })
)

export const ValidatorForUpdateMarkedAttendance = vine.compile(
  vine.object({
    attendance_data: vine.array(
      vine.object({
        student_id: vine.number(),
        status: vine.enum(['present', 'absent', 'late', 'half_day']),
        remarks: vine.string().optional(),
      })
    ),
  })
)
