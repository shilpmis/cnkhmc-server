import Base from '#models/base'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import * as relations from '@adonisjs/lucid/types/relations'
import AcademicSession from './AcademicSession.js'
import Organization from '#models/Organization'
export default class Schools extends Base {

     public static table = 'schools'

     @column()
     declare organization_id: number

     @column()
     declare name : string

     @column()
     declare email: string

     @column()
     declare branch_code: string   

     @column()
     declare established_year: string

     @column()
     declare school_type: 'SCHOOL' | 'COLLEGE'
     
     @column()
     declare contact_number: number
     
     @column()
     declare address: string | null

     @column({serializeAs : null})
     declare is_email_verified: boolean 

     @column()
     declare status : 'ACTIVE' | 'INACTIVE'
     
     @column()
     declare district: string | null
   
     @column()
     declare city: string 
     
     @column()
     declare pincode: number | null
   
     @column()
     declare state: string
   
     @column()
     declare school_logo: string | null
     
     /** Relationship: A School belongs to an Organization */
     @belongsTo(() => Organization, {
        foreignKey: 'organization_id', // This is the column in Schools table
     })
     declare organization: relations.BelongsTo<typeof Organization>

     @hasMany(() => AcademicSession, {
        foreignKey: 'school_id',
        localKey: 'id'  
     })
     declare academicSessions: relations.HasMany<typeof AcademicSession>
}