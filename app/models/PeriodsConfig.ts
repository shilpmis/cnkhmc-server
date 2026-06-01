//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { column, belongsTo} from '@adonisjs/lucid/orm'
import  LabConfig from './LabConfig.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import SubjectDivisionMaster from './SubjectDivisionMaster.js'
import ClassDayConfig from './ClassDayConfig.js'
import StaffEnrollment from './StaffEnrollment.js'

export default class PeriodsConfig extends Base {

    static table = 'periods_config'

    @column()
    declare class_day_config_id: number

    @column()
    declare division_id: number

    @column()
    declare period_order: number

    @column()
    declare start_time: string

    @column()
    declare end_time: string

    @column()
    declare is_break : boolean

    @column()
    declare subjects_division_masters_id: number | null

    @column()
    declare staff_enrollment_id : number | null
    
    @column()
    declare lab_id : number | null

    @column()
    declare is_pt : boolean

    @column()
    declare is_free_period : boolean

    @column()
    declare batch_name: string | null

    @belongsTo(() => LabConfig, {
        localKey: 'id',
        foreignKey: 'lab_id',
    })
    declare lab: BelongsTo<typeof LabConfig>
    
    @belongsTo(() => SubjectDivisionMaster, {
        foreignKey: 'subjects_division_masters_id',
    })
    declare period_config_subject: BelongsTo<typeof SubjectDivisionMaster>

    @belongsTo(() => ClassDayConfig, {
        foreignKey: 'class_day_config_id',
    })
    declare period_config_class_day: BelongsTo<typeof ClassDayConfig>

    @belongsTo(() => StaffEnrollment, {
        foreignKey: 'staff_enrollment_id',
    })
    declare staff_enrollment: BelongsTo<typeof StaffEnrollment>

}