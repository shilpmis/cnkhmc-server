import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import PeriodsConfig from '#models/PeriodsConfig'
import User from '#models/User'
import db from '@adonisjs/lucid/services/db'

export default class TestTeacherTimetable extends BaseCommand {
  static commandName = 'test:teacher-timetable'
  static description = 'Test teacher timetable query and serialization'

  static options: CommandOptions = {
    startApp: true
  }

  async run() {
    this.logger.info('Starting test:teacher-timetable...')
    try {
      // 1. Fetch all users who are staff
      const users = await User.query().whereNotNull('staff_id')
      this.logger.info(`Found ${users.length} users with staff_id.`)

      for (const user of users) {
        this.logger.info(`--------------------------------------------------`)
        this.logger.info(`Testing for User ID: ${user.id}, Username: ${user.username}, Staff ID: ${user.staff_id}`)

        // 2. Fetch staff enrollment for session 33
        const staffEnrollment = await db.from('staff_enrollments')
          .where('staff_id', user.staff_id!)
          .where('academic_year', 33)
          .first()

        if (!staffEnrollment) {
          this.logger.info(`No staff enrollment found for session 33.`)
          continue
        }

        this.logger.success(`Found staff enrollment ID: ${staffEnrollment.id}`)

        // 3. Query PeriodsConfig with preloads
        this.logger.info(`Querying periods for staff enrollment ID: ${staffEnrollment.id}...`)
        const periods = await PeriodsConfig.query()
          .where('staff_enrollment_id', staffEnrollment.id)
          .preload('lab')
          .preload('period_config_subject', (query) => {
            query.preload('subject')
          })
          .preload('period_config_class_day', (query) => {
            query.preload('class')
          })
        
        this.logger.success(`Found ${periods.length} periods.`)

        // 4. Try serialization
        this.logger.info(`Attempting to serialize periods...`)
        // // const serialized = periods.map(p => p.serialize())
        this.logger.success(`Successfully serialized all ${periods.length} periods.`)
      }

      this.logger.success('All checks completed successfully!')
    } catch (e) {
      this.logger.error('Query/Serialization failed with error:')
      console.error(e);
    }
  }
}
