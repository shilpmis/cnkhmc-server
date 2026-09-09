import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class ClearStudents extends BaseCommand {
  static commandName = 'clear:students'
  static description = 'Clear all student data from the system'

  static options: CommandOptions = {
    startApp: true
  }

  async run() {
    this.logger.info('Starting removal of all student data...')
    
    try {
      // Disable foreign key checks on the connection
      await db.rawQuery('SET FOREIGN_KEY_CHECKS = 0')
      
      const tables = [
        'hostel_allocations',
        'exam_results',
        'student_extra_fees_installments',
        'student_fees_installments',
        'student_fees_master',
        'student_fees_plan_masters',
        'student_fees_types_installments_breakdowns',
        'student_fees_type_masters',
        'concessions_student_masters',
        'student_enrollments',
        'students_meta',
        'students'
      ]
      
      for (const table of tables) {
        this.logger.info(`Deleting from table: ${table}`)
        await db.rawQuery(`DELETE FROM ${table}`)
      }
      
      this.logger.info('Resetting converted status in admission_inquiries...')
      await db.rawQuery("UPDATE admission_inquiries SET student_enrollments_id = NULL, is_converted_to_student = 0, status = 'pending'")
      
      // Re-enable foreign key checks
      await db.rawQuery('SET FOREIGN_KEY_CHECKS = 1')
      
      this.logger.success('Successfully cleared all student data from the system!')
    } catch (error) {
      this.logger.error(`Failed to clear student data: ${error.message}`)
    }
  }
}
