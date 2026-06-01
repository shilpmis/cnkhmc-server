import vine from "@vinejs/vine";

export const CreateValidatorForSchoolTimeTableConfig = vine.compile(
  vine.object({
    // add here
    academic_session_id: vine.number(),
    max_periods_per_day: vine.number(),
    default_period_duration: vine.number(),
    allowed_period_durations: vine.array(vine.number()),
    lab_enabled: vine.boolean(),
    pt_enabled: vine.boolean(),
    period_gap_duration: vine.number().nullable(),
    teacher_max_periods_per_day: vine.number().nullable(),
    teacher_max_periods_per_week: vine.number().nullable(),
    is_lab_included_in_max_periods: vine.boolean(),
  })
)

export const UpdateValidatorForSchoolTimeTableConfig = vine.compile(
  vine.object({
    // add here
    max_periods_per_day: vine.number().optional(),
    default_period_duration: vine.number().optional(),
    allowed_period_durations: vine.array(vine.number()).optional(),
    lab_enabled: vine.boolean().optional(),
    pt_enabled: vine.boolean().optional(),
    period_gap_duration: vine.number().nullable().optional(),
    teacher_max_periods_per_day: vine.number().nullable().optional(),
    teacher_max_periods_per_week: vine.number().nullable().optional(),
    is_lab_included_in_max_periods: vine.boolean().optional(),
  })
)

export const CreateValidatorForLabConfig = vine.compile(
  vine.object({
    // add here
    school_timetable_config_id: vine.number(),
    labs: vine.array(
      vine.object({
        name: vine.string(),
        // type: vine.string(), // e.g. "science", "computer"
        max_capacity: vine.number(), // in term of class
        availability_per_day: vine.number().nullable(), // optional
      }))
  })
)

export const UpdateValidatorForLabConfig = vine.compile(vine.object({
  name: vine.string().optional(),
  // type: vine.string(), // e.g. "science", "computer"
  max_capacity: vine.number().optional(), // in term of class
  availability_per_day: vine.number().nullable().optional(), // optional
}))

export const CreateValidatorForClassDayConfig = vine.compile(
  vine.object({
    // add here
    school_timetable_config_id: vine.number(),
    class_id: vine.number(),
    day: vine.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat']),
    allowed_durations: vine.array(vine.number()),
    max_consecutive_periods: vine.number().optional(),
    total_breaks: vine.number().optional(),
    break_durations: vine.array(vine.number()).optional(),
    day_start_time: vine.string().optional(), // optional
    day_end_time: vine.string().optional(), // optional    
  })
)

export const UpdateValidatorForClassDayConfig = vine.compile(
  vine.object({
    allowed_durations: vine.array(vine.number()).optional(),
    max_consecutive_periods: vine.number().optional(),
    total_breaks: vine.number().optional(),
    break_durations: vine.array(vine.number()).optional(),
    day_start_time: vine.string().optional(), // optional
    day_end_time: vine.string().optional(), // optional    
  })
)

export const CreateValidatorForPeriodConfig = vine.compile(
  vine.object({
    class_day_config_id: vine.number(),
    division_id: vine.number(),
    periods: vine.array(
      vine.object({
        period_order: vine.number(),
        start_time: vine.string(), 
        end_time: vine.string(),
        is_break: vine.boolean(),
        subjects_division_masters_id: vine.number().nullable().optional(),
        staff_enrollment_id: vine.number().nullable().optional(),
        lab_id: vine.number().nullable().optional(),
        is_pt: vine.boolean(),
        is_free_period: vine.boolean(),
        batch_name: vine.string().nullable().optional(),
      })
    )
  })
)

export const UpdateValidatorForPeriodConfig = vine.compile(
  vine.object({
    class_day_config_id: vine.number(),
    division_id: vine.number(),
    periods: vine.array(
      vine.object({
        id : vine.number().optional(), 
        period_order: vine.number(), 
        start_time: vine.string().optional(), 
        end_time: vine.string().optional(),   
        is_break: vine.boolean().optional(),
        subjects_division_masters_id: vine.number().nullable().optional(), 
        staff_enrollment_id: vine.number().nullable().optional(),
        lab_id: vine.number().nullable().optional(), 
        is_pt: vine.boolean().optional(),
        is_free_period: vine.boolean().optional(),
        batch_name: vine.string().nullable().optional(),
      })
    )
  })
)

export const ValidatorForCheckPeriodConfig = vine.compile(
  vine.object({
    id: vine.number().optional(),
    class_day_config_id: vine.number(),
    division_id: vine.number(),
    period_order: vine.number(),
    start_time: vine.string(), 
    end_time: vine.string(),
    is_break: vine.boolean(),
    subjects_division_masters_id: vine.number().nullable(),
    staff_enrollment_id: vine.number().nullable(),
    lab_id: vine.number().nullable(),
    is_pt: vine.boolean(),
    is_free_period: vine.boolean(),
    batch_name: vine.string().nullable().optional(),
  })
)

export const UpdateValidatorForPeriodConfigWeek = vine.compile(
  vine.object({
    division_id: vine.number(),
    days: vine.array(
      vine.object({
        class_day_config_id: vine.number(),
        periods: vine.array(
          vine.object({
            id : vine.number().optional(), 
            period_order: vine.number(), 
            start_time: vine.string().optional(), 
            end_time: vine.string().optional(),   
            is_break: vine.boolean().optional(),
            subjects_division_masters_id: vine.number().nullable().optional(), 
            staff_enrollment_id: vine.number().nullable().optional(),
            lab_id: vine.number().nullable().optional(), 
            is_pt: vine.boolean().optional(),
            is_free_period: vine.boolean().optional(),
            batch_name: vine.string().nullable().optional(),
          })
        )
      })
    )
  })
)
