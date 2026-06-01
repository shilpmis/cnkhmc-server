import Organization from '#models/Organization'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    await Organization.updateOrCreate(
      { id: 1 },
      {
        id: 1,
        name: 'C. N. Kothari Homoeopathic Trust',
        email: 'contact@cnkhmc.org',
        contact_number: 2626224424,
        subscription_type: 'PREMIUM',
        subscription_start_date: DateTime.fromISO('2025-03-07'),
        subscription_end_date: DateTime.fromISO('2035-03-07'),
        is_email_verified: true,
        status: 'ACTIVE',
        organization_logo: 'https://example.com/cnk-logo.png',
        established_year: '1998',
        address: 'Vyara, Tapi District',
        head_name: 'Principal',
        head_contact_number: 9876543811,
        district: 'Tapi',
        city: 'Vyara',
        state: 'Gujarat',
      }
    )
  }
}
