import { BaseCommand } from '@adonisjs/core/ace'
import RoleMaster from '#models/RoleMaster'

export default class ListStaffColumns extends BaseCommand {
  static commandName = 'list:staff-columns'
  static description = 'List roles'

  async run() {
    try {
      const roles = await RoleMaster.all()
      this.logger.info('Roles:')
      console.log(JSON.stringify(roles, null, 2))
    } catch (e) {
      this.logger.error(e.message)
    }
  }
}