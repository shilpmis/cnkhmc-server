import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/User'

export default class CheckLpData extends BaseCommand {
  static commandName = 'check:lp-data'
  static description = 'Diagnose academic sessions via real HTTP request'

  static options: CommandOptions = {
    startApp: true
  }

  async run() {
    try {
      this.logger.info('Starting diagnostic HTTP simulation for User 100...')

      const user = await User.find(100)
      if (!user) {
        this.logger.error('User 100 not found in DB')
        return
      }

      this.logger.info(`User found: ID=${user.id}, email=${user.email}`)

      // Create a temporary API token for User 100
      const token = await User.accessTokens.create(user)
      const tokenValue = token.value!.release()
      this.logger.info(`Generated token: Bearer ${tokenValue.substring(0, 10)}...`)

      const url = 'http://localhost:3333/api/v1/leave-policy/user?academic_year=33'
      this.logger.info(`Making HTTP GET request to ${url}...`)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenValue}`,
          'Accept': 'application/json'
        }
      })

      this.logger.info(`HTTP Response Status: ${response.status} ${response.statusText}`)
      
      const responseBody = await response.text()
      this.logger.info(`HTTP Response Body: ${responseBody}`)

      // Clean up the temporary token
      await User.accessTokens.delete(user, token.identifier)
      this.logger.info('Cleaned up diagnostic token.')

    } catch (error) {
      this.logger.error(`Diagnostic simulation failed: ${error.message}\n${error.stack}`)
    }
  }
}