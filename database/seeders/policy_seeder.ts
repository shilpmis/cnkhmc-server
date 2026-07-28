import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Policy from '#models/policy'

export default class extends BaseSeeder {
  async run() {
    await Policy.updateOrCreateMany('name', [
      {
        name: 'Super Admin',
        description: 'Full access to everything',
        rules: [{ action: 'manage', subject: 'all' }],
      },
      {
        name: 'Principal / Dean',
        description: 'Full access to academic and administrative modules',
        rules: [
          { action: 'manage', subject: 'all' },
          { action: 'read', subject: 'SystemSettings', inverted: true },
          { action: 'update', subject: 'SystemSettings', inverted: true },
          { action: 'create', subject: 'SystemSettings', inverted: true },
          { action: 'delete', subject: 'SystemSettings', inverted: true }
        ],
      },
      {
        name: 'HOD',
        description: 'Manage Student, Department, Course, DeadStock',
        rules: [
          { action: 'manage', subject: 'Student' },
          { action: 'manage', subject: 'Department' },
          { action: 'manage', subject: 'Course' },
          { action: 'manage', subject: 'DeadStock' },
        ],
      },
      {
        name: 'Professor',
        description: 'Read-write access to Student, Attendance, Grades',
        rules: [
          { action: ['read', 'create', 'update'], subject: 'Student' },
          { action: ['read', 'create', 'update'], subject: 'Attendance' },
          { action: ['read', 'create', 'update'], subject: 'Grades' },
        ],
      },
      {
        name: 'Accountant',
        description: 'Manage Fees, Payments, Transactions, Payroll',
        rules: [
          { action: 'manage', subject: 'Fees' },
          { action: 'manage', subject: 'Payments' },
          { action: 'manage', subject: 'Transactions' },
          { action: 'manage', subject: 'Payroll' },
        ],
      },
      {
        name: 'Hostel Manager',
        description: 'Manage Hostel, Room, Bed, HostelAllocation. Read Student.',
        rules: [
          { action: 'manage', subject: 'Hostel' },
          { action: 'manage', subject: 'Room' },
          { action: 'manage', subject: 'Bed' },
          { action: 'manage', subject: 'HostelAllocation' },
          { action: 'read', subject: 'Student' },
        ],
      },
      {
        name: 'Inventory Clerk',
        description: 'Manage DeadStock, DeadStockTransaction',
        rules: [
          { action: 'manage', subject: 'DeadStock' },
          { action: 'manage', subject: 'DeadStockTransaction' },
        ],
      },
      {
        name: 'Student (Self-Service)',
        description: 'Read-only access to own profile, Attendance, Grades, HostelAllocation',
        rules: [
          { action: 'read', subject: 'Student' },
          { action: 'read', subject: 'Attendance' },
          { action: 'read', subject: 'Grades' },
          { action: 'read', subject: 'HostelAllocation' },
        ],
      },
      {
        name: 'Read-Only Viewer',
        description: 'Read-only access to all',
        rules: [{ action: 'read', subject: 'all' }],
      },
    ])
  }
}