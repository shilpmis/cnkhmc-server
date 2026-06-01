import { BaseCommand } from '@adonisjs/core/ace'
import PeriodsConfig from '#models/PeriodsConfig'

export default class CheckSubtopicsColumns extends BaseCommand {
  static commandName = 'check:subtopics-cols'
  static description = 'Check subtopics table columns and data'

  static options = {
    startApp: true
  }

  async run() {
    const period = await PeriodsConfig.query()
      .whereNotNull('staff_enrollment_id')
      .preload('lab')
      .preload('period_config_subject', (query) => {
        query.preload('subject')
      })
      .preload('period_config_class_day', (query) => {
        query.preload('class')
      })
      .first()

    if (!period) {
      this.logger.error('No period found')
      return
    }

    this.logger.info(`Period Found: ID=${period.id}`)
    const serialized = period.serialize()
    this.logger.info(`Serialized Keys: ${Object.keys(serialized).join(', ')}`)
    
    if (serialized.period_config_subject) {
      this.logger.info(`period_config_subject Keys: ${Object.keys(serialized.period_config_subject).join(', ')}`)
    } else if (serialized.periodConfigSubject) {
      this.logger.info(`periodConfigSubject Keys: ${Object.keys(serialized.periodConfigSubject).join(', ')}`)
    } else {
      this.logger.error('period_config_subject relation is null or not preloaded!')
    }
  }
}






