//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { column } from '@adonisjs/lucid/orm'

export default class RoleMaster extends Base {

    public static table = 'role_master'
    
    @column()
    declare role :
      | 'ADMIN'
      | 'PRINCIPAL'
      | 'HEAD_TEACHER'
      | 'CLERK'
      | 'IT_ADMIN'
      | 'SCHOOL_TEACHER'
      | 'HOD'
      | 'FACULTY'
      | 'ORG_ADMIN'
      | 'SUPER_ADMIN'
      | 'DEVELOPER'

    @column()
    declare permissions : any
}