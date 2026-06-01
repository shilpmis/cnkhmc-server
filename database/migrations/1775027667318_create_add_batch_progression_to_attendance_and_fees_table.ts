import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    const hasAttendance = await this.schema.hasTable('attendance_masters')
    if (hasAttendance) {
      const hasAttendanceColumn = await this.schema.hasColumn(
        'attendance_masters',
        'batch_progression_id'
      )
      if (!hasAttendanceColumn) {
        this.schema.alterTable('attendance_masters', (table) => {
          table
            .integer('batch_progression_id')
            .unsigned()
            .nullable()
            .references('id')
            .inTable('batch_progressions')
            .onDelete('SET NULL')
        })
      }
    }

    // Note: existing DB uses singular table name: student_fees_master
    const hasStudentFeesMaster = await this.schema.hasTable('student_fees_master')
    if (hasStudentFeesMaster) {
      const hasStudentFeesMasterColumn = await this.schema.hasColumn(
        'student_fees_master',
        'batch_progression_id'
      )
      if (!hasStudentFeesMasterColumn) {
        this.schema.alterTable('student_fees_master', (table) => {
          table
            .integer('batch_progression_id')
            .unsigned()
            .nullable()
            .references('id')
            .inTable('batch_progressions')
            .onDelete('SET NULL')
        })
      }
    }
  }

  async down() {
    const hasAttendance = await this.schema.hasTable('attendance_masters')
    if (hasAttendance) {
      const hasAttendanceColumn = await this.schema.hasColumn(
        'attendance_masters',
        'batch_progression_id'
      )
      if (hasAttendanceColumn) {
        this.schema.alterTable('attendance_masters', (table) => {
          table.dropColumn('batch_progression_id')
        })
      }
    }

    const hasStudentFeesMaster = await this.schema.hasTable('student_fees_master')
    if (hasStudentFeesMaster) {
      const hasStudentFeesMasterColumn = await this.schema.hasColumn(
        'student_fees_master',
        'batch_progression_id'
      )
      if (hasStudentFeesMasterColumn) {
        this.schema.alterTable('student_fees_master', (table) => {
          table.dropColumn('batch_progression_id')
        })
      }
    }
  }
}
