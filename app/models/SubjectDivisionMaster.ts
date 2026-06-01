//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import Subjects from './Subjects.js'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import SubjectDivisionStaffMaster from './SubjectDivisionStaffMaster.js'

export default class SubjectDivisionMaster extends Base {

    public static table = 'subjects_division_masters'

    @column()
    declare subject_id: number

    @column()
    declare division_id: number

    @column()
    declare academic_session_id: number

    @column()
    declare code_for_division: string

    @column()
    declare description: string | null

    @column()
    declare status: 'Active' | 'Inactive'

    @hasOne(() => Subjects, {
        localKey: 'subject_id',
        foreignKey: 'id',
    })
    declare subject: HasOne<typeof Subjects>

    @hasMany(() => SubjectDivisionStaffMaster, {
        foreignKey: 'subjects_division_id',
        localKey: 'id',
    })
    declare subject_staff_divisioin_master: HasMany<typeof SubjectDivisionStaffMaster>

}