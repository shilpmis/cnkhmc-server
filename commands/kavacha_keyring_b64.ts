import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Prints KAVACHA_KEYRING base64-encoded, the form that survives hosting dashboards which strip or
 * escape the double quotes inside JSON (Elastic Beanstalk environment properties, systemd files).
 * The output is a SECRET: paste it straight into the server's environment settings and clear your
 * terminal afterwards. Never share it in chat, tickets or git.
 */
export default class KavachaKeyringB64 extends BaseCommand {
  static commandName = 'kavacha:keyring-b64'
  static description = 'Print the keyring base64-encoded for pasting into hosting environment settings'
  static options: CommandOptions = { startApp: true }

  async run() {
    const { default: env } = await import('#start/env')
    const raw = env.get('KAVACHA_KEYRING')
    if (!raw) {
      this.logger.error('KAVACHA_KEYRING is not set in this environment.')
      this.exitCode = 1
      return
    }

    // Validate through the real cipher so a broken value is caught here, not on the server.
    const { default: KavachaCipher } = await import('#services/kavacha_cipher')
    KavachaCipher.sealField('check', 'keyring.check')

    this.logger.info('Value for KAVACHA_KEYRING (SECRET, paste it into the server settings only):')
    console.log(Buffer.from(raw).toString('base64'))
    this.logger.info(`Also set KAVACHA_ACTIVE_VERSION=${env.get('KAVACHA_ACTIVE_VERSION') ?? 1}`)
  }
}
