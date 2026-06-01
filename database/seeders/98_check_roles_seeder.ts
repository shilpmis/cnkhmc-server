
import db from '@adonisjs/lucid/services/db'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const roles = await db.from('role_master').select('*')
    console.log('Available Roles:', JSON.stringify(roles, null, 2))
  }
}
