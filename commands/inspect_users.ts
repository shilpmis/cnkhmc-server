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
      // Get developer user details
      const users = await db.from('users').where('email', 'developer@melzo.com')
      this.logger.info('--- developer@melzo.com Users ---')
      console.log(JSON.stringify(users, null, 2))

      // Get count of users per role
      const roleCounts = await db
        .from('users')
        .groupBy('role_id')
        .select('role_id')
        .count('* as count')
      this.logger.info('--- User Counts per Role ID ---')
      console.log(JSON.stringify(roleCounts, null, 2))

      // Check all users with role_id = 11 (Developer)
      const allDevs = await db.from('users').where('role_id', 11)
      this.logger.info('--- All Users with role_id = 11 (Developer) ---')
      console.log(JSON.stringify(allDevs.map(d => ({ id: d.id, email: d.email, organization_id: d.organization_id, school_id: d.school_id })), null, 2))

      // Check roles
      const roles = await db.from('role_masters').select('id', 'name')
      this.logger.info('--- Roles ---')
      console.log(JSON.stringify(roles, null, 2))

    } catch (error) {
      this.logger.error(`Database Error: ${error.message}`)
    }
  }
}
