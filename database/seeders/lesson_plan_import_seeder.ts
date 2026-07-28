import { BaseSeeder } from '@adonisjs/lucid/seeders'
import fs from 'node:fs'
import LessonPlan from '#models/LessonPlan'
import LessonPlanTopic from '#models/LessonPlanTopic'
import LessonPlanSubtopic from '#models/LessonPlanSubtopic'
import Subjects from '#models/Subjects'

export default class extends BaseSeeder {
  async run() {
    const filePath = 'e:/Internship/lesson_plan_import.json'
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`)
      return
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const importData = JSON.parse(content)
    const { data } = importData

    // Resolve active academic session
    const resolvedAcademicSessionId = new Date().getFullYear()

    // Resolve subject (e.g. HMM-2)
    const subject = await Subjects.query().where('code', 'HMM-2').first()
    const resolvedSubjectId = subject ? subject.id : 1

    const resolvedSchoolId = 1

    console.log(`Importing lesson plan for Subject ID: ${resolvedSubjectId}, Academic Session ID: ${resolvedAcademicSessionId}`)

    // 1. Create or get LessonPlan
    const lessonPlan = await LessonPlan.updateOrCreate(
      { subjectId: resolvedSubjectId, academicYear: resolvedAcademicSessionId, schoolId: resolvedSchoolId },
      { totalRequiredHours: 0 }
    )

    let currentTopic: LessonPlanTopic | null = null
    let topicOrder = 0
    let subtopicOrder = 0

    for (const item of data) {
      // 2. Create Topic if it's new
      if (item.topic && (!currentTopic || currentTopic.name !== item.topic)) {
        currentTopic = await LessonPlanTopic.updateOrCreate(
          { lessonPlanId: lessonPlan.id, name: item.topic },
          { 
            order: topicOrder++,
            code: item.code.split('.')[0],
            isCompleted: false,
            requiredHours: 0
          }
        )
        subtopicOrder = 0
        console.log(`Created Topic: ${item.topic}`)
      }

      if (currentTopic && item.subtopic) {
        // 3. Create Subtopic
        await LessonPlanSubtopic.updateOrCreate(
          { topicId: currentTopic.id, name: item.subtopic },
          {
            code: item.code,
            detail: item.detail,
            order: subtopicOrder++,
            isCompleted: false
          }
        )
      }
    }

    console.log('Lesson plan import completed successfully')
  }
}