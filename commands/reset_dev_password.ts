import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/User'
import hash from '@adonisjs/core/services/hash'

export default class ResetDevPassword extends BaseCommand {
  static commandName = 'reset:dev-password'
  static description = 'Reset developer@melzo.com password to a known value'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Searching for developer@melzo.com user...')

    try {
      const user = await User.findBy('email', 'developer@melzo.com')
      if (!user) {
        this.logger.error('developer@melzo.com not found in database.')
        return
      }

      const targetPassword = 'Dev@Melzo#2025'
      user.password = targetPassword
      await user.save()

      this.logger.success(`✓ Password for developer@melzo.com (User ID: ${user.id}) has been updated to: "${targetPassword}"`)
      
      // Verify if verify matches
      const isMatched = await hash.verify(user.password, targetPassword)
      this.logger.info(`Hash verification test: ${isMatched ? 'SUCCESS' : 'FAILED'}`)

    } catch (error) {
      this.logger.error(`Error updating password: ${error.message}`)
    }
  }
}
