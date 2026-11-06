import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Biometric (eSSL) attendance.
 *
 * - `staff.biometric_code`: the user ID the staff member punches with on the device (eSSL employee
 *   code such as 1050). App employee codes are generated (EMP...), so the two never match by themselves.
 * - `biometric_punches`: every punch exactly as the device recorded it, never edited. Punches are kept
 *   even for device users not linked to staff yet, so linking later picks up their history.
 * - `biometric_employees`: the employee list from the eSSL software, used to suggest staff links.
 * - `biometric_settings`: per-school rules that turn punches into daily attendance.
 */
export default class extends BaseSchema {
  async up() {
    if (!(await this.schema.hasColumn('staff', 'biometric_code'))) {
      this.schema.alterTable('staff', (table) => {
        table.string('biometric_code', 32).nullable().index()
      })
    }

    if (!(await this.schema.hasTable('biometric_punches'))) {
      this.schema.createTable('biometric_punches', (table) => {
        table.increments('id')
        table.integer('school_id').unsigned().notNullable()
        table.string('device_user_id', 32).notNullable()
        // Wall-clock time on the device (college local time), stored without any time zone conversion
        table.dateTime('punch_time').notNullable()
        table.string('direction', 8).nullable()
        table.integer('device_id').nullable()
        table.string('source', 16).notNullable().defaultTo('mdb')
        table.timestamp('created_at').nullable()
        table.unique(['school_id', 'device_user_id', 'punch_time'], { indexName: 'biometric_punches_unique' })
        table.index(['school_id', 'punch_time'], 'biometric_punches_school_time')
      })
    }

    if (!(await this.schema.hasTable('biometric_employees'))) {
      this.schema.createTable('biometric_employees', (table) => {
        table.increments('id')
        table.integer('school_id').unsigned().notNullable()
        table.string('device_user_id', 32).notNullable()
        table.string('name', 191).nullable()
        table.string('department', 191).nullable()
        table.string('status', 32).nullable()
        table.timestamp('created_at').nullable()
        table.timestamp('updated_at').nullable()
        table.unique(['school_id', 'device_user_id'], { indexName: 'biometric_employees_unique' })
      })
    }

    if (!(await this.schema.hasTable('biometric_settings'))) {
      this.schema.createTable('biometric_settings', (table) => {
        table.increments('id')
        table.integer('school_id').unsigned().notNullable().unique()
        table.string('shift_start', 5).notNullable().defaultTo('09:00')
        table.integer('grace_minutes').notNullable().defaultTo(10)
        table.integer('half_day_minutes').notNullable().defaultTo(240)
        table.integer('full_day_minutes').notNullable().defaultTo(420)
        table.integer('duplicate_window_minutes').notNullable().defaultTo(2)
        table.boolean('overwrite_self_marked').notNullable().defaultTo(false)
        table.timestamp('created_at').nullable()
        table.timestamp('updated_at').nullable()
      })
    }
  }

  async down() {
    this.schema.dropTableIfExists('biometric_settings')
    this.schema.dropTableIfExists('biometric_employees')
    this.schema.dropTableIfExists('biometric_punches')
    if (await this.schema.hasColumn('staff', 'biometric_code')) {
      this.schema.alterTable('staff', (table) => table.dropColumn('biometric_code'))
    }
  }
}
