import vine from '@vinejs/vine'

export const UpdateAcademicCalendarSettingValidator = vine.compile(
  vine.object({
    non_working_dates: vine.array(vine.string()),
    is_saturday_working: vine.boolean(),
  })
)

