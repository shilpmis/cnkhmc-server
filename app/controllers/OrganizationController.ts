import Organization from '#models/Organization';
import Entity from '#models/Entity';
import Department from '#models/Department';
import CoursePhase from '#models/CoursePhase';
import Schools from '#models/Schools';
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import User from '#models/User'
import Classes from '#models/Classes'
import Batch from '#models/Batch'
import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
export default class OrganizationController {
  private async ensureAccess(ctx: HttpContext, options: { orgId?: number, schoolId?: number } = {}) {
    const authUser = ctx.auth.user
    if (!authUser) {
      ctx.response.unauthorized({ message: 'Unauthorized' })
      return false
    }

    // Role IDs (should ideally be fetched or constantized)
    const SUPER_ADMIN = 8
    const ORG_ADMIN = 7
    const SCHOOL_ADMIN = 1
    const DEVELOPER = 11

    // Super Admin & Developer can do everything
    if (authUser.role_id === SUPER_ADMIN || authUser.role_id === DEVELOPER) return true

    // Org Admin can manage their own org
    if (authUser.role_id === ORG_ADMIN && options.orgId && authUser.organization_id === Number(options.orgId)) {
      return true
    }

    // School Admin can manage their own school
    if (authUser.role_id === SCHOOL_ADMIN && options.schoolId && authUser.school_id === Number(options.schoolId)) {
      return true
    }

    ctx.response.forbidden({ message: 'Forbidden: You do not have permission to access this resource.' })
    return false
  }

  // Existing Org methods
  public async onboardOrganization(ctx: HttpContext) {
    const trx = await db.transaction()
    try {
      const isAuthorized = await this.ensureAccess(ctx)
      if (!isAuthorized) return

      const data = ctx.request.all()
      
      const adminUsername = data.admin_username
      const adminPassword = data.admin_password

      if (!adminUsername || !adminPassword) {
        return ctx.response.badRequest({ message: 'Admin username and password are required' })
      }

      // Check if username (saral_email in DB) is unique
      const existingUser = await User.query().where('email', adminUsername).first()
      if (existingUser) {
        return ctx.response.badRequest({ message: 'Username is already taken' })
      }

      // Build explicit payload
      const payload = {
        name: data.name,
        email: data.email || adminUsername, // Fallback to admin username if business email is missing
        contact_number: Number(data.contact_number || 0),
        subscription_type: data.subscription_type || 'FREE',
        subscription_start_date: data.subscription_start_date || new Date(),
        subscription_end_date: data.subscription_end_date || new Date(),
        status: data.status || 'ACTIVE',
        established_year: String(data.established_year || new Date().getFullYear()),
        address: data.address || 'Not Provided',
        head_name: data.head_name || 'Admin',
        head_contact_number: Number(data.head_contact_number || 0),
        city: data.city || 'Default City',
        state: data.state || 'Default State',
        pincode: data.pincode ? Number(data.pincode) : null,
        district: data.district || 'Default District',
        organization_logo: data.organization_logo || null
      }

      const organization = await Organization.create(payload, { client: trx });

      // Create Org Admin User
      await User.create({
        organization_id: organization.id,
        role_id: 8, // ORG_ADMIN
        name: `${organization.name} Admin`,
        email: adminUsername, // Mapping username to email field
        username: adminUsername, // Required for login
        password: adminPassword,
        is_active: true
      }, { client: trx })

      await trx.commit()
      return ctx.response.status(201).json(organization)
    } catch (error) {
      await trx.rollback()
      console.log('Onboarding Error:', error)
      return ctx.response.status(500).json({ 
        message: 'Internal Server Error', 
        error: error.message || error
      })
    }
  }

  public async getOrganizationById(ctx: HttpContext) {
    try {
      const isAuthorized = await this.ensureAccess(ctx, { orgId: Number(ctx.params.id) })
      if (!isAuthorized) return

      const organization = await Organization.query().where('id', ctx.params.id).preload('entities').firstOrFail()
      return ctx.response.ok(organization)
    } catch (error) {
      return ctx.response.notFound({ message: 'Organization not found' })
    }
  }

  public async updateOrganizationById(ctx: HttpContext) {
    try {
      const isAuthorized = await this.ensureAccess(ctx, { orgId: Number(ctx.params.id) })
      if (!isAuthorized) return

      const organization = await Organization.findOrFail(ctx.params.id)
      const data = ctx.request.only([
        'name', 'email', 'contact_number', 'subscription_type',
        'subscription_start_date', 'subscription_end_date', 'is_email_verified',
        'status', 'organization_logo', 'established_year', 'address', 'head_name',
        'head_contact_number', 'district', 'city', 'state', 'pincode'
      ])
      organization.merge(data)
      await organization.save()
      return ctx.response.ok(organization)
    } catch (error) {
      return ctx.response.notFound({ message: 'Organization not found' })
    }
  }

  public async getAllOrganization(ctx: HttpContext) {
    try {
      const isAuthorized = await this.ensureAccess(ctx)
      if (!isAuthorized) return

      const organizations = await Organization.query().preload('entities')
      return ctx.response.ok(organizations)
    } catch (error) {
      console.error('Fetch Organizations Error:', error)
      return ctx.response.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      })
    }
  }

  public async deleteOrganization(ctx: HttpContext) {
    const authUser = ctx.auth.user
    if (!authUser || authUser.role_id !== 11) { // 11 is DEVELOPER
      return ctx.response.forbidden({ message: 'Forbidden: Only Developers can delete organizations.' })
    }

    const { password } = ctx.request.all()
    if (!password) {
      return ctx.response.badRequest({ message: 'Password is required to delete the organization.' })
    }

    const isPasswordValid = await hash.verify(authUser.password, password)
    if (!isPasswordValid) {
      return ctx.response.status(401).json({ message: 'Incorrect password. Deletion aborted.' })
    }

    const orgId = Number(ctx.params.id)
    if (isNaN(orgId)) {
      return ctx.response.badRequest({ message: 'Invalid Organization ID' })
    }

    const org = await Organization.find(orgId)
    if (!org) {
      return ctx.response.notFound({ message: 'Organization not found' })
    }

    const trx = await db.transaction()
    try {
      // 1. Fetch schools associated with the organization
      const schools = await Schools.query({ client: trx }).where('organization_id', orgId)
      const schoolIds = schools.map(s => s.id)

      // Fetch users belonging to these schools or the organization
      const users = await db.from('users')
        .useTransaction(trx)
        .where('organization_id', orgId)
        .orWhereIn('school_id', schoolIds.length > 0 ? schoolIds : [0])
      const userIds = users.map(u => u.id)

      if (schoolIds.length > 0) {
        // Fetch academic sessions for these schools
        const sessions = await db.from('academic_sessions')
          .useTransaction(trx)
          .whereIn('school_id', schoolIds)
        const sessionIds = sessions.map(s => s.id)

        // Fetch classes for these sessions
        const classes = await db.from('classes')
          .useTransaction(trx)
          .whereIn('academic_session_id', sessionIds.length > 0 ? sessionIds : [0])
        const classIds = classes.map(c => c.id)

        // Fetch divisions for these sessions
        const divisions = await db.from('divisions')
          .useTransaction(trx)
          .whereIn('academic_session_id', sessionIds.length > 0 ? sessionIds : [0])
        const divisionIds = divisions.map(d => d.id)

        // Fetch subjects division masters for these sessions
        const subjectsDivisions = await db.from('subjects_division_masters')
          .useTransaction(trx)
          .whereIn('academic_session_id', sessionIds.length > 0 ? sessionIds : [0])
        const subjectsDivisionIds = subjectsDivisions.map(sd => sd.id)

        // A. Delete staff attendance edit requests (references users via actioned_by / requested_by)
        if (userIds.length > 0) {
          await db.from('staff_attendance_edit_requests')
            .useTransaction(trx)
            .whereIn('actioned_by', userIds)
            .orWhereIn('requested_by', userIds)
            .delete()
        }

        // B. Delete staff attendance masters (references users via marked_by and sessions via academic_session_id)
        if (sessionIds.length > 0) {
          await db.from('staff_attendance_masters')
            .useTransaction(trx)
            .whereIn('academic_session_id', sessionIds)
            .delete()
        }
        if (userIds.length > 0) {
          await db.from('staff_attendance_masters')
            .useTransaction(trx)
            .whereIn('marked_by', userIds)
            .delete()
        }

        // C. Delete attendance details (references students via student_id)
        const studentIdsRes = await db.from('students')
          .useTransaction(trx)
          .whereIn('school_id', schoolIds)
          .select('id')
        const studentIds = studentIdsRes.map(s => s.id)
        if (studentIds.length > 0) {
          await db.from('attendance_details')
            .useTransaction(trx)
            .whereIn('student_id', studentIds)
            .delete()
        }

        // 1. Delete periods_config (references divisions, classes, timetables, etc.)
        if (divisionIds.length > 0) {
          await db.from('periods_config')
            .useTransaction(trx)
            .whereIn('division_id', divisionIds)
            .delete()
        }

        // 2. Delete class_day_config (references classes)
        if (classIds.length > 0) {
          await db.from('class_day_config')
            .useTransaction(trx)
            .whereIn('class_id', classIds)
            .delete()
        }

        // 3. Delete subjects_division_staff_masters (references staff_enrollments)
        if (subjectsDivisionIds.length > 0) {
          await db.from('subjects_division_staff_masters')
            .useTransaction(trx)
            .whereIn('subjects_division_id', subjectsDivisionIds)
            .delete()
        }

        // 4. Delete attendance_masters (references classes and sessions)
        if (classIds.length > 0) {
          await db.from('attendance_masters')
            .useTransaction(trx)
            .whereIn('class_id', classIds)
            .delete()
        }

        // 5. Delete leave logs, staff leave applications, staff leave balances
        let applicationIds: number[] = []
        if (sessionIds.length > 0) {
          const apps = await db.from('staff_leave_applications')
            .useTransaction(trx)
            .whereIn('academic_session_id', sessionIds)
            .select('id')
          applicationIds = apps.map(a => a.id)
        }

        await db.from('leave_logs')
          .useTransaction(trx)
          .whereIn('performed_by', userIds.length > 0 ? userIds : [0])
          .orWhereIn('leave_application_id', applicationIds.length > 0 ? applicationIds : [0])
          .delete()

        if (sessionIds.length > 0) {
          await db.from('staff_leave_applications')
            .useTransaction(trx)
            .whereIn('academic_session_id', sessionIds)
            .delete()

          await db.from('staff_leave_balances')
            .useTransaction(trx)
            .whereIn('academic_session_id', sessionIds)
            .delete()
        }

        // 6. Delete leave policies and types
        await db.from('leave_policies')
          .useTransaction(trx)
          .whereIn('school_id', schoolIds)
          .delete()

        await db.from('leave_types_master')
          .useTransaction(trx)
          .whereIn('school_id', schoolIds)
          .delete()

        // 7. Delete admission inquiries
        await db.from('admission_inquiries')
          .useTransaction(trx)
          .whereIn('school_id', schoolIds)
          .delete()

        // 8. Delete student fees master & fees plans
        if (sessionIds.length > 0) {
          await db.from('student_fees_master')
            .useTransaction(trx)
            .whereIn('academic_session_id', sessionIds)
            .delete()

          await db.from('fees_plans')
            .useTransaction(trx)
            .whereIn('academic_session_id', sessionIds)
            .delete()
        }

        // 9. Delete subjects division masters
        if (sessionIds.length > 0) {
          await db.from('subjects_division_masters')
            .useTransaction(trx)
            .whereIn('academic_session_id', sessionIds)
            .delete()
        }

        // 10. Delete school timetable config
        if (sessionIds.length > 0) {
          await db.from('school_timetable_config')
            .useTransaction(trx)
            .whereIn('academic_session_id', sessionIds)
            .delete()
        }

        // 11. Delete divisions
        if (sessionIds.length > 0) {
          await db.from('divisions')
            .useTransaction(trx)
            .whereIn('academic_session_id', sessionIds)
            .delete()
        }

        // 12. Delete classes
        if (sessionIds.length > 0) {
          await db.from('classes')
            .useTransaction(trx)
            .whereIn('academic_session_id', sessionIds)
            .delete()
        }

        // 13. Delete academic sessions
        await db.from('academic_sessions')
          .useTransaction(trx)
          .whereIn('school_id', schoolIds)
          .delete()

        // 14. Delete users (safely, now that references are deleted)
        await db.from('users')
          .useTransaction(trx)
          .whereIn('id', userIds.length > 0 ? userIds : [0])
          .delete()

        // 15. Delete schools (cascades to staff, students, etc.)
        await db.from('schools')
          .useTransaction(trx)
          .whereIn('id', schoolIds)
          .delete()
      } else {
        // Delete staff attendance edit requests for these users
        if (userIds.length > 0) {
          await db.from('staff_attendance_edit_requests')
            .useTransaction(trx)
            .whereIn('actioned_by', userIds)
            .orWhereIn('requested_by', userIds)
            .delete()

          await db.from('staff_attendance_masters')
            .useTransaction(trx)
            .whereIn('marked_by', userIds)
            .delete()
        }

        // Delete leave logs performed by these users
        await db.from('leave_logs')
          .useTransaction(trx)
          .whereIn('performed_by', userIds.length > 0 ? userIds : [0])
          .delete()

        // Delete users belonging to the organization
        await db.from('users')
          .useTransaction(trx)
          .whereIn('id', userIds.length > 0 ? userIds : [0])
          .delete()
      }

      // Delete organization itself (cascades to entities)
      await org.useTransaction(trx).delete()

      await trx.commit()
      return ctx.response.ok({ message: 'Organization and all associated data deleted successfully' })
    } catch (error) {
      await trx.rollback()
      console.error('Delete Organization Error:', error)
      return ctx.response.status(500).json({
        message: 'Failed to delete organization',
        error: error.message || error
      })
    }
  }

  // --- Entity Management (New) ---

  /** List entities for an organization */
  public async getEntities(ctx: HttpContext) {
    try {
      const organizationId = Number(ctx.params.organization_id)
      const isAuthorized = await this.ensureAccess(ctx, { orgId: organizationId })
      if (!isAuthorized) return

      const entities = await Entity.query()
        .where('organization_id', organizationId)
        .preload('departments', (q) => q.preload('phases'))
      return ctx.response.ok(entities)
    } catch (error) {
      return ctx.response.status(500).json(error)
    }
  }

  /** Create a new Entity (School or College) */
  public async createEntity(ctx: HttpContext) {
    const trx = await db.transaction()
    try {
      const organizationId = Number(ctx.params.organization_id)
      const isAuthorized = await this.ensureAccess(ctx, { orgId: organizationId })
      if (!isAuthorized) {
        await trx.rollback()
        return
      }

      const data = ctx.request.all()
      
      const adminUsername = data.admin_username
      const adminPassword = data.admin_password

      if (!adminUsername || !adminPassword) {
        await trx.rollback()
        return ctx.response.badRequest({ message: 'Admin username and password are required' })
      }

      // Check if username is unique
      const existingUser = await User.query().where('email', adminUsername).first()
      if (existingUser) {
        await trx.rollback()
        return ctx.response.badRequest({ message: 'Username is already taken' })
      }

      const entityData = {
        name: data.name,
        type: data.type,
        config: data.config,
        email: data.email || null,
        branch_code: data.branch_code || null,
        contact_number: data.contact_number ? Number(data.contact_number) : null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
        organization_id: organizationId
      }

      const entity = await Entity.create(entityData, { client: trx })

      // Synchronize with Schools table (ensuring no primary key or unique constraint conflicts)
      await Schools.updateOrCreate({ id: entity.id }, {
        name: entity.name,
        organization_id: organizationId,
        email: entity.email || `inst-${entity.id}@saral.erp`, // Ensure unique default email
        branch_code: entity.branch_code || 'S-' + entity.id,
        status: 'ACTIVE',
        school_type: entity.type === 'SCHOOL' ? 'SCHOOL' : 'COLLEGE',
        address: entity.address || 'Default Address',
        city: entity.city || 'Default City',
        state: entity.state || 'Default State',
        contact_number: entity.contact_number || Number('9999' + entity.id),
        established_year: new Date().getFullYear().toString()
      }, { client: trx })

      // Create School Admin User
      await User.create({
        organization_id: organizationId,
        school_id: entity.id,
        role_id: 1, // SCHOOL_ADMIN
        name: `${entity.name} Admin`,
        email: adminUsername,
        username: adminUsername, // Required for login
        password: adminPassword,
        is_active: true
      }, { client: trx })

      // Handle detailed configuration if provided
      if (data.type === 'COLLEGE' && data.config?.departments) {
        const currentYear = new Date().getFullYear();
        
        for (const deptData of data.config.departments) {
          const department = await Department.create({
            entity_id: entity.id,
            name: deptData.name
          }, { client: trx })
          if (deptData.phases) {
            for (const phaseData of deptData.phases) {
              await CoursePhase.create({
                department_id: department.id,
                phase_name: `${phaseData.year_index} Year`,
                duration_months: Math.round(phaseData.duration * 12)
              }, { client: trx })
            }
          }
          
          // Generate the inaugural Base Batch for this department
          await Batch.create({
            entity_id: entity.id,
            department_id: department.id,
            name: `${deptData.name} - ${currentYear} Batch`,
            start_date: DateTime.local(currentYear, 6, 1), // Assuming June start
          }, { client: trx })
        }
      } 
      else if (data.type === 'SCHOOL' && data.config?.classes) {
        for (const className of data.config.classes) {
           // Assumes academic_session_id will be linked later or isn't strictly required on insert
           await Classes.create({
              school_id: entity.id,
              class: className,
              is_active: true
           }, { client: trx })
        }
      }

      await trx.commit()
      return ctx.response.status(201).json(entity)
    } catch (error) {
      await trx.rollback()
      console.log('Create Entity Error:', error)
      return ctx.response.status(500).json({ message: 'Failed to create entity', error: error.message })
    }
  }
}