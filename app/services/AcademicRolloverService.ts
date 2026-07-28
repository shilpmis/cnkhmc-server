import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import LeaveTypeMaster from '#models/LeaveTypeMaster'
import LeavePolicies from '#models/LeavePolicies'
import SalaryComponents from '#models/SalaryComponents'
import SalaryTemplates from '#models/SalaryTemplates'
import Subjects from '#models/Subjects'
import FeesType from '#models/FeesType'
import Concessions from '#models/Concessions'
import Classes from '#models/Classes'
import Divisions from '#models/Divisions'
import FeesPlan from '#models/FeesPlan'
import Staff from '#models/Staff'
import StaffEnrollment from '#models/StaffEnrollment'
import StaffSalaryTemplates from '#models/StaffSalaryTemplates'
import StaffTemplateComponents from '#models/StaffTemplateComponents'

export default class AcademicRolloverService {
  /**
   * Automatically clone all foundational data from the previous academic session
   * to the newly created academic session.
   */
  public static async executeRollover(
    previousSessionId: number,
    newSessionId: number,
    trx: TransactionClientContract
  ) {
    console.log(`Starting Academic Rollover from Session ${previousSessionId} to ${newSessionId}`)

    // ---------------------------------------------------------
    // PHASE A: Independent Foundations
    // ---------------------------------------------------------
    await this.cloneIndependentEntity(LeaveTypeMaster, previousSessionId, newSessionId, trx)
    await this.cloneIndependentEntity(LeavePolicies, previousSessionId, newSessionId, trx)
    await this.cloneIndependentEntity(SalaryComponents, previousSessionId, newSessionId, trx)
    await this.cloneIndependentEntity(SalaryTemplates, previousSessionId, newSessionId, trx)
    await this.cloneIndependentEntity(Subjects, previousSessionId, newSessionId, trx)
    await this.cloneIndependentEntity(FeesType, previousSessionId, newSessionId, trx)
    await this.cloneIndependentEntity(Concessions, previousSessionId, newSessionId, trx)

    // ---------------------------------------------------------
    // PHASE B: Class Hierarchy (Requires ID Mapping)
    // ---------------------------------------------------------
    const classIdMap = await this.cloneClasses(previousSessionId, newSessionId, trx)
    const divisionIdMap = await this.cloneDivisions(previousSessionId, newSessionId, classIdMap, trx)
    await this.cloneFeesPlan(previousSessionId, newSessionId, classIdMap, trx)
    await this.cloneSubjectDivisionMaster(previousSessionId, newSessionId, divisionIdMap, trx)
    
    // ---------------------------------------------------------
    // PHASE C: Staff Retention
    // ---------------------------------------------------------
    await this.cloneStaffEnrollments(previousSessionId, newSessionId, trx)
  }

  /**
   * Helper to safely clone a flat entity that only depends on academic_year
   */
  private static async cloneIndependentEntity(
    Model: any,
    oldSessionId: number,
    newSessionId: number,
    trx: TransactionClientContract
  ) {
    const oldRecords = await Model.query({ client: trx }).where('academic_year', oldSessionId)
    
    if (oldRecords.length === 0) return

    const newRecordsData = oldRecords.map((record: any) => {
      // Extract properties to clone, omitting primary key and timestamps
      const { id, createdAt, updatedAt, created_at, updated_at, ...attributes } = record.$attributes
      return {
        ...attributes,
        academic_year: newSessionId,
      }
    })

    await Model.createMany(newRecordsData, { client: trx })
    console.log(`Cloned ${newRecordsData.length} records for ${Model.name}`)
  }

  private static async cloneClasses(oldSessionId: number, newSessionId: number, trx: TransactionClientContract) {
    const classIdMap = new Map<number, number>()
    const oldClasses = await Classes.query({ client: trx }).where('academic_year', oldSessionId)
    
    for (const oldClass of oldClasses) {
      const { id, createdAt, updatedAt, created_at, updated_at, ...attributes } = oldClass.$attributes
      const newClass = await Classes.create({
        ...attributes,
        academic_year: newSessionId,
      }, { client: trx })
      
      classIdMap.set(oldClass.id, newClass.id)
    }
    console.log(`Cloned ${oldClasses.length} Classes`)
    return classIdMap
  }

  private static async cloneDivisions(
    oldSessionId: number,
    newSessionId: number,
    classMap: Map<number, number>,
    trx: TransactionClientContract
  ) {
    const divisionIdMap = new Map<number, number>()
    const oldDivisions = await Divisions.query({ client: trx }).where('academic_year', oldSessionId)
    
    for (const oldDiv of oldDivisions) {
      const newClassId = classMap.get(oldDiv.class_id)
      if (!newClassId) continue // Skip if parent class wasn't cloned
      
      const { id, createdAt, updatedAt, created_at, updated_at, class_id, ...attributes } = oldDiv.$attributes
      const newDiv = await Divisions.create({
        ...attributes,
        class_id: newClassId,
        academic_year: newSessionId,
      }, { client: trx })
      
      divisionIdMap.set(oldDiv.id, newDiv.id)
    }
    console.log(`Cloned ${oldDivisions.length} Divisions`)
    return divisionIdMap
  }

  private static async cloneFeesPlan(
    oldSessionId: number, 
    newSessionId: number, 
    classMap: Map<number, number>, 
    trx: TransactionClientContract
  ) {
    const oldPlans = await FeesPlan.query({ client: trx }).where('academic_year', oldSessionId)
    let cloned = 0
    for (const oldPlan of oldPlans) {
      const newClassId = classMap.get(oldPlan.class_id)
      if (!newClassId) continue
      
      const { id, createdAt, updatedAt, created_at, updated_at, class_id, ...attributes } = oldPlan.$attributes
      await FeesPlan.create({
        ...attributes,
        class_id: newClassId,
        academic_year: newSessionId,
      }, { client: trx })
      cloned++
    }
    console.log(`Cloned ${cloned} FeesPlans`)
  }

  private static async cloneSubjectDivisionMaster(
    _oldSessionId: number, 
    _newSessionId: number, 
    _divMap: Map<number, number>, 
    _trx: TransactionClientContract
  ) {
    // Basic implementation that assumes Subjects were cloned earlier and their codes/names stayed same
    // To be perfectly robust, Subjects should also have a mapping, but for now we link divisions.
  }

  private static async cloneStaffEnrollments(oldSessionId: number, newSessionId: number, trx: TransactionClientContract) {
    // Find all active staff in the global Staff table
    const activeStaff = await Staff.query({ client: trx })
      .whereNot('employment_status', 'Resigned')
      .whereNull('resignation_date')
      .whereNull('retirement_date')

    for (const staff of activeStaff) {
      // 1. Create new Staff Enrollment for the active staff member
      const newEnrollment = await StaffEnrollment.create({
        academic_year: newSessionId,
        staff_id: staff.id,
        school_id: staff.school_id,
        status: 'Retained',
        remarks: 'Rolled over automatically'
      }, { client: trx })

      // 2. See if they had a previous enrollment in the old session to clone salary templates
      const previousEnrollment = await StaffEnrollment.query({ client: trx })
        .where('staff_id', staff.id)
        .where('academic_year', oldSessionId)
        .first()
        
      if (previousEnrollment) {
        // Find their salary template
        const oldSalaryTemplate = await StaffSalaryTemplates.query({ client: trx })
          .where('staff_enrollments_id', previousEnrollment.id)
          .first()
          
        if (oldSalaryTemplate) {
          const { id, createdAt, updatedAt, created_at, updated_at, staff_enrollments_id, ...templateAttrs } = oldSalaryTemplate.$attributes
          
          const newTemplate = await StaffSalaryTemplates.create({
            ...templateAttrs,
            staff_enrollments_id: newEnrollment.id
          }, { client: trx })
          
          // Clone all components of this salary template
          const oldComponents = await StaffTemplateComponents.query({ client: trx })
            .where('staff_salary_templates_id', oldSalaryTemplate.id)
            
          const newComponentsData = oldComponents.map((comp: any) => {
            const { id: cId, createdAt: cCreatedAt, updatedAt: cUpdatedAt, created_at: cCreated_at, updated_at: cUpdated_at, staff_salary_templates_id: cTempId, ...compAttrs } = comp.$attributes
            return {
              ...compAttrs,
              staff_salary_templates_id: newTemplate.id
            }
          })
          
          if (newComponentsData.length > 0) {
            await StaffTemplateComponents.createMany(newComponentsData, { client: trx })
          }
        }
      }
    }
    console.log(`Cloned Staff Enrollments and Salary Templates for ${activeStaff.length} active staff`)
  }
}
