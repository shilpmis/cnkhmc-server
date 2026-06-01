//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { column, hasOne } from '@adonisjs/lucid/orm'
import StaffEnrollment from './StaffEnrollment.js'
import type {  HasOne } from '@adonisjs/lucid/types/relations'

export default class SubjectDivisionStaffMaster extends Base {

    public static table = 'subjects_division_staff_masters'

    @column()
    declare subjects_division_id: number

    @column()
    declare staff_enrollment_id: number

    @column()
    declare notes: string | null

    @column()
    declare status: 'Active' | 'Inactive'

    @hasOne(() => StaffEnrollment, {
        foreignKey: 'id',
        localKey: 'staff_enrollment_id',
    })
    declare staff_enrollment: HasOne<typeof StaffEnrollment>
}