import { randomBytes } from 'node:crypto'
import User from '#models/User'
import RoleMaster from '#models/RoleMaster'
import Schools from '#models/Schools'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

/**
 * Creates one SUPER_ADMIN (role 8) login. The role reaches every module and screen: the client skips its
 * role and permission checks for it, and the server's access rules list it for every module.
 *
 *   SUPER_ADMIN_EMAIL     login email      (default superadmin@cnkhmc.org)
 *   SUPER_ADMIN_USERNAME  login username   (default superadmin)
 *   SUPER_ADMIN_NAME      display name     (default Super Admin)
 *   SUPER_ADMIN_PASSWORD  password         (default: a random one, printed once below)
 *
 * Running it again keeps the existing password unless SUPER_ADMIN_PASSWORD is set.
 */
const SUPER_ADMIN_ROLE_ID = 8

export default class extends BaseSeeder {
  async run() {
    const role = await RoleMaster.find(SUPER_ADMIN_ROLE_ID)
    if (!role) {
      throw new Error('The SUPER_ADMIN role (id 8) does not exist yet. Run the role master seeder first.')
    }

    const school = await Schools.query().orderBy('id', 'asc').first()
    if (!school) {
      throw new Error('No school found. Run the school seeder first.')
    }

    const email = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@cnkhmc.org').trim().toLowerCase()
    const username = (process.env.SUPER_ADMIN_USERNAME || 'superadmin').trim()
    const name = (process.env.SUPER_ADMIN_NAME || 'Super Admin').trim()
    const suppliedPassword = process.env.SUPER_ADMIN_PASSWORD

    const existing = await User.query().where('email', email).first()
    if (existing) {
      existing.merge({
        name,
        username,
        role_id: SUPER_ADMIN_ROLE_ID,
        school_id: school.id,
        organization_id: (school as any).organization_id ?? existing.organization_id,
        is_active: true,
      })
      if (suppliedPassword) existing.password = suppliedPassword
      await existing.save()
      console.log(`Super admin updated: ${email}${suppliedPassword ? ' (password changed)' : ' (password unchanged)'}`)
      return
    }

    const password = suppliedPassword || randomBytes(12).toString('base64url')
    await User.create({
      name,
      username,
      email,
      password,
      role_id: SUPER_ADMIN_ROLE_ID,
      school_id: school.id,
      organization_id: (school as any).organization_id ?? null,
      is_active: true,
      staff_id: null,
    } as any)

    console.log('\n──────── Super admin created ────────')
    console.log(`  email:    ${email}`)
    console.log(`  username: ${username}`)
    console.log(`  password: ${password}`)
    console.log('  Save this password now and change it after the first login.\n')
  }
}
