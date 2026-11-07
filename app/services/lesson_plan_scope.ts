import db from '@adonisjs/lucid/services/db'

/**
 * A syllabus (lesson plan) belongs to one subject in one academic session. Subjects are shared by all
 * sessions, so the same subject can have a 2023-24 plan and a 2024-25 plan, each with its own topics
 * and its own progress. These helpers keep a lecture log on the plan of the session it was taught in.
 */

/** Subject and session of a timetable period, taken from its subject assignment and its timetable. */
export async function lessonPlanTargetForPeriod(periodsConfigId: number) {
  if (!periodsConfigId) return null
  const row = await db
    .from('periods_config as pc')
    .join('class_day_config as cdc', 'pc.class_day_config_id', 'cdc.id')
    .join('school_timetable_config as stc', 'cdc.school_timetable_config_id', 'stc.id')
    .leftJoin('subjects_division_masters as sdm', 'sdm.id', 'pc.subjects_division_masters_id')
    .where('pc.id', periodsConfigId)
    .select('stc.academic_year', 'sdm.subject_id')
    .first()
  if (!row) return null
  return {
    academicYear: Number(row.academic_year),
    subjectId: row.subject_id ? Number(row.subject_id) : null,
  }
}

/**
 * Id of the plan a subject uses in a session. Subjects with the same name count as one subject (the
 * same rule the syllabus screens use); the newest plan wins if there is more than one.
 */
export async function lessonPlanIdFor(subjectId: number, academicYear: number): Promise<number | null> {
  const subject = await db.from('subjects').where('id', subjectId).select('name').first()
  const ids = subject?.name
    ? (await db.from('subjects').whereRaw('LOWER(name) = ?', [String(subject.name).trim().toLowerCase()]).select('id')).map((r: any) => r.id)
    : [subjectId]
  const plan = await db
    .from('lesson_plans')
    .whereIn('subject_id', ids.length ? ids : [subjectId])
    .where('academic_year', academicYear)
    .orderBy('id', 'desc')
    .select('id')
    .first()
  return plan ? Number(plan.id) : null
}

/** Topic and subtopic ids that belong to one plan. */
export async function planItemIds(lessonPlanId: number) {
  const topics = (await db.from('lesson_plan_topics').where('lesson_plan_id', lessonPlanId).select('id')).map((r: any) => Number(r.id))
  const subtopics = topics.length
    ? (await db.from('lesson_plan_subtopics').whereIn('topic_id', topics).select('id')).map((r: any) => Number(r.id))
    : []
  return { topicIds: new Set(topics), subtopicIds: new Set(subtopics) }
}
