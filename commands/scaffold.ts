import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class Scaffold extends BaseCommand {

  public static commandName = 'make:scaffold'
  public static description = 'Creates model, migration, controller .'

  // @args.string({ description: 'Name of the scaffold class' })
  // declare name: string

  // @flags.boolean({ alias: 'wr', description: 'Without RBAC' })
  // declare withoutRBAC: boolean

  public static settings = {
    loadApp: true,
    stayAlive: false,
  }

  static options: CommandOptions = {}


  async run() {

    const name = this.parsed.args[0];
    // Validate that the name argument is provided
    if (!name) {
      this.logger.error('You must provide a scaffold name.')
      return
    }

    // Execute required commands
    await this.kernel.exec('make:model:api', [name]);
    await this.kernel.exec('make:validator:api', [name]);
    await this.kernel.exec('make:controller:api', [name]);

    // Success message
    this.logger.success(`API-based resourceful model , controller and  validator has been created .`)
  }
}
