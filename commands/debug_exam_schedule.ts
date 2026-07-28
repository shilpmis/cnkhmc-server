import { BaseCommand } from '@adonisjs/core/ace'
import ExamSchedule from '#models/exam_schedule'

export default class DebugExamSchedule extends BaseCommand {
  static commandName = 'debug:exam-schedule'
  static options = { startApp: true }

  async run() {
    try {
      const schedules = await ExamSchedule.query()
        .preload('examMaster')
        
        .preload('academicClass')
        .preload('subjects', (subjectsQuery) => {
          subjectsQuery.preload('subject')
        })
        .orderBy('created_at', 'desc')
      console.log("Success! Schedules:", schedules.length)
    } catch (error) {
      console.error("QUERY ERROR:")
      console.error(error.stack || error.message)
    }
  }
}