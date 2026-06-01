import User from '#models/User'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    // 1. Seed original users with corrected email property
    const originalUsers = [
      {
        id: 1,
        school_id: 1,
        organization_id: 1,
        email: 'admin@cnkhmc.org',
        username: 'admin_cnkhmc',
        name: 'Admin',
        role_id: 1,
        password: '12345678',
        is_active: true,
        staff_id: null,
      },
      {
        id: 2,
        school_id: 1,
        organization_id: 1,
        email: 'principal@cnkhmc.org',
        username: 'principal_cnkhmc',
        name: 'Principal',
        role_id: 2,
        password: '12345678',
        is_active: true,
        staff_id: null,
      },
      {
        id: 3,
        school_id: 1,
        organization_id: 1,
        email: 'rita.patel@cnkhmc.org',
        username: 'teacher_rita',
        name: 'Rita Patel',
        role_id: 6,
        password: '12345678',
        staff_id: 1,
        is_active: true,
      },
    ]

    for (const u of originalUsers) {
      await User.updateOrCreate({ username: u.username }, u)
    }

    // 2. Seed CNKHMC role logins
    const shilpmisUsers = [
      {
        school_id: 1,
        organization_id: 1,
        email: 'admin@cnkhmc.org',
        username: 'cnkhmc_admin',
        name: 'CNKHMC Admin',
        role_id: 1, // ADMIN
        password: '12345678',
        is_active: true,
        staff_id: null,
      },
      {
        school_id: 1,
        organization_id: 1,
        email: 'principal@cnkhmc.org',
        username: 'cnkhmc_principal',
        name: 'CNKHMC Principal',
        role_id: 2, // PRINCIPAL
        password: '12345678',
        is_active: true,
        staff_id: null,
      },
      {
        school_id: 1,
        organization_id: 1,
        email: 'head_teacher@cnkhmc.org',
        username: 'cnkhmc_head_teacher',
        name: 'CNKHMC Head Teacher',
        role_id: 3, // HEAD_TEACHER
        password: '12345678',
        is_active: true,
        staff_id: null,
      },
      {
        school_id: 1,
        organization_id: 1,
        email: 'clerk@cnkhmc.org',
        username: 'cnkhmc_clerk',
        name: 'CNKHMC Clerk',
        role_id: 4, // CLERK
        password: '12345678',
        is_active: true,
        staff_id: null,
      },
      {
        school_id: 1,
        organization_id: 1,
        email: 'it_admin@cnkhmc.org',
        username: 'cnkhmc_it_admin',
        name: 'CNKHMC IT Admin',
        role_id: 5, // IT_ADMIN
        password: '12345678',
        is_active: true,
        staff_id: null,
      },
      {
        school_id: 1,
        organization_id: 1,
        email: 'teacher@cnkhmc.org',
        username: 'cnkhmc_teacher',
        name: 'CNKHMC Teacher',
        role_id: 6, // SCHOOL_TEACHER
        password: '12345678',
        is_active: true,
        staff_id: null,
      },
      {
        school_id: 1,
        organization_id: 1,
        email: 'school_teacher@cnkhmc.org',
        username: 'cnkhmc_school_teacher',
        name: 'CNKHMC School Teacher',
        role_id: 6, // SCHOOL_TEACHER
        password: '12345678',
        is_active: true,
        staff_id: null,
      },
      {
        school_id: 1,
        organization_id: 1,
        email: 'org_admin@cnkhmc.org',
        username: 'cnkhmc_org_admin',
        name: 'CNKHMC Org Admin',
        role_id: 7, // ORG_ADMIN
        password: '12345678',
        is_active: true,
        staff_id: null,
      },
      {
        school_id: 1,
        organization_id: 1,
        email: 'super_admin@cnkhmc.org',
        username: 'cnkhmc_super_admin',
        name: 'CNKHMC Super Admin',
        role_id: 8, // SUPER_ADMIN
        password: '12345678',
        is_active: true,
        staff_id: null,
      },
      {
        school_id: 1,
        organization_id: 1,
        email: 'hod@cnkhmc.org',
        username: 'cnkhmc_hod',
        name: 'CNKHMC HOD',
        role_id: 9, // HOD
        password: '12345678',
        is_active: true,
        staff_id: null,
      },
      {
        school_id: 1,
        organization_id: 1,
        email: 'faculty@cnkhmc.org',
        username: 'cnkhmc_faculty',
        name: 'CNKHMC Faculty',
        role_id: 10, // FACULTY
        password: '12345678',
        is_active: true,
        staff_id: null,
      },
      {
        school_id: 1,
        organization_id: 1,
        email: 'developer@cnkhmc.org',
        username: 'cnkhmc_developer',
        name: 'CNKHMC Developer',
        role_id: 11, // DEVELOPER
        password: '12345678',
        is_active: true,
        staff_id: null,
      },
    ]

    for (const su of shilpmisUsers) {
      await User.updateOrCreate({ username: su.username }, su)
    }
  }
}
