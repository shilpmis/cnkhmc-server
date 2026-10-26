import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class InspectUsers extends BaseCommand {
  static commandName = 'inspect:users'
  static description = 'Inspect users and roles in MelzoERP database'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Querying database for developer accounts...')

    try {
      const staffUsers = await db
        .from('users')
        .join('staff', 'users.staff_id', 'staff.id')
        .leftJoin('staff_role_master', 'staff.staff_role_id', 'staff_role_master.id')
        .select(
          'users.id as user_id',
          'users.name as user_name',
          'users.role_id',
          'staff.id as staff_id',
          'staff.first_name',
          'staff.last_name',
          'staff.staff_type',
          'staff_role_master.role as role_name',
          'staff_role_master.is_teaching_role'
        )
      console.log('Staff users:', JSON.stringify(staffUsers, null, 2))

    } catch (error) {
      this.logger.error(`Database Error: ${error.message}`)
    }
  }
}
