import { BaseCommand } from '@adonisjs/core/ace'
// import type { CommandOptions } from "@adonisjs/core/types/ace"
import fs from 'node:fs'

export default class ImportLessonPlan extends BaseCommand {
  static commandName = 'import:lesson-plan'
  static description = 'Import lesson plan from a JSON file generated from Excel'

  public static settings = {
    loadApp: true,
    stayAlive: false,
  }

  async run() {
    const { default: LessonPlan } = await import('#models/LessonPlan')
    const { default: LessonPlanTopic } = await import('#models/LessonPlanTopic')
    const { default: LessonPlanSubtopic } = await import('#models/LessonPlanSubtopic')

    const filePath = 'e:/Internship/lesson_plan_import.json'
    if (!fs.existsSync(filePath)) {
      this.logger.error(`File not found: ${filePath}`)
      return
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const importData = JSON.parse(content)

    const { subject_id, academic_year, school_id, data } = importData

    this.logger.info(`Importing lesson plan for Subject ID: ${subject_id}`)

    // 1. Create or get LessonPlan
    const lessonPlan = await LessonPlan.updateOrCreate(
      { subjectId: subject_id, academicYear: academic_year, schoolId: school_id },
      { totalRequiredHours: 0 }
    )

    type TopicType = InstanceType<typeof LessonPlanTopic>
    let currentTopic: TopicType | null = null
    let topicOrder = 0
    let subtopicOrder = 0

    for (const item of data) {
      // 2. Create Topic if it's new
      if (item.topic && (!currentTopic || currentTopic.name !== item.topic)) {
        currentTopic = await LessonPlanTopic.updateOrCreate(
          { lessonPlanId: lessonPlan.id, name: item.topic },
          { 
            order: topicOrder++,
            code: item.code.split('.')[0], // Rough extraction of topic code
            isCompleted: false,
            requiredHours: 0
          }
        )
        subtopicOrder = 0
        this.logger.info(`Created Topic: ${item.topic}`)
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

    this.logger.success('Lesson plan import completed successfully')
  }
}