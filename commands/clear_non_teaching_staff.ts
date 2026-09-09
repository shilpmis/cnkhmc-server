import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class ClearNonTeachingStaff extends BaseCommand {
  static commandName = 'clear:non-teaching-staff'
  static description = 'Clear non-teaching staff data from the system'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Searching for non-teaching staff data...')

    try {
      await db.rawQuery('SET FOREIGN_KEY_CHECKS = 0')

      // Get non-teaching staff IDs
      const [rows]: any = await db.rawQuery(
        "SELECT id, first_name, last_name, staff_type FROM staff WHERE staff_type = 'Non-Teaching Staff' OR staff_type LIKE '%Non-Teaching%' OR is_teching_staff = 0 OR is_teaching_role = 0"
      )

      const staffIds = rows.map((r: any) => r.id)
      this.logger.info(`Found ${staffIds.length} non-teaching staff records.`)

      if (staffIds.length > 0) {
        const idList = staffIds.join(',')

        this.logger.info('Deleting non-teaching staff enrollments...')
        await db.rawQuery(`DELETE FROM staff_enrollments WHERE staff_id IN (${idList})`)

        this.logger.info('Deleting non-teaching staff experiences...')
        await db.rawQuery(`DELETE FROM staff_experiences WHERE staff_id IN (${idList})`)

        this.logger.info('Deleting non-teaching staff records...')
        await db.rawQuery(`DELETE FROM staff WHERE id IN (${idList})`)

        this.logger.success(`Successfully deleted ${staffIds.length} non-teaching staff records!`)
      } else {
        this.logger.info('No non-teaching staff records found to delete.')
      }

      await db.rawQuery('SET FOREIGN_KEY_CHECKS = 1')
    } catch (error: any) {
      await db.rawQuery('SET FOREIGN_KEY_CHECKS = 1')
      this.logger.error(`Failed to clear non-teaching staff data: ${error.message}`)
    }
  }
}
