import vine from '@vinejs/vine'

export const ValidatorForMarkLectureAttendance = vine.compile(
  vine.object({
    division_id: vine.number(),
    subject_id: vine.number(),
    academic_year: vine.number(),
    date: vine.date(),
    session_type: vine.enum(['lecture', 'lab']),
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
