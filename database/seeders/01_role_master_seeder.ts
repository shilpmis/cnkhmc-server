import RoleMaster from '#models/RoleMaster'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const roles = [
      {
        id: 1,
        role: "ADMIN",
        permissions: JSON.stringify([
          "VIEW_DASHBOARD",
          "MANAGE_USERS",
          "MANAGE_STUDENTS",
          "MANAGE_STAFF",
          "MANAGE_CLASSES",
          "MANAGE_ATTENDANCE",
          "MANAGE_PAYROLL",
          "MANAGE_FEES",
          "VIEW_REPORTS",
          "MANAGE_SETTINGS",
          "MANAGE_LEAVES",
          "MANAGE_ADMISSION",
          "MANAGE_SUBJECTS",
          "MARK_ATTENDANCE",
          "MARK_LEAVES",
          "MANAGE_TIMETABLE",
          "MANAGE_LESSON_PLAN"
        ])
      },
      {
        id: 2,
        role: "PRINCIPAL",
        permissions: JSON.stringify([
          "VIEW_DASHBOARD",
          "MANAGE_STUDENTS",
          "MANAGE_STAFF",
          "MANAGE_ATTENDANCE",
          "MANAGE_FEES",
          "MANAGE_CLASSES",
          "VIEW_REPORTS",
          "MANAGE_ADMISSION",
          "MANAGE_SUBJECTS",
          "MANAGE_TIMETABLE",
          "MANAGE_LESSON_PLAN"
        ])
      },
      {
        id: 3,
        role: "HEAD_TEACHER",
        permissions: JSON.stringify([
          "VIEW_DASHBOARD",
          "MANAGE_ATTENDANCE",
          "MANAGE_STUDENTS",
          "MANAGE_SUBJECTS"
        ])
      },
      {
        id: 4,
        role: "CLERK",
        permissions: JSON.stringify([
          "VIEW_DASHBOARD",
          "MANAGE_FEES",
          "MANAGE_ADMISSION",
          "MANAGE_LEAVES",
          "PAY_FEES",
          "MANAGE_SUBJECTS"
        ])
      },
      {
        id: 5,
        role: "IT_ADMIN",
        permissions: JSON.stringify([
          "VIEW_DASHBOARD",
          "MANAGE_STUDENTS",
          "MANAGE_STAFF",
          "MANAGE_ATTENDANCE",
          "MANAGE_FEES",
          "MANAGE_CLASSES",
          "VIEW_REPORTS",
          "MANAGE_ADMISSION",
          "MANAGE_SETTINGS",
          "MANAGE_SUBJECTS"
        ])
      },
      {
        id: 6,
        role: "SCHOOL_TEACHER",
        permissions: JSON.stringify([
          "VIEW_DASHBOARD",
          "MARK_LEAVES",
          "MARK_ATTENDANCE",
          "MANAGE_SUBJECTS"
        ])
      },
      {
        id: 7,
        role: "ORG_ADMIN",
        permissions: JSON.stringify([
          "VIEW_DASHBOARD",
          "VIEW_REPORTS"
        ])
      },
      {
        id: 8,
        role: "SUPER_ADMIN",
        permissions: JSON.stringify([
          "VIEW_DASHBOARD",
          "MANAGE_USERS",
          "MANAGE_STUDENTS",
          "MANAGE_STAFF",
          "MANAGE_SUBJECTS",
          "MANAGE_CLASSES",
          "MANAGE_ATTENDANCE",
          "MANAGE_PAYROLL",
          "MANAGE_FEES",
          "PAY_FEES",
          "VIEW_REPORTS",
          "MANAGE_SETTINGS",
          "MANAGE_LEAVES",
          "MARK_LEAVES",
          "MARK_ATTENDANCE",
          "MANAGE_ADMISSION",
          "MANAGE_TIMETABLE",
          "MANAGE_LESSON_PLAN"
        ])
      },
      {
        id: 9,
        role: "HOD",
        permissions: JSON.stringify([
          "VIEW_DASHBOARD",
          "MARK_LEAVES",
          "MANAGE_LEAVES",
          "MARK_ATTENDANCE",
          "MANAGE_SUBJECTS",
          "MANAGE_LESSON_PLAN"
        ])
      },
      {
        id: 10,
        role: "FACULTY",
        permissions: JSON.stringify([
          "VIEW_DASHBOARD",
          "MARK_LEAVES",
          "MARK_ATTENDANCE",
          "MANAGE_SUBJECTS"
        ])
      },
      {
        id: 11,
        role: "DEVELOPER",
        permissions: JSON.stringify([
          "VIEW_DASHBOARD",
          "MANAGE_USERS",
          "MANAGE_STUDENTS",
          "MANAGE_STAFF",
          "MANAGE_SUBJECTS",
          "MANAGE_CLASSES",
          "MANAGE_ATTENDANCE",
          "MANAGE_PAYROLL",
          "MANAGE_FEES",
          "PAY_FEES",
          "VIEW_REPORTS",
          "MANAGE_SETTINGS",
          "MANAGE_LEAVES",
          "MARK_LEAVES",
          "MARK_ATTENDANCE",
          "MANAGE_ADMISSION",
          "MANAGE_TIMETABLE",
          "MANAGE_LESSON_PLAN"
        ])
      }
    ]

    for (const roleData of roles) {
      await RoleMaster.updateOrCreate({ id: roleData.id }, roleData as any)
    }
  }
}
