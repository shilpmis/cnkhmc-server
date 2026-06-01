
import User from '#models/User'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const username = 'developer_melzo'
    const email = 'developer@melzo.com'
    const password = 'Dev@Melzo#2025'
    const role_id = 11

    const user = await User.query().where('username', username).orWhere('email', email).first()
    
    if (user) {
      user.role_id = role_id
      user.password = password
      await user.save()
      console.log(`User ${username} upgraded to DEVELOPER role (ID 11) with new password`)
    } else {
      await User.create({
        email,
        username,
        password,
        role_id,
        name: 'Melzo Developer',
        is_active: true
      })
      console.log(`Created new DEVELOPER user: ${username}`)
    }
  }
}
