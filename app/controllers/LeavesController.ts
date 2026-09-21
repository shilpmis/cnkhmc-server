import LeaveLog from '#models/LeaveLog'
import LeavePolicies from '#models/LeavePolicies'
import LeaveTypeMaster from '#models/LeaveTypeMaster'
import Staff from '#models/Staff'
import LeaveApprovalHierarchy from '#models/LeaveApprovalHierarchy'
import StaffLeaveApplication from '#models/StaffLeaveApplication'
import StaffLeaveBalance from '#models/StaffLeaveBalance'
import CompOffRequest from '#models/CompOffRequest'
import {
  CreateValidatorForLeaveApplication,
  CreateValidatorForLeavePolicies,
  CreateValidatorForLeaveType,
  UpdateValidatorForLeaveApplication,
  UpdateValidatorForLeavePolicies,
  UpdateValidatorForLeaveType,
  ValidatorForApproveApplication,
  ValidatorForCancelApplication,
  SearchValidatorForStaff,
} from '#validators/Leave'
import {
  CreateCompOffRequestValidator,
  ProcessCompOffRequestValidator,
} from '#validators/CompOffValidator'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { v4 as uuidv4 } from 'uuid'

export default class LeavesController {
  async indexLeaveTypesForSchool(ctx: HttpContext) {
    let school_id = ctx.auth.user!.school_id!

    if (ctx.request.input('page') == 'all') {
      let leave_types = await LeaveTypeMaster.query()
        .where('school_id', school_id)
        .orderBy('id', 'desc')

      return ctx.response.status(200).json(leave_types)
    }

    let leave_types = await LeaveTypeMaster.query()
      .where('school_id', school_id as number)
      .orderBy('id', 'desc')
      .paginate(ctx.request.input('page', 1), 6)

    return ctx.response.status(200).json(leave_types)
  }

  async createLeaveTypeForSchool(ctx: HttpContext) {
    try {
      // Get user information
      let school_id = ctx.auth.user!.school_id || ctx.request.input('school_id')
      let role_id = ctx.auth.user!.role_id

      // Authorization check
      if (![1, 2, 3, 7, 8, 11].includes(role_id)) {
        return ctx.response.status(401).json({
          message: 'You are not authorized to create leave type for this school',
        })
      }

      // Validate request payload
      let payload = await CreateValidatorForLeaveType.validate(ctx.request.body())

      // Check if leave type with same name already exists for this school and year
      const existingLeaveType = await LeaveTypeMaster.query()
        .where('leave_type_name', payload.leave_type_name)
        .andWhere('school_id', school_id)
        .andWhere('academic_year', payload.academic_year!)
        .first()

      if (existingLeaveType) {
        return ctx.response.status(409).json({
          message: 'A leave type with this name already exists for this school and academic year',
        })
      }

      // Create new leave type
      let leave = await LeaveTypeMaster.create({ ...payload, school_id: school_id })
      return ctx.response.status(201).json({
        message: 'Leave type created successfully',
        data: leave,
      })
    } catch (error) {
      // Check for specific database unique constraint errors
      if (error.code === '23505' || error.message.includes('unique constraint')) {
        return ctx.response.status(409).json({
          message: 'A leave type with this name already exists for this school and academic year',
        })
      }

      // Generic error handling
      console.error('Error creating leave type:', error)
      return ctx.response.status(500).json({
        message: 'Failed to create leave type',
        error: process.env.NODE_ENV === 'production' ? undefined : (error.messages || error.message || error),
      })
    }
  }

  async updateLeaveTypeForSchool(ctx: HttpContext) {
    let school_id = ctx.auth.user!.school_id || ctx.request.input('school_id')
    let role_id = ctx.auth.user!.role_id

    if (role_id !== 1 && school_id !== ctx.auth.user?.school_id!) {
      return ctx.response.status(401).json({
        message: 'You are not authorized to create leave type for this school',
      })
    }

    let leave_type = await LeaveTypeMaster.query()
      .where('id', ctx.params.leave_type_id)
      .andWhere('school_id', school_id as number)
      .first()

    if (!leave_type) {
      return ctx.response.status(404).json({
        message: 'This leave type is not available for your school',
      })
    }

    let payload = await UpdateValidatorForLeaveType.validate(ctx.request.body())
    await leave_type.merge(payload).save()

    return ctx.response.status(200).json(leave_type)
  }

  async indexLeavePolicyForSchool(ctx: HttpContext) {
    let query = LeavePolicies.query()
      .preload('staff_role')
      .preload('leave_type')
      .where('school_id', ctx.auth.user!.school_id!)
      .orderBy('id', 'desc')

    const academic_year = ctx.request.input('academic_year')
    if (academic_year && academic_year !== 'undefined' && academic_year !== 'null') {
      query = query.where('academic_year', academic_year)
    }

    if (ctx.request.input('page') === 'all') {
      const allPolicies = await query
      return ctx.response.status(200).json(allPolicies)
    }

    let leave_policies = await query.paginate(ctx.request.input('page', 1), 10)

    return ctx.response.status(200).json(leave_policies)
  }

  async indexLeavePolicyForUser(ctx: HttpContext) {
    let staff_id = ctx.auth.user!.staff_id
    let academic_year = ctx.request.input('academic_year')

    if (!academic_year || academic_year === 'undefined') {
      return ctx.response.status(200).json([])
    }

    if (!staff_id) {
      return ctx.response.status(200).json([])
    }

    let staff = await Staff.find(staff_id)

    if (!staff) {
      return ctx.response.status(200).json([])
    }

    const leave_policies = await this.getApplicablePoliciesForStaff(
      staff,
      ctx.auth.user!.school_id!,
      Number(academic_year)
    )

    const leaveBalances = await this.getStaffLeaveBalances(Number(staff_id), Number(academic_year))

    // Combine policies with their balances, deriving effective used_leaves
    const result = leave_policies.map(policy => {
      const bal = leaveBalances.find(b => b.leave_type_id === policy.leave_type_id)

      let used = 0
      let total = Number(policy.annual_quota) || 0
      let available = total
      let pending = 0

      if (bal) {
        total = Number(bal.total_leaves) || total
        pending = Number(bal.pending_leaves) || 0
        used = Number(bal.used_leaves) || 0
        available = Number(bal.available_balance)
        if (available <= 0 && used < total) {
          available = Math.max(0, this.formatDecimalValue(total - used - pending))
        }
      }

      return {
        ...policy.serialize(),
        balance: { total_leaves: total, used_leaves: used, pending_leaves: pending, available_balance: available }
      }
    })

    return ctx.response.status(200).json(result)
  }

  async createLeavePolicyForSchool(ctx: HttpContext) {
    let role_id = ctx.auth.user!.role_id

    if (![1, 2, 3, 7, 8, 11].includes(role_id)) {
      return ctx.response.status(401).json({
        message: 'You are not authorized to create leave type for this school',
      })
    }

    let payload = await CreateValidatorForLeavePolicies.validate(ctx.request.body())
    let school_id = ctx.auth.user!.school_id || ctx.request.input('school_id')

    let leave_type = await LeaveTypeMaster.query()
      .where('id', payload.leave_type_id)
      .andWhere('school_id', school_id)
      .first()

    if (!leave_type) {
      return ctx.response.status(404).json({
        message: 'This leave type is not available for your school',
      })
    }

    let leave = await LeavePolicies.create({ ...payload, school_id: school_id })

    return ctx.response.status(200).json(leave)
  }

  async updateLeavePolicyForSchool(ctx: HttpContext) {
    let role_id = ctx.auth.user!.role_id

    if (role_id !== 1 && role_id !== 2 && role_id !== 3) {
      return ctx.response.status(401).json({
        message: 'You are not authorized to edit leave policy for this school',
      })
    }

    let leave_policy = await LeavePolicies.query().where('id', ctx.params.leave_policy_id).first()

    if (!leave_policy) {
      return ctx.response.status(404).json({
        message: 'This leave policy is not available for your school',
      })
    }

    let payload = await UpdateValidatorForLeavePolicies.validate(ctx.request.body())
    await leave_policy.merge(payload).save()

    return ctx.response.status(200).json(leave_policy)
  }

  async deleteLeavePolicyForSchool(ctx: HttpContext) {
    const policy = await LeavePolicies.query()
      .where('id', ctx.params.leave_policy_id)
      .andWhere('school_id', ctx.auth.user!.school_id!)
      .first()

    if (!policy) {
      return ctx.response.status(404).json({ message: 'Leave policy not found' })
    }

    await policy.delete()
    return ctx.response.status(200).json({ message: 'Leave policy deleted successfully' })
  }

  async deleteLeaveTypeForSchool(ctx: HttpContext) {
    const leaveType = await LeaveTypeMaster.query()
      .where('id', ctx.params.leave_type_id)
      .andWhere('school_id', ctx.auth.user!.school_id!)
      .first()

    if (!leaveType) {
      return ctx.response.status(404).json({ message: 'Leave type not found' })
    }

    // Delete associated leave policies first to maintain data integrity
    await LeavePolicies.query().where('leave_type_id', leaveType.id).delete()
    await leaveType.delete()
    return ctx.response.status(200).json({ message: 'Leave type deleted successfully' })
  }

  private async validateLeaveRequest(payload: any, leavePolicy: LeavePolicies) {
    let numberOfDays = 0

    const startDate = DateTime.fromJSDate(new Date(payload.from_date))
    const endDate = DateTime.fromJSDate(new Date(payload!.to_date))
    const today = DateTime.now().startOf('day')
    const twoMonthsFromNow = today.plus({ months: 2 })

    // 1. Date validations
    if (startDate < today) {
      throw new Error('Leave cannot be applied for past dates')
    }

    if (startDate > endDate) {
      throw new Error('Start date cannot be greater than end date')
    }

    if (endDate > twoMonthsFromNow) {
      throw new Error('Cannot apply leave for more than 2 months in advance')
    }

    if (payload.is_hourly_leave) {
      // 3 & 4 & 5. Hourly leave validations
      if (!startDate.equals(endDate)) {
        throw new Error('For hourly leave, start and end date must be same')
      }
      if (payload.is_half_day || payload.half_day_type !== 'none') {
        throw new Error('Hourly leave cannot be combined with half day')
      }
      if (!payload.total_hour) {
        throw new Error('Total hour should be there if leave is hour based .')
      }
      if (payload.total_hour > 4) {
        throw new Error('Hourly leave cannot exceed 4 hours')
      }
      numberOfDays = payload.total_hour / leavePolicy.staff_role.working_hours // Converting hours to days
    } else if (payload.is_half_day) {
      // 3 & 4. Half day validations
      if (!startDate.equals(endDate)) {
        throw new Error('For half day leave, start and end date must be same')
      }
      if (payload.half_day_type === 'none') {
        throw new Error('Half day type must be specified for half day leave')
      }
      numberOfDays = 0.5
    } else {
      // Calculate business days excluding weekends
      let current = startDate
      while (current <= endDate) {
        if (current.weekday <= 5) {
          // Monday = 1, Friday = 5
          numberOfDays++
        }
        current = current.plus({ days: 1 })
      }
    }

    // Validate against max consecutive days
    if (numberOfDays > leavePolicy.max_consecutive_days) {
      throw new Error(`Leave cannot exceed ${leavePolicy.max_consecutive_days} consecutive days`)
    }

    if (!payload.is_hourly_leave && payload.total_hour) {
      throw new Error('Total hour should be null if leave is not hour based !')
    }

    return numberOfDays
  }

  private async validateLeaveRequestForUpdate(
    existingLeave: any,
    updatedPayload: any,
    leavePolicy: LeavePolicies
  ) {
    let numberOfDays = 0

    // Merge existing and updated data
    const payload = {
      ...existingLeave,
      ...updatedPayload,
    }

    const startDate = DateTime.fromJSDate(new Date(payload.from_date))
    const endDate = DateTime.fromJSDate(new Date(payload.to_date))
    const today = DateTime.now().startOf('day')
    const twoMonthsFromNow = today.plus({ months: 2 })

    // Only validate dates if they are being updated
    if (updatedPayload.from_date || updatedPayload.to_date) {
      // Allow editing past leaves that were already approved
      if (existingLeave.status !== 'approved') {
        if (startDate < today) {
          throw new Error('Leave cannot be modified for past dates')
        }
      }

      if (startDate > endDate) {
        throw new Error('Start date cannot be greater than end date')
      }

      if (endDate > twoMonthsFromNow) {
        throw new Error('Cannot apply leave for more than 2 months in advance')
      }
    }

    if (payload.is_hourly_leave) {
      // Hourly leave validations
      if (!startDate.equals(endDate)) {
        throw new Error('For hourly leave, start and end date must be same')
      }
      if (payload.is_half_day || payload.half_day_type !== 'none') {
        throw new Error('Hourly leave cannot be combined with half day')
      }
      if (!payload.total_hour) {
        throw new Error('Total hour should be there if leave is hour based')
      }
      if (payload.total_hour > 4) {
        throw new Error('Hourly leave cannot exceed 4 hours')
      }
      numberOfDays = payload.total_hour / leavePolicy.staff_role.working_hours
    } else if (payload.is_half_day) {
      // Half day validations
      if (!startDate.equals(endDate)) {
        throw new Error('For half day leave, start and end date must be same')
      }
      if (payload.half_day_type === 'none') {
        throw new Error('Half day type must be specified for half day leave')
      }
      numberOfDays = 0.5
    } else {
      // Calculate business days excluding weekends
      let current = startDate
      while (current <= endDate) {
        if (current.weekday <= 5) {
          numberOfDays++
        }
        current = current.plus({ days: 1 })
      }
    }

    // Validate against max consecutive days
    if (numberOfDays > leavePolicy.max_consecutive_days) {
      throw new Error(`Leave cannot exceed ${leavePolicy.max_consecutive_days} consecutive days`)
    }

    if (!payload.is_hourly_leave && payload.total_hour) {
      throw new Error('Total hour should be null if leave is not hour based!')
    }

    // Additional update specific validations
    if (existingLeave.status === 'approved' || existingLeave.status === 'rejected') {
      throw new Error('Cannot modify an approved or rejected leave application')
    }

    return numberOfDays
  }

  async applyForLeave(ctx: HttpContext) {
    let numberOfDays: any = 0
    try {
      let payload = await CreateValidatorForLeaveApplication.validate(ctx.request.body())

      // Check if applying for self or on behalf of another staff member
      let targetStaffId = payload.staff_id
      const userRole = ctx.auth.user!.role_id
      const userStaffId = ctx.auth.user!.staff_id

      // Check if user has permission to apply leave for others
      if (targetStaffId !== userStaffId) {
        // Only head clerk (role_id 3) can apply for other clerks
        const headClerk = await Staff.query()
          .where('id', userStaffId ?? 0) // Replace 0 with an appropriate fallback value if needed
          .andWhere('staff_role_id', userRole) // Assuming 3 is the head clerk role
          .first()

        if (!headClerk) {
          return ctx.response.status(403).json({
            message: 'You are not authorized to apply leave for other staff members',
          })
        }

        // Check if target staff is a clerk
        const targetStaff = await Staff.query()
          .where('id', targetStaffId)
          .andWhere('staff_role_id', 4) // Assuming 4 is the clerk role
          .andWhere('school_id', ctx.auth.user!.school_id!)
          .first()

        if (!targetStaff) {
          return ctx.response.status(403).json({
            message: 'You can only apply leave on behalf of clerks',
          })
        }
      }

      let school_id = ctx.auth.user!.school_id || ctx.request.input('school_id')
      let staff = await Staff.query()
        .where('id', targetStaffId)
        .andWhere('school_id', school_id)
        .first()

      if (!staff) {
        return ctx.response.status(404).json({
          message: 'Staff member not found or not onboarded. Please contact administration.',
        })
      }

      let leave_type = await LeaveTypeMaster.query()
        .where('id', payload.leave_type_id)
        .andWhere('school_id', school_id)
        .first()

      if (!leave_type) {
        return ctx.response.status(404).json({
          message: 'This leave type is not available for your school',
        })
      }

      // Get leave policy
      let policyQuery = LeavePolicies.query()
        .preload('staff_role')
        .where('school_id', school_id)
        .andWhere('leave_type_id', payload.leave_type_id)
        .andWhere('academic_year', payload.academic_year!)

      if (staff.staff_role_id) {
        policyQuery = policyQuery.where((q) => {
          q.where('staff_role_id', staff.staff_role_id).orWhereNull('staff_role_id')
        })
      }

      if (staff.staff_type) {
        const typeStr = staff.staff_type.toLowerCase()
        const isNonVacational = typeStr.includes('non vact') || typeStr.includes('non-vact') || typeStr.includes('non vacat') || typeStr.includes('non-vacat')
        const isVacational = !isNonVacational && (typeStr.includes('vact') || typeStr.includes('vacat'))
        const isHospital = typeStr.includes('hosp')
        const isNonTeaching = !isHospital && (typeStr.includes('non-teach') || typeStr.includes('non teach'))

        policyQuery = policyQuery.where((q) => {
          if (isNonVacational) {
            q.whereIn('applicable_staff_type', ['Non Vactional Teaching', 'Non-Vacational Teaching', 'Teaching Staff'])
              .orWhereNull('applicable_staff_type')
          } else if (isVacational) {
            q.whereIn('applicable_staff_type', ['Vactional Staff Teaching', 'Vacational Staff Teaching', 'Teaching Staff'])
              .orWhereNull('applicable_staff_type')
          } else if (isNonTeaching) {
            q.whereIn('applicable_staff_type', ['Non-Teaching', 'Non-Teaching Staff'])
              .orWhereNull('applicable_staff_type')
          } else if (isHospital) {
            q.whereIn('applicable_staff_type', ['Hospital Staff'])
              .orWhereNull('applicable_staff_type')
          } else if (typeStr.includes('teach')) {
            q.whereIn('applicable_staff_type', ['Vactional Staff Teaching', 'Vacational Staff Teaching', 'Non Vactional Teaching', 'Non-Vacational Teaching', 'Teaching Staff'])
              .orWhereNull('applicable_staff_type')
          } else {
            q.where('applicable_staff_type', staff.staff_type!).orWhereNull('applicable_staff_type')
          }
        })
      }

      const leavePolicy = await policyQuery.first()

      if (!leavePolicy) {
        return ctx.response.status(404).json({
          message: 'No leave policy found for this leave type',
        })
      }

      try {
        numberOfDays = await this.validateLeaveRequest(payload, leavePolicy)
      } catch (error) {
        return ctx.response.status(400).json({
          message: error.message,
        })
      }

      // Check leave balance
      const leaveBalance = await StaffLeaveBalance.query()
        .where('staff_id', targetStaffId)
        .andWhere('leave_type_id', payload.leave_type_id)
        .andWhere('academic_year', payload.academic_year!)
        .orderBy('id', 'desc')  // Get the most recent balance record
        .first()

      let availableBalance = leavePolicy.annual_quota

      // Start transaction for applying leave
      const trx = await db.transaction()
      try {
        // Create or update leave balance
        if (leaveBalance) {
          availableBalance = leaveBalance.available_balance

          // Validate if enough balance is available
          if (numberOfDays > availableBalance) {
            await trx.rollback()
            return ctx.response.status(400).json({
              message: `Leave request exceeds available balance. Available: ${availableBalance} days, Requested: ${numberOfDays} days`,
            })
          }

          // Update existing balance
          const pendingLeaves = this.formatDecimalValue(leaveBalance.pending_leaves + numberOfDays)
          const newAvailableBalance = this.formatDecimalValue(leaveBalance.available_balance - numberOfDays)

          await leaveBalance.merge({
            pending_leaves: pendingLeaves,
            available_balance: newAvailableBalance,
          }).useTransaction(trx).save()
        } else {
          // Validate if enough balance is available (from policy's annual quota)
          if (numberOfDays > leavePolicy.annual_quota) {
            await trx.rollback()
            return ctx.response.status(400).json({
              message: `Leave request exceeds available balance. Available: ${leavePolicy.annual_quota} days, Requested: ${numberOfDays} days`,
            })
          }

          // Create initial leave balance
          await StaffLeaveBalance.create({
            staff_id: targetStaffId,
            leave_type_id: payload.leave_type_id,
            academic_year: payload.academic_year!,
            total_leaves: leavePolicy.annual_quota,
            used_leaves: 0,
            pending_leaves: numberOfDays,
            carried_forward: 0,
            available_balance: leavePolicy.annual_quota - numberOfDays,
          }, { client: trx })
        }

        // Create leave application
        const applicationId = uuidv4()
        let applied_by = ctx.auth.user?.id

        let application = await StaffLeaveApplication.create(
          {
            ...payload,
            uuid: applicationId,
            status: 'pending',
            number_of_days: numberOfDays || 0,
            applied_by_self: targetStaffId === userStaffId,
            applied_by: applied_by,
          },
          { client: trx }
        )

        // Log the action
        await LeaveLog.create({
          leave_application_id: application.id,
          action: 'apply',
          status: 'pending',
          performed_by: ctx.auth.user?.id,
          remarks: `Leave applied for ${numberOfDays} days`,
        }, { client: trx })

        await trx.commit()
        return ctx.response.status(201).json(application)
      } catch (error) {
        await trx.rollback()
        return ctx.response.status(500).json({
          message: error.message,
        })
      }
    } catch (error) {
      return ctx.response.status(400).json(error)
    }
  }

  async updateAppliedLeave(ctx: HttpContext) {
    let leave_application_id = ctx.params.uuid
    let numberOfDays: any = 0
    let originalNumberOfDays: number = 0

    // Start a transaction
    const trx = await db.transaction()

    try {
      // Get the leave application with its leave type
      let application = await StaffLeaveApplication.query()
        .preload('leave_type')
        .where('uuid', leave_application_id)
        .first()

      if (!application) {
        await trx.rollback()
        return ctx.response.status(404).json({
          message: 'Leave application you are requesting is not available',
        })
      }

      // Store the original number of days for balance calculation
      originalNumberOfDays = application.number_of_days

      // Verify the academic year
      if (!application.academic_year) {
        await trx.rollback()
        return ctx.response.status(404).json({
          message: 'No academic year set on this leave application !',
        })
      }

      // Validate request payload
      let payload = await UpdateValidatorForLeaveApplication.validate(ctx.request.body())

      // Get staff information
      let staff = await Staff.query()
        .where('id', application.staff_id)
        .andWhere('school_id', ctx.auth.user!.school_id!)
        .first()

      if (!staff) {
        await trx.rollback()
        return ctx.response.status(404).json({
          message: 'Staff member not found',
        })
      }

      // Get applicable leave policy
      const leave_type_id = payload.leave_type_id || application.leave_type_id

      let policyQuery = LeavePolicies.query()
        .preload('staff_role')
        .where('school_id', ctx.auth.user!.school_id!)
        .andWhere('leave_type_id', leave_type_id)
        .andWhere('academic_year', application.academic_year)

      if (staff.staff_role_id) {
        policyQuery = policyQuery.where((q) => {
          q.where('staff_role_id', staff.staff_role_id).orWhereNull('staff_role_id')
        })
      }

      let leave_policy = await policyQuery.first()

      if (!leave_policy) {
        await trx.rollback()
        return ctx.response.status(404).json({
          message: 'No leave policy found for this leave type',
        })
      }

      // Validate the updated leave request
      try {
        numberOfDays = await this.validateLeaveRequestForUpdate(
          application.serialize(),
          payload,
          leave_policy
        )
      } catch (error) {
        await trx.rollback()
        return ctx.response.status(400).json({
          message: error.message,
        })
      }

      // Get the leave balance record
      const leaveBalance = await StaffLeaveBalance.query()
        .where('staff_id', application.staff_id)
        .andWhere('leave_type_id', leave_type_id)
        .andWhere('academic_year', application.academic_year)
        .orderBy('id', 'desc')
        .first()

      if (!leaveBalance) {
        await trx.rollback()
        return ctx.response.status(404).json({
          message: 'Leave balance record not found for this leave type',
        })
      }

      // Calculate the difference in days
      const daysDifference = numberOfDays - originalNumberOfDays

      // Check if change would exceed available balance
      if (daysDifference > 0 && daysDifference > leaveBalance.available_balance) {
        await trx.rollback()
        return ctx.response.status(400).json({
          message: `Leave extension exceeds available balance. Available: ${leaveBalance.available_balance} days, Additional days requested: ${daysDifference} days`,
        })
      }

      // Update leave balance
      if (daysDifference !== 0) {
        // Update pending leaves
        const pendingLeaves = this.formatDecimalValue(leaveBalance.pending_leaves + daysDifference)
        // Update available balance (subtract if adding days, add if reducing days)
        const availableBalance = this.formatDecimalValue(leaveBalance.available_balance - daysDifference)

        await leaveBalance.merge({
          pending_leaves: pendingLeaves,
          available_balance: availableBalance
        }).useTransaction(trx).save()
      }

      // Update the leave application
      await application.merge({
        ...payload,
        number_of_days: numberOfDays
      }).useTransaction(trx).save()


      await trx.commit()

      // Reload application with updated data
      application = await StaffLeaveApplication.query()
        .preload('leave_type')
        .where('uuid', leave_application_id)
        .first()

      return ctx.response.status(200).json(application)
    } catch (error) {
      await trx.rollback()
      return ctx.response.status(500).json({
        message: error.message,
      })
    }
  }

  async fetchLeaveApplication(ctx: HttpContext) {
    let staff_id = ctx.params.staff_id
    let status = ctx.request.input('status', 'pending')
    let academic_year = ctx.request.input('academic_year')
    const date = ctx.request.input('date', null)
    const today = new Date().toISOString().split('T')[0]

    if (!academic_year) {
      return ctx.response.status(400).json({
        message: 'academic_year is required',
      })
    }

    let staff = await Staff.query()
      .where('id', staff_id)
      .andWhere('school_id', ctx.auth.user!.school_id!)
      .first()

    if (staff) {

      let query = db.query()
        .from('staff_leave_applications')
        .select(
          'staff_leave_applications.uuid',
          // 'staff_leave_applications.staff_id',
          'staff_leave_applications.leave_type_id',
          'staff_leave_applications.approved_by',
          'staff_leave_applications.from_date',
          'staff_leave_applications.to_date',
          'staff_leave_applications.number_of_days',
          'staff_leave_applications.remarks',
          'staff_leave_applications.is_half_day',
          'staff_leave_applications.half_day_type',
          'staff_leave_applications.is_hourly_leave',
          'staff_leave_applications.total_hour',
          'staff_leave_applications.reason',
          'staff_leave_applications.status',
          'staff_role_master.*',
          'leave_types_master.leave_type_name',
          'staff.id as staff_id',
          'staff.first_name',
          'staff.middle_name',
          'staff.last_name',
          'staff.email'
        )
        .join('staff', 'staff.id', 'staff_leave_applications.staff_id')
        .join('staff_role_master', 'staff_role_master.id', 'staff.staff_role_id')
        .join('leave_types_master', 'leave_types_master.id', 'staff_leave_applications.leave_type_id')
        .where('staff.school_id', ctx.auth.user!.school_id!)
        .andWhere('staff_leave_applications.staff_id', staff_id)
        .andWhere('staff_leave_applications.academic_year', academic_year);

      // Apply status filter if not 'all'
      if (status && status !== 'all') {
        query.andWhere('staff_leave_applications.status', status);
      }

      // Apply date filter if date is provided
      if (date) {
        query.andWhereRaw('? BETWEEN DATE(from_date) AND DATE(to_date)', [date]);
      } else {
        // If no date, filter for current or future applications (unless status is 'all')
        if (status !== 'all') {
          query.andWhereRaw('? <= DATE(to_date)', [today]);
        }
      }

      // Execute query with pagination
      let applications = await query.paginate(ctx.request.input('page', 1), 6);

      return ctx.response.status(200).json(applications);
    } else {
      return ctx.response.status(404).json({
        message: 'This teacher is not available for your school',
      })
    }
  }

  async fetchLeaveApplicationForAdmin(ctx: HttpContext) {
    const staff_type = ctx.request.input('role')
    const status = ctx.request.input('status', 'pending')
    const date = ctx.request.input('date', null)
    const page = ctx.request.input('page', 1)
    // const search_term = ctx.request.input('search', '')

    let academic_year = ctx.request.input('academic_year')

    if (!academic_year) {
      return ctx.response.status(400).json({
        message: 'academic_year is required',
      })
    }

    let query = db.query()
      .from('staff_leave_applications')
      .select(
        'staff_leave_applications.id as id',
        'staff_leave_applications.uuid',
        'staff_leave_applications.leave_type_id',
        'staff_leave_applications.academic_year as academic_session_id',
        'staff_leave_applications.approved_by',
        'staff_leave_applications.from_date',
        'staff_leave_applications.to_date',
        'staff_leave_applications.number_of_days',
        'staff_leave_applications.remarks',
        'staff_leave_applications.is_half_day',
        'staff_leave_applications.half_day_type',
        'staff_leave_applications.is_hourly_leave',
        'staff_leave_applications.total_hour',
        'staff_leave_applications.reason',
        'staff_leave_applications.status',
        'staff_role_master.role',
        'staff_role_master.is_teaching_role',
        'leave_types_master.leave_type_name',
        'staff.id as staff_id',
        'staff.first_name',
        'staff.middle_name',
        'staff.last_name',
        'staff.email'
      )
      .join('staff', 'staff.id', 'staff_leave_applications.staff_id')
      .leftJoin('staff_role_master', 'staff_role_master.id', 'staff.staff_role_id')
      .join('leave_types_master', 'leave_types_master.id', 'staff_leave_applications.leave_type_id')
      .where('staff.school_id', ctx.auth.user!.school_id as number);

    if (academic_year && academic_year !== 'all') {
      query.andWhere((q) => {
        q.where('staff_leave_applications.academic_year', academic_year)
          .orWhere('staff_leave_applications.academic_year', String(academic_year))
      })
    }

    if (staff_type === 'teaching') {
      query.andWhere((q) => {
        q.where('staff_role_master.is_teaching_role', 1)
      })
    } else if (staff_type === 'non-teaching' || staff_type === 'other') {
      query.andWhere((q) => {
        q.where('staff_role_master.is_teaching_role', 0).orWhereNull('staff_role_master.is_teaching_role')
      })
    }

    // Apply role and caliber-based visibility rules
    const userRole = ctx.auth.user!.role_id
    const userStaffId = ctx.auth.user!.staff_id
    const adminRoles = [1, 7, 8, 11]

    if (!adminRoles.includes(userRole)) {
      let currentStaff: Staff | null = null
      if (userStaffId) {
        currentStaff = await Staff.query().where('id', userStaffId).first()
      }
      const myCaliber = currentStaff?.caliber_level ?? (userRole === 2 ? 2 : 4)

      query.andWhere((subQ) => {
        let hasCondition = false

        // 1. Direct reportees (explicitly assigned to this manager)
        if (userStaffId) {
          subQ.where('staff.reporting_to_staff_id', userStaffId)
          hasCondition = true
        }

        // 2. Caliber & Department-based reporting hierarchy
        if (myCaliber <= 2 || userRole === 2) {
          // Executive / Principal caliber: sees subordinate staff below level 2
          const execCond = (q: any) => {
            q.where('staff.caliber_level', '>', 2)
              .orWhereNull('staff.caliber_level')
          }
          if (hasCondition) subQ.orWhere(execCond)
          else { subQ.where(execCond); hasCondition = true; }
        } else if (myCaliber === 3 || userRole === 3 || userRole === 9) {
          // Department Head (HOD): sees staff in THEIR department of lower caliber (> 3)
          if (currentStaff?.department_id) {
            const deptCond = (deptQ: any) => {
              deptQ.where('staff.department_id', currentStaff!.department_id)
                .andWhere((calQ: any) => {
                  calQ.where('staff.caliber_level', '>', 3).orWhereNull('staff.caliber_level')
                })
            }
            if (hasCondition) subQ.orWhere(deptCond)
            else { subQ.where(deptCond); hasCondition = true; }
          }
        }

        // Fallback: If no staff_id or reporting match, return empty result set for non-approvers
        if (!hasCondition) {
          subQ.whereRaw('1 = 0')
        }
      })
    }

    // Apply status filter if not 'all'
    if (status && status !== 'all') {
      query.andWhere('staff_leave_applications.status', status);
    }

    // Apply date filter if date is provided
    if (date) {
      query.andWhereRaw('? BETWEEN DATE(from_date) AND DATE(to_date)', [date]);
    }

    try {
      const paginatedResults = await query.paginate(page, 6);
      return ctx.response.status(200).json(paginatedResults)
    } catch (error: any) {
      console.error("QUERY ERROR:", error)
      return ctx.response.status(500).json({
        message: 'Internal Server Error',
        error: error.message,
        stack: error.stack
      })
    }
  }

  async approveTeachersLeaveApplication(ctx: HttpContext) {
    const leave_application_id = ctx.params.uuid

    const leave_application = await StaffLeaveApplication.query()
      .where('uuid', leave_application_id)
      .first()

    if (!leave_application) {
      return ctx.response.status(404).json({
        message: 'Leave application you are requesting is not available',
      })
    }

    let staff = await Staff.query()
      .where('id', leave_application.staff_id)
      .andWhere('school_id', ctx.auth.user!.school_id!)
      .first()

    if (!staff) {
      return ctx.response.status(404).json({
        message: 'You are not authorized to perform this action.',
      })
    }

    // Check if user has permission to approve based on the hierarchy and caliber
    const approverRole = ctx.auth.user!.role_id
    const approverStaffId = ctx.auth.user!.staff_id
    const applicantRole = staff.staff_role_id
    const applicantCaliber = staff.caliber_level ?? 4

    let isAuthorized = false
    const adminRoles = [1, 7, 8, 11] // Includes Admin, SuperAdmin, etc.

    let approverStaff: Staff | null = null
    if (approverStaffId) {
      approverStaff = await Staff.query().where('id', approverStaffId).first()
    }
    const approverCaliber = approverStaff?.caliber_level ?? (adminRoles.includes(approverRole) ? 1 : approverRole === 2 ? 2 : approverRole === 9 || approverRole === 3 ? 3 : 5)

    // 1. Admins / Caliber 1 can approve anything
    if (adminRoles.includes(approverRole) || approverCaliber === 1) {
      isAuthorized = true
    }
    // 2. Direct Reporting Manager
    else if (staff.reporting_to_staff_id && approverStaffId && Number(staff.reporting_to_staff_id) === Number(approverStaffId)) {
      isAuthorized = true
    }
    // 3. Principal / Caliber 2 can approve any subordinate
    else if (approverCaliber === 2 || approverRole === 2) {
      if (applicantCaliber > 2 || [3, 4, 5, 6, 7, 8, 9, 10].includes(applicantRole)) {
        isAuthorized = true
      }
    }
    // 4. HOD / Caliber 3 can approve department staff or teachers
    else if (approverCaliber === 3 || approverRole === 9 || approverRole === 3) {
      if (approverStaff?.department_id && staff.department_id && approverStaff.department_id === staff.department_id) {
        if (applicantCaliber > 3) isAuthorized = true
      } else if (!staff.department_id && applicantRole === 6) {
        isAuthorized = true
      }
    }

    // 5. Check dynamic leave_approval_hierarchies rules
    if (!isAuthorized) {
      const hierarchyRules = await LeaveApprovalHierarchy.query()
        .where('school_id', staff.school_id)
        .andWhere('is_active', true)

      for (const rule of hierarchyRules) {
        const applicantMatch = !rule.applicant_role_id || rule.applicant_role_id === applicantRole
        const approverMatch = (!rule.approver_role_id || (approverStaff?.staff_role_id && rule.approver_role_id === approverStaff.staff_role_id)) || approverCaliber <= rule.min_approver_caliber
        const deptMatch = !rule.require_same_department || (approverStaff?.department_id && staff.department_id && approverStaff.department_id === staff.department_id)

        if (applicantMatch && approverMatch && deptMatch) {
          isAuthorized = true
          break
        }
      }
    }

    if (!isAuthorized) {
      return ctx.response.status(403).json({
        message: 'You are not authorized to approve this leave application. Only higher caliber authorities or assigned reporting managers can approve.',
      })
    }

    const payload = await ValidatorForApproveApplication.validate(ctx.request.body())

    // Remarks is required for rejections
    if (payload.status === 'rejected' && !payload.remarks) {
      return ctx.response.status(400).json({
        message: 'Remarks are mandatory when rejecting a leave application',
      })
    }

    const trx = await db.transaction()
    try {
      // Get leave balance BEFORE making any changes (for logging)
      const originalBalance = await StaffLeaveBalance.query()
        .where('staff_id', leave_application.staff_id)
        .andWhere('leave_type_id', leave_application.leave_type_id)
        .andWhere('academic_year', leave_application.academic_year)
        .orderBy('id', 'desc')
        .first()

      // First update application status
      await leave_application.merge({
        ...payload,
        approved_by: ctx.auth.user?.id,
        approved_at: DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss'),
      }).useTransaction(trx).save()

      // Get the most recent leave balance record
      const leaveBalance = await StaffLeaveBalance.query()
        .where('staff_id', leave_application.staff_id)
        .andWhere('leave_type_id', leave_application.leave_type_id)
        .andWhere('academic_year', leave_application.academic_year)
        .orderBy('id', 'desc')
        .first()

      if (leaveBalance) {
        const leaveDays = this.formatDecimalValue(leave_application.number_of_days)

        if (payload.status === 'approved') {
          // Properly track the movement from pending to used leaves
          const pendingLeaves = this.formatDecimalValue(
            Math.max(0, leaveBalance.pending_leaves - leaveDays)
          )

          const usedLeaves = this.formatDecimalValue(
            leaveBalance.used_leaves + leaveDays
          )

          // console.log(`Leave Approval - Before update: 
          //   Staff ID: ${leave_application.staff_id}
          //   Leave Type: ${leave_application.leave_type_id}
          //   Days: ${leaveDays}
          //   Original Pending: ${originalBalance?.pending_leaves || 0}
          //   Original Used: ${originalBalance?.used_leaves || 0}
          //   Original Available: ${originalBalance?.available_balance || 0}
          //   New Pending: ${pendingLeaves}
          //   New Used: ${usedLeaves}
          //   Available: ${leaveBalance.available_balance} (unchanged)
          // `)

          // Update the balance - pending decreases, used increases
          await leaveBalance.merge({
            pending_leaves: pendingLeaves,
            used_leaves: usedLeaves
            // available_balance remains unchanged as it was already decreased when leave was applied
          }).useTransaction(trx).save()
        } else if (payload.status === 'rejected') {
          // For rejected applications, days go from pending back to available
          const pendingLeaves = this.formatDecimalValue(
            Math.max(0, leaveBalance.pending_leaves - leaveDays)
          )

          const availableBalance = this.formatDecimalValue(
            leaveBalance.available_balance + leaveDays
          )

          console.log(`Leave Rejection - Before update:
            Staff ID: ${leave_application.staff_id}
            Leave Type: ${leave_application.leave_type_id}
            Days: ${leaveDays}
            Original Pending: ${originalBalance?.pending_leaves || 0}
            Original Available: ${originalBalance?.available_balance || 0}
            New Pending: ${pendingLeaves}
            New Available: ${availableBalance}
          `)

          await leaveBalance.merge({
            pending_leaves: pendingLeaves,
            available_balance: availableBalance
          }).useTransaction(trx).save()
        }

        // Verify balance update was successful
        const updatedBalance = await StaffLeaveBalance.query()
          .where('id', leaveBalance.id)
          .useTransaction(trx)
          .first()

        console.log(`After update - Balance ID ${updatedBalance?.id}:
          Pending: ${updatedBalance?.pending_leaves}
          Used: ${updatedBalance?.used_leaves}
          Available: ${updatedBalance?.available_balance}
        `)
      } else {
        throw new Error('Leave balance record not found')
      }

      // Log the action
      await LeaveLog.create({
        leave_application_id: leave_application.id,
        action: payload.status === 'approved' ? 'approve' : 'reject',
        status: payload.status,
        performed_by: ctx.auth.user?.id,
        remarks: payload.remarks || `Leave ${payload.status} by admin`,
      }, { client: trx })

      await trx.commit()

      // Return updated application with related data
      const updatedApplication = await StaffLeaveApplication.query()
        .preload('leave_type')
        .preload('staff')
        .where('id', leave_application.id)
        .first()

      return ctx.response.status(200).json(updatedApplication)
    } catch (error) {
      await trx.rollback()
      return ctx.response.status(500).json({
        message: error.message,
      })
    }
  }

  async getStaffLeaveBalances(staffId: number, academicYear: number) {
    // Get all leave balances for the staff
    const leaveBalances = await StaffLeaveBalance.query()
      .where('staff_id', staffId)
      .andWhere('academic_year', academicYear)

    return leaveBalances
  }

  async getApplicablePoliciesForStaff(
    staff: Staff,
    schoolId: number,
    academicYear: number
  ): Promise<LeavePolicies[]> {
    const existingBalances = await StaffLeaveBalance.query()
      .where('staff_id', staff.id)
      .andWhere('academic_year', academicYear)

    const basePolicyQuery = () =>
      LeavePolicies.query()
        .preload('leave_type')
        .preload('staff_role')
        .where('school_id', schoolId)
        .andWhere('academic_year', academicYear)

    let candidatePolicies: LeavePolicies[] = []

    if (existingBalances.length > 0) {
      const leaveTypeIds = existingBalances.map((b) => b.leave_type_id)
      const rawPolicies = await basePolicyQuery().whereIn('leave_type_id', leaveTypeIds)
      const applicableRaw = rawPolicies.filter((p) => this.isPolicyApplicableToStaff(p, staff))

      const policyMap = new Map<number, LeavePolicies>()
      for (const p of applicableRaw) {
        const existing = policyMap.get(p.leave_type_id)
        if (!existing) {
          policyMap.set(p.leave_type_id, p)
        } else {
          if (p.leave_template_id && !existing.leave_template_id) {
            policyMap.set(p.leave_type_id, p)
          } else if (p.staff_role_id && !existing.staff_role_id && !existing.leave_template_id) {
            policyMap.set(p.leave_type_id, p)
          }
        }
      }
      candidatePolicies = Array.from(policyMap.values())

      if (candidatePolicies.length > 0) {
        return candidatePolicies
      }
    }

    if (staff.leave_template_id) {
      candidatePolicies = await basePolicyQuery()
        .where('leave_template_id', staff.leave_template_id)
        .orderBy('id', 'desc')
    }

    if (candidatePolicies.length === 0 && staff.staff_role_id) {
      candidatePolicies = await basePolicyQuery()
        .where('staff_role_id', staff.staff_role_id)
        .orderBy('id', 'desc')
    }

    if (candidatePolicies.length === 0) {
      const typeStr = (staff.staff_type || '').toLowerCase()
      const isNonVacational = typeStr.includes('non vact') || typeStr.includes('non-vact') || typeStr.includes('non vacat') || typeStr.includes('non-vacat')
      const isVacational = !isNonVacational && (typeStr.includes('vact') || typeStr.includes('vacat'))
      const isHospital = typeStr.includes('hosp')
      const isNonTeaching = !isHospital && (typeStr.includes('non-teach') || typeStr.includes('non teach'))

      candidatePolicies = await basePolicyQuery()
        .whereNull('staff_role_id')
        .whereNull('leave_template_id')
        .where((q) => {
          if (isNonVacational) {
            q.whereIn('applicable_staff_type', ['Non Vactional Teaching', 'Non-Vacational Teaching', 'Teaching Staff'])
              .orWhereNull('applicable_staff_type')
          } else if (isVacational) {
            q.whereIn('applicable_staff_type', ['Vactional Staff Teaching', 'Vacational Staff Teaching', 'Teaching Staff'])
              .orWhereNull('applicable_staff_type')
          } else if (isNonTeaching) {
            q.whereIn('applicable_staff_type', ['Non-Teaching', 'Non-Teaching Staff'])
              .orWhereNull('applicable_staff_type')
          } else if (isHospital) {
            q.whereIn('applicable_staff_type', ['Hospital Staff'])
              .orWhereNull('applicable_staff_type')
          } else if (typeStr.includes('teach')) {
            q.whereIn('applicable_staff_type', ['Vactional Staff Teaching', 'Vacational Staff Teaching', 'Non Vactional Teaching', 'Non-Vacational Teaching', 'Teaching Staff'])
              .orWhereNull('applicable_staff_type')
          } else if (staff.staff_type) {
            q.where('applicable_staff_type', staff.staff_type).orWhereNull('applicable_staff_type')
          } else {
            q.whereNull('applicable_staff_type')
          }
        })
        .orderBy('id', 'desc')
    }

    candidatePolicies = candidatePolicies.filter((policy) => this.isPolicyApplicableToStaff(policy, staff))

    for (const policy of candidatePolicies) {
      const existing = existingBalances.find((b) => b.leave_type_id === policy.leave_type_id)
      if (!existing) {
        await StaffLeaveBalance.create({
          staff_id: staff.id,
          leave_type_id: policy.leave_type_id,
          academic_year: academicYear,
          total_leaves: policy.annual_quota,
          used_leaves: 0,
          pending_leaves: 0,
          carried_forward: 0,
          available_balance: policy.annual_quota,
        })
      }
    }

    return candidatePolicies
  }

  async fetchStaffLeaveBalances(ctx: HttpContext) {
    const staffId = ctx.params.staff_id
    const academicYear = ctx.request.input('academic_year')

    if (!academicYear) {
      return ctx.response.status(400).json({
        message: 'academic_year is required',
      })
    }

    // Check if the staff exists and belongs to the same school
    const staff = await Staff.query()
      .where('id', staffId)
      .andWhere('school_id', ctx.auth.user!.school_id!)
      .first()

    if (!staff) {
      return ctx.response.status(404).json({
        message: 'Staff member not found',
      })
    }

    const leavePolicies = await this.getApplicablePoliciesForStaff(
      staff,
      ctx.auth.user!.school_id!,
      Number(academicYear)
    )

    // Get all existing leave balances for the staff
    const leaveBalances = await this.getStaffLeaveBalances(Number(staffId), Number(academicYear))

    // Combine policies with their balances
    const result = leavePolicies.map(policy => {
      const bal = leaveBalances.find(b => b.leave_type_id === policy.leave_type_id)

      let used = 0
      let total = Number(policy.annual_quota) || 0
      let available = total
      let pending = 0

      if (bal) {
        total = Number(bal.total_leaves) || total
        available = Number(bal.available_balance) ?? total
        pending = Number(bal.pending_leaves) || 0
        const dbUsed = Number(bal.used_leaves) || 0
        // Derive effective used: total - available - pending covers cases where
        // used_leaves wasn't updated on approval
        const derivedUsed = Math.max(0, this.formatDecimalValue(total - available - pending))
        used = Math.max(dbUsed, derivedUsed)
      }

      return {
        policy: {
          id: policy.id,
          leave_type_id: policy.leave_type_id,
          leave_type_name: policy.leave_type.leave_type_name,
          annual_quota: policy.annual_quota,
          max_consecutive_days: policy.max_consecutive_days,
          can_carry_forward: policy.can_carry_forward
        },
        balance: {
          total_leaves: total,
          used_leaves: used,
          pending_leaves: pending,
          available_balance: available,
        }
      }
    })

    return ctx.response.status(200).json(result)
  }


  async searchStaff(ctx: HttpContext) {
    try {
      const payload = await SearchValidatorForStaff.validate(ctx.request.all())

      const query = Staff.query()
        .select([
          'staff.*',
          'staff_role_master.role as role_name',
          'staff_role_master.is_teaching_role'
        ])
        .join('staff_role_master', 'staff.staff_role_id', 'staff_role_master.id')
        .where('staff.school_id', ctx.auth.user!.school_id!)

      // Apply filters
      if (payload.staff_type === 'teaching') {
        query.andWhere('staff_role_master.is_teaching_role', true)
      } else if (payload.staff_type === 'non_teaching') {
        query.andWhere('staff_role_master.is_teaching_role', false)
      }

      // Apply search terms
      if (payload.search_term) {
        const searchTerm = `%${payload.search_term}%`
        query.andWhere(query => {
          query.whereILike('staff.first_name', searchTerm)
            .orWhereILike('staff.last_name', searchTerm)
            .orWhereILike('staff.email', searchTerm)
            .orWhere('staff.mobile_number', 'like', searchTerm)
        })
      }

      const results = await query.paginate(payload.page || 1, payload.per_page || 10)

      if (results.total === 0) {
        return ctx.response.status(200).json({
          message: 'No data found',
          data: results
        })
      }

      return ctx.response.status(200).json(results)
    } catch (error) {
      return ctx.response.status(400).json({
        message: error.message
      })
    }
  }

  // Method to carry forward leaves at the end of academic year
  async processLeaveCarryForward(ctx: HttpContext) {
    // Only admin can process leave carry-forward
    if (![1, 2, 3, 7, 8, 11].includes(ctx.auth.user!.role_id)) {
      return ctx.response.status(403).json({
        message: 'Only admin can process leave carry-forward',
      })
    }

    const oldYear = Number(ctx.request.input('old_year'))
    const newYear = Number(ctx.request.input('new_year'))

    if (!oldYear || !newYear) {
      return ctx.response.status(400).json({
        message: 'Both old_year and new_year are required',
      })
    }

    // Get all leave balances from old year
    const oldBalances = await StaffLeaveBalance.query()
      .where('academic_year', oldYear)

    // Get all leave policies for new year
    const newPolicies = await LeavePolicies.query()
      .where('academic_year', newYear)
      .andWhere('can_carry_forward', true)

    const trx = await db.transaction()
    try {
      // Process each staff's leave balance
      for (const oldBalance of oldBalances) {
        // Find matching policy for this leave type
        const policy = newPolicies.find(
          p => p.leave_type_id === oldBalance.leave_type_id &&
            p.can_carry_forward === true
        )

        if (policy) {
          // Calculate carry-forward amount (respecting max_carry_forward_days)
          const carryAmount = this.formatDecimalValue(
            Math.min(oldBalance.available_balance, policy.max_carry_forward_days)
          );

          if (carryAmount > 0) {
            // Check if balance record already exists for new year
            const existingBalance = await StaffLeaveBalance.query()
              .where('staff_id', oldBalance.staff_id)
              .andWhere('leave_type_id', oldBalance.leave_type_id)
              .andWhere('academic_year', newYear)
              .first()

            if (existingBalance) {
              // Update existing balance
              const totalLeaves = this.formatDecimalValue(policy.annual_quota + carryAmount);
              const availableBalance = this.formatDecimalValue(existingBalance.available_balance + carryAmount);

              await existingBalance.merge({
                carried_forward: carryAmount,
                total_leaves: totalLeaves,
                available_balance: availableBalance
              }).save()
            } else {
              // Create new balance
              await StaffLeaveBalance.create({
                staff_id: oldBalance.staff_id,
                leave_type_id: oldBalance.leave_type_id,
                academic_year: newYear,
                total_leaves: policy.annual_quota + carryAmount,
                carried_forward: carryAmount,
                used_leaves: 0,
                pending_leaves: 0,
                available_balance: policy.annual_quota + carryAmount
              }, { client: trx })
            }
          }
        }
      }

      await trx.commit()

      return ctx.response.status(200).json({
        message: 'Leave carry-forward processed successfully',
      })
    } catch (error) {
      await trx.rollback()
      return ctx.response.status(500).json({
        message: error.message,
      })
    }
  }

  async getLeaveApplicationLogs(ctx: HttpContext) {
    const leave_application_id = ctx.params.id

    // Check if application exists and user has access
    const application = await StaffLeaveApplication.query()
      .where('id', leave_application_id)
      .first()

    if (!application) {
      return ctx.response.status(404).json({
        message: 'Leave application not found',
      })
    }

    // Check if user has permission to view logs
    const isOwner = ctx.auth.user!.staff_id === application.staff_id
    const isAdmin = [1, 2, 3, 7, 8, 11].includes(ctx.auth.user!.role_id)

    if (!isOwner && !isAdmin) {
      return ctx.response.status(403).json({
        message: 'You are not authorized to view these logs',
      })
    }

    // Get logs with user details
    const logs = await LeaveLog.query()
      .select([
        'leave_logs.*',
        'users.first_name as performed_by_first_name',
        'users.last_name as performed_by_last_name',
        'users.role_id as performed_by_role'
      ])
      .join('users', 'leave_logs.performed_by', 'users.id')
      .where('leave_logs.leave_application_id', leave_application_id)
      .orderBy('leave_logs.created_at', 'desc')

    return ctx.response.status(200).json(logs)
  }

  async withdrawLeaveApplication(ctx: HttpContext) {
    const uuid = ctx.params.uuid

    // Get the leave application
    const leaveApplication = await StaffLeaveApplication.query()
      .where('uuid', uuid)
      .first()

    if (!leaveApplication) {
      return ctx.response.status(404).json({
        message: 'Leave application not found',
      })
    }

    // Check if user is authorized to withdraw this leave
    const isStaffOwner = leaveApplication.staff_id === ctx.auth.user!.staff_id
    const isAdmin = [1, 2, 3, 7, 8, 11].includes(ctx.auth.user!.role_id)

    if (!isStaffOwner && !isAdmin) {
      return ctx.response.status(403).json({
        message: 'You are not authorized to withdraw this leave application',
      })
    }

    // Validate if leave can be withdrawn (must be in pending status)
    if (leaveApplication.status !== 'pending') {
      return ctx.response.status(400).json({
        message: 'Only pending leave applications can be withdrawn',
      })
    }

    const payload = await ValidatorForCancelApplication.validate(ctx.request.body())

    const trx = await db.transaction()
    try {
      // Get current status before updating
      const currentStatus = leaveApplication.status

      // Update leave application status
      await leaveApplication.merge({
        status: 'cancelled',
        remarks: payload.remarks,
      }).useTransaction(trx).save()

      // Get the leave balance
      const leaveBalance = await StaffLeaveBalance.query()
        .where('staff_id', leaveApplication.staff_id)
        .andWhere('leave_type_id', leaveApplication.leave_type_id)
        .andWhere('academic_year', leaveApplication.academic_year)
        .orderBy('id', 'desc')
        .first()

      if (leaveBalance) {
        if (currentStatus === 'pending') {
          // If the leave was pending, return the days to available balance
          // and remove from pending
          const pendingLeaves = this.formatDecimalValue(
            Math.max(0, leaveBalance.pending_leaves - leaveApplication.number_of_days)
          )
          const availableBalance = this.formatDecimalValue(
            leaveBalance.available_balance + leaveApplication.number_of_days
          )

          await leaveBalance.merge({
            pending_leaves: pendingLeaves,
            available_balance: availableBalance
          }).useTransaction(trx).save()
        } else if (currentStatus === 'approved') {
          // If the leave was already approved, reduce used_leaves and 
          // return the days to available balance
          const usedLeaves = this.formatDecimalValue(
            Math.max(0, leaveBalance.used_leaves - leaveApplication.number_of_days)
          )
          const availableBalance = this.formatDecimalValue(
            leaveBalance.available_balance + leaveApplication.number_of_days
          )

          await leaveBalance.merge({
            used_leaves: usedLeaves,
            available_balance: availableBalance
          }).useTransaction(trx).save()
        }
        // If it was already rejected or cancelled, no balance update needed
      }

      // Log the action
      await LeaveLog.create({
        leave_application_id: leaveApplication.id,
        action: 'withdraw',
        status: 'cancelled',
        performed_by: ctx.auth.user?.id,
        remarks: payload.remarks || `Leave withdrawn from ${currentStatus} status`,
      }, { client: trx })

      await trx.commit()

      return ctx.response.status(200).json({
        message: 'Leave application withdrawn successfully',
        application: leaveApplication,
      })
    } catch (error) {
      await trx.rollback()
      return ctx.response.status(500).json({
        message: error.message,
      })
    }
  }

  /**
   * Helper method to format decimal values to ensure database compatibility
   * @param value The numeric value to format
   * @param decimals Number of decimal places (default: 2)
   */
  private formatDecimalValue(value: any, decimals: number = 2): number {
    // Ensure value is a number before using toFixed
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return 0; // Return 0 for non-numeric values
    }
    return parseFloat(numValue.toFixed(decimals));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // COMP OFF METHODS
  // ──────────────────────────────────────────────────────────────────────────

  async submitCompOffRequest(ctx: HttpContext) {
    try {
      const user = ctx.auth.user!
      const staff_id = user.staff_id || ctx.request.input('staff_id')
      if (!staff_id) {
        return ctx.response.status(403).json({ message: 'Staff profile is required to submit Comp Off request.' })
      }

      const payload = await CreateCompOffRequestValidator.validate(ctx.request.body())
      const workedDate = DateTime.fromISO(payload.worked_date)
      const today = DateTime.now().endOf('day')

      if (workedDate > today) {
        return ctx.response.status(400).json({ message: 'Comp Off request is only allowed for past or current dates.' })
      }

      // Prevent duplicate pending/approved request for same worked_date
      const existing = await CompOffRequest.query()
        .where('staff_id', staff_id)
        .where('worked_date', payload.worked_date)
        .whereIn('status', ['pending', 'approved'])
        .first()

      if (existing) {
        return ctx.response.status(409).json({ message: 'A Comp Off request for this date already exists.' })
      }

      const creditedDays = payload.day_type === 'half_day' ? 0.5 : 1.0

      const compOff = await CompOffRequest.create({
        uuid: uuidv4(),
        staff_id: staff_id,
        school_id: user.school_id || 1,
        academic_year: ctx.request.input('academic_year') || undefined,
        worked_date: payload.worked_date,
        day_type: payload.day_type,
        credited_days: creditedDays,
        reason: payload.reason,
        description: payload.description ?? null,
        status: 'pending',
      })

      return ctx.response.status(201).json({
        message: 'Comp Off request submitted successfully',
        data: compOff,
      })
    } catch (error) {
      return ctx.response.status(400).json({ message: error.message || 'Failed to submit Comp Off request' })
    }
  }

  async fetchStaffCompOffRequests(ctx: HttpContext) {
    try {
      const user = ctx.auth.user!
      const staff_id = ctx.params.staff_id || user.staff_id
      if (!staff_id) {
        return ctx.response.status(400).json({ message: 'Staff ID is required.' })
      }

      const requests = await CompOffRequest.query()
        .where('staff_id', staff_id)
        .preload('approved_by_user')
        .orderBy('created_at', 'desc')

      return ctx.response.status(200).json({ data: requests })
    } catch (error) {
      return ctx.response.status(500).json({ message: 'Failed to fetch Comp Off requests', error: error.message })
    }
  }

  async fetchCompOffRequestsForAdmin(ctx: HttpContext) {
    try {
      const user = ctx.auth.user!
      const school_id = user.school_id || 1
      const statusFilter = ctx.request.input('status')

      let query = CompOffRequest.query()
        .where('school_id', school_id)
        .preload('staff')
        .preload('approved_by_user')
        .orderBy('created_at', 'desc')

      if (statusFilter && statusFilter !== 'all') {
        query = query.where('status', statusFilter)
      }

      const requests = await query

      return ctx.response.status(200).json({ data: requests })
    } catch (error) {
      return ctx.response.status(500).json({ message: 'Failed to fetch admin Comp Off requests', error: error.message })
    }
  }

  async processCompOffRequest(ctx: HttpContext) {
    const trx = await db.transaction()
    try {
      const { uuid } = ctx.params
      const compOff = await CompOffRequest.query({ client: trx })
        .where('uuid', uuid)
        .preload('staff')
        .first()

      if (!compOff) {
        await trx.rollback()
        return ctx.response.status(404).json({ message: 'Comp Off request not found.' })
      }

      if (compOff.status !== 'pending') {
        await trx.rollback()
        return ctx.response.status(400).json({ message: `Comp Off request has already been ${compOff.status}.` })
      }

      const payload = await ProcessCompOffRequestValidator.validate(ctx.request.body())
      const adminUser = ctx.auth.user!

      compOff.status = payload.status
      compOff.approved_by = adminUser.id
      compOff.admin_remarks = payload.admin_remarks ?? null
      await compOff.useTransaction(trx).save()

      if (payload.status === 'approved') {
        // Find or create 'Comp Off' leave type master
        let compOffLeaveType = await LeaveTypeMaster.query({ client: trx })
          .where('school_id', compOff.school_id)
          .where('leave_type_name', 'Comp Off')
          .first()

        if (!compOffLeaveType) {
          compOffLeaveType = await LeaveTypeMaster.create(
            {
              school_id: compOff.school_id,
              leave_type_name: 'Comp Off',
              academic_year: compOff.academic_year || 1,
              is_paid: true,
              affects_payroll: false,
              requires_proof: false,
              is_active: true,
            },
            { client: trx }
          )
        }

        // Credit the staff leave balance for Comp Off
        let leaveBalance = await StaffLeaveBalance.query({ client: trx })
          .where('staff_id', compOff.staff_id)
          .where('leave_type_id', compOffLeaveType.id)
          .orderBy('id', 'desc')
          .first()

        const creditedDays = Number(compOff.credited_days)

        if (leaveBalance) {
          const newTotal = this.formatDecimalValue(Number(leaveBalance.total_leaves) + creditedDays)
          const newAvailable = this.formatDecimalValue(Number(leaveBalance.available_balance) + creditedDays)
          await leaveBalance
            .merge({
              total_leaves: newTotal,
              available_balance: newAvailable,
            })
            .useTransaction(trx)
            .save()
        } else {
          await StaffLeaveBalance.create(
            {
              staff_id: compOff.staff_id,
              leave_type_id: compOffLeaveType.id,
              academic_year: compOff.academic_year || 1,
              total_leaves: creditedDays,
              used_leaves: 0,
              pending_leaves: 0,
              carried_forward: 0,
              available_balance: creditedDays,
            },
            { client: trx }
          )
        }
      }

      await trx.commit()

      return ctx.response.status(200).json({
        message: `Comp Off request ${payload.status} successfully.`,
        data: compOff,
      })
    } catch (error) {
      await trx.rollback()
      return ctx.response.status(500).json({ message: 'Error processing Comp Off request', error: error.message })
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LEAVE REPORT METHODS
  // ──────────────────────────────────────────────────────────────────────────

  async fetchTeachersLeaveSummaryReport(ctx: HttpContext) {
    try {
      const user = ctx.auth.user!
      const role_id = Number(user.role_id)
      if (![1, 2, 7, 8, 11].includes(role_id)) {
        return ctx.response.status(403).json({
          message: 'Access denied. Leave reports are only accessible to Admin or Super Admin users.',
        })
      }

      const school_id = user.school_id || 1
      const academic_year = ctx.request.input('academic_year')
      const staff_type = ctx.request.input('type', 'all') // 'all' | 'teaching' | 'non-teaching' | 'hospital'

      // Fetch all active leave types for school
      let leaveTypesQuery = LeaveTypeMaster.query().where('school_id', school_id)
      if (academic_year) {
        leaveTypesQuery = leaveTypesQuery.where((q) => {
          q.where('academic_year', academic_year).orWhereNull('academic_year')
        })
      }
      let leaveTypes = await leaveTypesQuery
      if (leaveTypes.length === 0) {
        leaveTypes = await LeaveTypeMaster.query().where('school_id', school_id)
      }

      // Fetch staff for school
      let staffQuery = Staff.query()
        .where('school_id', school_id)
        .preload('department_details')
        .preload('role_type')
        .orderBy('first_name', 'asc')

      if (staff_type === 'teaching') {
        staffQuery = staffQuery.where('is_teaching_role', true)
      } else if (staff_type === 'hospital') {
        staffQuery = staffQuery.where('staff_type', 'Hospital Staff')
      } else if (staff_type === 'non-teaching') {
        staffQuery = staffQuery.where('is_teaching_role', false).where((q) => {
          q.whereNull('staff_type').orWhereNot('staff_type', 'Hospital Staff')
        })
      }

      const staffList = await staffQuery

      // Fetch all leave policies for school
      let policiesQuery = LeavePolicies.query().where('school_id', school_id)
      if (academic_year) {
        policiesQuery = policiesQuery.where((q) => {
          q.where('academic_year', academic_year).orWhereNull('academic_year')
        })
      }
      const allPolicies = await policiesQuery

      // Fetch all balances
      let balancesQuery = StaffLeaveBalance.query().preload('leave_type')
      if (academic_year) {
        balancesQuery = balancesQuery.where('academic_year', academic_year)
      }
      const allBalances = await balancesQuery

      // Group balances by staff_id
      const balancesByStaff = new Map<number, StaffLeaveBalance[]>()
      allBalances.forEach((b) => {
        const list = balancesByStaff.get(b.staff_id) || []
        list.push(b)
        balancesByStaff.set(b.staff_id, list)
      })

      // Fetch actual approved leave applications totals by staff and leave type
      const approvedApps = await db.from('staff_leave_applications')
        .where('status', 'approved')
        .select('staff_id', 'leave_type_id')
        .sum('number_of_days as total_used')
        .groupBy('staff_id', 'leave_type_id')

      const approvedUsageMap = new Map<string, number>()
      approvedApps.forEach((row: any) => {
        approvedUsageMap.set(`${row.staff_id}-${row.leave_type_id}`, Number(row.total_used) || 0)
      })

      const summary = await Promise.all(
        staffList.map(async (st) => {
          const staffBalances = balancesByStaff.get(st.id) || []

          let stApplicableLeaveTypeIds: Set<number>
          if (staffBalances.length > 0) {
            const leaveTypeIds = staffBalances.map((b) => b.leave_type_id)
            const rawPolicies = allPolicies.filter((p) => leaveTypeIds.includes(p.leave_type_id))
            const applicableRaw = rawPolicies.filter((p) => this.isPolicyApplicableToStaff(p, st))
            stApplicableLeaveTypeIds = new Set(applicableRaw.map((p) => p.leave_type_id))
            if (stApplicableLeaveTypeIds.size === 0) {
              stApplicableLeaveTypeIds = new Set(leaveTypeIds)
            }
          } else {
            const applicablePolicies = await this.getApplicablePoliciesForStaff(
              st,
              school_id,
              Number(academic_year) || new Date().getFullYear()
            )
            stApplicableLeaveTypeIds = new Set(applicablePolicies.map((p) => p.leave_type_id))
          }

          let totalTaken = 0
          let totalAvailable = 0
          const leaveBreakdown: Record<string, { used: number; total: number; available: number }> = {}

          leaveTypes.forEach((lt) => {
            const bal = staffBalances.find((b) => b.leave_type_id === lt.id)
            const actualApproved = approvedUsageMap.get(`${st.id}-${lt.id}`) || 0
            const isApplicable = stApplicableLeaveTypeIds.has(lt.id)

            let used = 0
            let total = 0
            let available = 0
            let pending = 0

            if (bal) {
              const dbUsed = Number(bal.used_leaves) || 0
              used = Math.max(dbUsed, actualApproved)
              if (isApplicable) {
                total = Number(bal.total_leaves) || 0
                pending = Number(bal.pending_leaves) || 0
                available = Number(bal.available_balance)
                if (available <= 0 && used < total) {
                  available = Math.max(0, this.formatDecimalValue(total - used - pending))
                }
              } else {
                total = used
                available = 0
              }
            } else if (isApplicable) {
              let policy = allPolicies.find(
                (p) => p.leave_type_id === lt.id && st.leave_template_id && p.leave_template_id === st.leave_template_id
              )
              if (!policy && st.staff_role_id) {
                policy = allPolicies.find((p) => p.leave_type_id === lt.id && p.staff_role_id === st.staff_role_id)
              }
              if (!policy) {
                policy = allPolicies.find((p) => p.leave_type_id === lt.id && this.isPolicyApplicableToStaff(p, st))
              }

              if (policy) {
                used = actualApproved
                total = Number(policy.annual_quota) || 0
                available = Math.max(0, total - used)
              } else if (actualApproved > 0) {
                used = actualApproved
                total = used
                available = 0
              }
            } else if (actualApproved > 0) {
              used = actualApproved
              total = used
              available = 0
            }

            if (isApplicable) {
              totalTaken += used
              totalAvailable += available
            }

            leaveBreakdown[lt.leave_type_name] = { used, total, available }
          })

          return {
            staff_id: st.id,
            first_name: st.first_name,
            middle_name: st.middle_name,
            last_name: st.last_name,
            full_name: `${st.first_name} ${st.last_name}`.trim(),
            employee_id: st.employee_code || (st as any).employee_id || (st as any).staff_code || `ST-${st.id}`,
            role: st.role_type?.role || 'Staff',
            staff_type: st.staff_type || (st.is_teaching_role ? 'Teaching' : 'Non-Teaching'),
            staff_category: st.staff_category || 'N/A',
            designation: st.designation || 'N/A',
            department: typeof st.department === 'string' && st.department.trim() ? st.department : st.department_details?.name || 'N/A',
            total_leaves_taken: totalTaken,
            total_leaves_available: totalAvailable,
            leave_breakdown: leaveBreakdown,
          }
        })
      )

      return ctx.response.status(200).json({
        leave_types: leaveTypes.map((lt) => ({ id: lt.id, name: lt.leave_type_name })),
        data: summary,
      })
    } catch (error: any) {
      return ctx.response.status(500).json({ message: 'Failed to generate leave summary report', error: error.message })
    }
  }

  async fetchIndividualTeacherLeaveReport(ctx: HttpContext) {
    try {
      const user = ctx.auth.user!
      const role_id = Number(user.role_id)
      if (![1, 2, 7, 8, 11].includes(role_id)) {
        return ctx.response.status(403).json({
          message: 'Access denied. Leave reports are only accessible to Admin or Super Admin users.',
        })
      }

      const staff_id = ctx.params.staff_id
      const academic_year = ctx.request.input('academic_year')
      if (!staff_id) {
        return ctx.response.status(400).json({ message: 'Staff ID is required.' })
      }

      const staff = await Staff.query()
        .where('id', staff_id)
        .preload('department_details')
        .first()

      if (!staff) {
        return ctx.response.status(404).json({ message: 'Staff member not found.' })
      }

      // Fetch policies explicitly matching this staff member
      let policyQuery = LeavePolicies.query()
        .preload('leave_type')
        .where('school_id', staff.school_id)
      if (academic_year) {
        policyQuery = policyQuery.where((q) => {
          q.where('academic_year', academic_year).orWhereNull('academic_year')
        })
      }
      if (staff.leave_template_id) {
        policyQuery = policyQuery.where('leave_template_id', staff.leave_template_id)
      } else if (staff.staff_role_id) {
        policyQuery = policyQuery.where('staff_role_id', staff.staff_role_id)
      } else {
        policyQuery = policyQuery.whereNull('leave_template_id').whereNull('staff_role_id')
      }
      const leavePolicies = await policyQuery

      // Fetch balances
      let balancesQuery = StaffLeaveBalance.query()
        .where('staff_id', staff_id)
        .preload('leave_type')
      if (academic_year) {
        balancesQuery = balancesQuery.where('academic_year', academic_year)
      }
      const existingBalances = await balancesQuery

      const combinedBalances = leavePolicies.map((policy) => {
        const bal = existingBalances.find((b) => b.leave_type_id === policy.leave_type_id)
        if (bal) {
          return bal
        }
        return {
          id: `policy-${policy.id}`,
          staff_id: Number(staff_id),
          leave_type_id: policy.leave_type_id,
          leave_type: policy.leave_type,
          total_leaves: policy.annual_quota,
          used_leaves: 0,
          pending_leaves: 0,
          carried_forward: 0,
          available_balance: policy.annual_quota,
        }
      })

      const allSchoolPolicies = await LeavePolicies.query().where('school_id', staff.school_id)
      const policyLeaveTypeIds = new Set(leavePolicies.map((p) => p.leave_type_id))
      const extraBalances = existingBalances.filter((b) => {
        if (policyLeaveTypeIds.has(b.leave_type_id)) return false
        const matchingPolicy = allSchoolPolicies.find((p) => p.leave_type_id === b.leave_type_id)
        if (matchingPolicy && !this.isPolicyApplicableToStaff(matchingPolicy, staff) && Number(b.used_leaves) === 0) {
          return false
        }
        return true
      })
      const finalBalances = [...combinedBalances, ...extraBalances]

      // Fetch applications
      const applications = await StaffLeaveApplication.query()
        .where('staff_id', staff_id)
        .preload('leave_type')
        .preload('approved_by_user')
        .orderBy('created_at', 'desc')

      // Fetch comp off requests
      const compOffs = await CompOffRequest.query()
        .where('staff_id', staff_id)
        .preload('approved_by_user')
        .orderBy('created_at', 'desc')

      return ctx.response.status(200).json({
        staff: {
          id: staff.id,
          first_name: staff.first_name,
          middle_name: staff.middle_name,
          last_name: staff.last_name,
          full_name: `${staff.first_name} ${staff.last_name}`.trim(),
          employee_id: (staff as any).employee_id || (staff as any).staff_code || `ST-${staff.id}`,
          department: typeof staff.department === 'string' && staff.department.trim() ? staff.department : staff.department_details?.name || 'N/A',
        },
        balances: finalBalances,
        applications,
        comp_off_requests: compOffs,
      })
    } catch (error: any) {
      return ctx.response.status(500).json({ message: 'Failed to fetch individual leave report', error: error.message })
    }
  }

  isPolicyApplicableToStaff(
    policy: { applicable_staff_type?: string | null } | null | undefined,
    staff: { staff_type?: string | null; is_teaching_role?: boolean }
  ): boolean {
    if (!policy || !policy.applicable_staff_type) return true // Global policy applies to all

    const staffTypeLower = (staff.staff_type || (staff.is_teaching_role ? 'teaching' : 'non-teaching')).toLowerCase()
    const policyAppTypeLower = (policy.applicable_staff_type || '').toLowerCase()

    // Hospital staff
    if (staffTypeLower.includes('hospital')) {
      return policyAppTypeLower.includes('hospital')
    }

    // Non-teaching staff
    if (staffTypeLower.includes('non-teaching') || staffTypeLower.includes('non teaching')) {
      return policyAppTypeLower.includes('non-teaching') || policyAppTypeLower.includes('non teaching')
    }

    // Teaching staff
    if (staffTypeLower.includes('teaching')) {
      if (policyAppTypeLower.includes('hospital') || policyAppTypeLower.includes('non-teaching') || policyAppTypeLower.includes('non teaching')) {
        return false
      }
      const isStaffNonVacational = staffTypeLower.includes('non vact') || staffTypeLower.includes('non-vact') || staffTypeLower.includes('non vacat')
      const isPolicyNonVacational = policyAppTypeLower.includes('non vact') || policyAppTypeLower.includes('non-vact') || policyAppTypeLower.includes('non vacat')
      const isStaffVacational = !isStaffNonVacational && (staffTypeLower.includes('vact') || staffTypeLower.includes('vacat'))
      const isPolicyVacational = !isPolicyNonVacational && (policyAppTypeLower.includes('vact') || policyAppTypeLower.includes('vacat'))

      if (isStaffNonVacational) return isPolicyNonVacational
      if (isStaffVacational) return isPolicyVacational
      return true
    }

    return policyAppTypeLower === staffTypeLower
  }

  /**
   * Fetch configured hierarchy rules and caliber definitions for school
   */
  async indexApprovalHierarchy(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id!
    const academic_year = ctx.request.input('academic_year')

    let query = LeaveApprovalHierarchy.query()
      .where('school_id', school_id)
      .preload('applicant_role')
      .preload('approver_role')
      .preload('department')
      .orderBy('priority', 'asc')
      .orderBy('id', 'asc')

    if (academic_year) {
      query.andWhere((q) => {
        q.where('academic_year', academic_year).orWhereNull('academic_year')
      })
    }

    const rules = await query

    const caliberDefinitions = [
      { level: 1, name: 'Level 1 - Admin / Management', description: 'Institutional Admins, Super Admins, Directors (Highest Caliber / Super Approver)' },
      { level: 2, name: 'Level 2 - Executive / Principal', description: 'Principal, Vice-Principal, Medical Superintendent' },
      { level: 3, name: 'Level 3 - Department Head (HOD)', description: 'Head of Department (HOD), Administrative Officer' },
      { level: 4, name: 'Level 4 - Faculty / Operational Staff', description: 'Professors, Readers, Lecturers, Clerks, Accountants, Lab Technicians' },
      { level: 5, name: 'Level 5 - Support Staff', description: 'Peons, Mess Staff, Hostel Staff, Ward Boys' },
    ]

    return ctx.response.status(200).json({
      rules,
      caliber_definitions: caliberDefinitions,
    })
  }

  /**
   * Create or update an approval hierarchy rule
   */
  async createOrUpdateHierarchyRule(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id!
    const body = ctx.request.body()

    const {
      id,
      academic_year,
      applicant_role_id,
      approver_role_id,
      department_id,
      require_same_department = true,
      min_approver_caliber = 2,
      priority = 1,
      is_active = true,
    } = body

    let rule: LeaveApprovalHierarchy

    if (id) {
      rule = await LeaveApprovalHierarchy.query()
        .where('id', id)
        .andWhere('school_id', school_id)
        .firstOrFail()

      rule.merge({
        academic_year: academic_year ? Number(academic_year) : null,
        applicant_role_id: applicant_role_id ? Number(applicant_role_id) : null,
        approver_role_id: approver_role_id ? Number(approver_role_id) : null,
        department_id: department_id ? Number(department_id) : null,
        require_same_department: Boolean(require_same_department),
        min_approver_caliber: Number(min_approver_caliber),
        priority: Number(priority),
        is_active: Boolean(is_active),
      })
      await rule.save()
    } else {
      rule = await LeaveApprovalHierarchy.create({
        school_id,
        academic_year: academic_year ? Number(academic_year) : null,
        applicant_role_id: applicant_role_id ? Number(applicant_role_id) : null,
        approver_role_id: approver_role_id ? Number(approver_role_id) : null,
        department_id: department_id ? Number(department_id) : null,
        require_same_department: Boolean(require_same_department),
        min_approver_caliber: Number(min_approver_caliber),
        priority: Number(priority),
        is_active: Boolean(is_active),
      })
    }

    await rule.load('applicant_role')
    await rule.load('approver_role')
    await rule.load('department')

    return ctx.response.status(200).json({
      message: `Hierarchy rule ${id ? 'updated' : 'created'} successfully`,
      data: rule,
    })
  }

  /**
   * Delete an approval hierarchy rule
   */
  async deleteHierarchyRule(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id!
    const rule_id = ctx.params.id

    const rule = await LeaveApprovalHierarchy.query()
      .where('id', rule_id)
      .andWhere('school_id', school_id)
      .firstOrFail()

    await rule.delete()

    return ctx.response.status(200).json({
      message: 'Hierarchy rule deleted successfully',
    })
  }

  /**
   * Fetch staff members and their hierarchy/approver mappings
   */
  async indexStaffHierarchyMappings(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id!
    const page = Number(ctx.request.input('page', 1))
    const limit = Number(ctx.request.input('limit', 15))
    const search = ctx.request.input('search', '').trim()
    const department_id = ctx.request.input('department_id')
    const role_id = ctx.request.input('role_id')
    const caliber_level = ctx.request.input('caliber_level')
    const has_approver = ctx.request.input('has_approver')

    let query = Staff.query()
      .where('school_id', school_id)
      .preload('department_details')
      .preload('role_type')
      .preload('reporting_manager', (managerQuery) => {
        managerQuery.preload('role_type').preload('department_details')
      })
      .orderBy('first_name', 'asc')

    if (search) {
      query.andWhere((q) => {
        q.whereILike('first_name', `%${search}%`)
          .orWhereILike('last_name', `%${search}%`)
          .orWhereILike('employee_code', `%${search}%`)
          .orWhereILike('email', `%${search}%`)
      })
    }

    if (department_id && department_id !== 'all') {
      query.andWhere('department_id', department_id)
    }

    if (role_id && role_id !== 'all') {
      query.andWhere('staff_role_id', role_id)
    }

    if (caliber_level && caliber_level !== 'all') {
      query.andWhere('caliber_level', caliber_level)
    }

    if (has_approver === 'assigned') {
      query.whereNotNull('reporting_to_staff_id')
    } else if (has_approver === 'unassigned') {
      query.whereNull('reporting_to_staff_id')
    }

    if (ctx.request.input('page') === 'all') {
      const allStaff = await query
      return ctx.response.status(200).json(allStaff)
    }

    const paginatedStaff = await query.paginate(page, limit)
    return ctx.response.status(200).json(paginatedStaff)
  }

  /**
   * Update an individual staff member's direct approver and/or caliber level
   */
  async updateStaffApprover(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id!
    const { staff_id, reporting_to_staff_id, caliber_level } = ctx.request.body()

    if (!staff_id) {
      return ctx.response.status(400).json({ message: 'staff_id is required' })
    }

    if (reporting_to_staff_id && Number(staff_id) === Number(reporting_to_staff_id)) {
      return ctx.response.status(400).json({ message: 'Staff cannot be assigned as their own approver' })
    }

    const staffMember = await Staff.query()
      .where('id', staff_id)
      .andWhere('school_id', school_id)
      .firstOrFail()

    if (reporting_to_staff_id !== undefined) {
      staffMember.reporting_to_staff_id = reporting_to_staff_id ? Number(reporting_to_staff_id) : null
    }

    if (caliber_level !== undefined) {
      staffMember.caliber_level = caliber_level ? Number(caliber_level) : null
    }

    await staffMember.save()

    await staffMember.load('department_details')
    await staffMember.load('role_type')
    await staffMember.load('reporting_manager')

    return ctx.response.status(200).json({
      message: 'Staff approver hierarchy updated successfully',
      data: staffMember,
    })
  }

  /**
   * Bulk assign a direct approver by department, role, or list of staff IDs
   */
  async bulkAssignApprover(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id!
    const { approver_staff_id, department_id, staff_role_id, staff_ids } = ctx.request.body()

    if (!approver_staff_id) {
      return ctx.response.status(400).json({ message: 'approver_staff_id is required' })
    }

    let updateQuery = Staff.query()
      .where('school_id', school_id)
      .andWhereNot('id', approver_staff_id) // Do not assign manager to themselves

    let conditionsApplied = false

    if (Array.isArray(staff_ids) && staff_ids.length > 0) {
      updateQuery.whereIn('id', staff_ids)
      conditionsApplied = true
    } else {
      if (department_id && department_id !== 'all') {
        updateQuery.andWhere('department_id', department_id)
        conditionsApplied = true
      }
      if (staff_role_id && staff_role_id !== 'all') {
        updateQuery.andWhere('staff_role_id', staff_role_id)
        conditionsApplied = true
      }
    }

    if (!conditionsApplied) {
      return ctx.response.status(400).json({
        message: 'Please specify a department, role, or list of staff IDs to bulk assign',
      })
    }

    const affected = await updateQuery.update({
      reporting_to_staff_id: approver_staff_id,
    })

    return ctx.response.status(200).json({
      message: `Approver assigned successfully to ${affected} staff members`,
      count: affected,
    })
  }

  /**
   * Get list of staff who are eligible to be assigned as higher caliber approvers
   */
  async getEligibleApprovers(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id!

    const approvers = await Staff.query()
      .where('school_id', school_id)
      .andWhere('is_active', true)
      .where((q) => {
        // Caliber 1 (Admin), 2 (Principal), 3 (HOD) or any staff with higher roles
        q.whereIn('caliber_level', [1, 2, 3])
          .orWhereIn('staff_role_id', (roleQ) => {
            roleQ.from('staff_role_master').select('id').whereRaw('LOWER(role) LIKE ? OR LOWER(role) LIKE ? OR LOWER(role) LIKE ?', ['%principal%', '%head%', '%hod%'])
          })
          .orWhereRaw('LOWER(designation) LIKE ? OR LOWER(designation) LIKE ? OR LOWER(designation) LIKE ?', ['%principal%', '%head%', '%hod%'])
      })
      .preload('department_details')
      .preload('role_type')
      .orderBy('caliber_level', 'asc')
      .orderBy('first_name', 'asc')

    // Format clean list
    const formatted = approvers.map((s) => ({
      id: s.id,
      full_name: `${s.first_name || ''} ${s.middle_name || ''} ${s.last_name || ''}`.replace(/\s+/g, ' ').trim(),
      employee_code: s.employee_code,
      email: s.email,
      designation: s.designation || s.role_type?.role || 'Staff',
      caliber_level: s.caliber_level || 3,
      department_id: s.department_id,
      department_name: s.department_details?.name || 'General',
    }))

    return ctx.response.status(200).json(formatted)
  }
}


