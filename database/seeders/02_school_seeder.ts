import Schools from '#models/Schools'
import Entity from '#models/Entity'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    // 1. Seed school record
    await Schools.updateOrCreate(
      { id: 1 },
      {
        id: 1,
        name: "C. N. Kothari Homoeopathic Medical College & Research Centre - VYARA",
        organization_id: 1,
        email: "principal@cnkhmc.org",
        established_year: "1998",
        school_type: "COLLEGE",
        contact_number: 2626224424,
        address: "Vyara, Tapi District",
        district: "Tapi",
        is_email_verified: true,
        city: "Vyara",
        state: "Gujarat",
        pincode: 394650,
        status: "ACTIVE",
        branch_code: "CNKHMC"
      }
    )

    // 2. Seed matching entity record
    await Entity.updateOrCreate(
      { id: 1 },
      {
        id: 1,
        name: "C. N. Kothari Homoeopathic Medical College & Research Centre - VYARA",
        organization_id: 1,
        email: "principal@cnkhmc.org",
        type: "COLLEGE",
        contact_number: 2626224424,
        address: "Vyara, Tapi District",
        city: "Vyara",
        state: "Gujarat",
        pincode: "394650",
        status: "ACTIVE",
        branch_code: "CNKHMC"
      }
    )
  }
}