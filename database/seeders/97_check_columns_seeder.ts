
import db from '@adonisjs/lucid/services/db'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const columns = await db.rawQuery('DESCRIBE role_master')
    console.log('RoleMaster Columns:', JSON.stringify(columns[0], null, 2))
  }
}
