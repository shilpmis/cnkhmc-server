import { HttpContext } from '@adonisjs/core/http'
import StaffAttendanceMaster from '#models/StaffAttendanceMaster'
import StaffAttendanceEditRequest from '#models/StaffAttendanceEditRequest'
import Staff from '#models/Staff'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { ValidatorForAdminMarkAttendance, ValidatorForCheckIn, ValidatorForCheckOut, ValidatorForEditRequest } from '#validators/staffAttendance'

export default class StaffAttendanceController {
  /**
   * Staff self check-in
   */
  async checkIn(ctx: HttpContext) {
    const staffId = ctx.auth.user!.staff_id
    
    if (!staffId) {
      return ctx.response.status(400).json({
        message: 'Only staff members can check in',
      })
    }

    try {
      const payload = await ValidatorForCheckIn.validate(ctx.request.body())
      
      // Get current date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0]
      
      // Check if check-in already exists for today
      const existingAttendance = await StaffAttendanceMaster.query()
        .where('staff_id', staffId)
        .where('attendance_date', today)
        .first()
      
      if (existingAttendance && existingAttendance.check_in_time) {
        return ctx.response.status(400).json({
          message: 'You have already checked in today',
        })
      }

      // Validate time is not in future
      console.log("Check-in time payload:", payload.check_in_time);
      // const checkInTime = DateTime.fromFormat(payload.check_in_time, 'HH:mm')
      // const currentTime = DateTime.now()
      
      // if (checkInTime > currentTime) {
      //   return ctx.response.status(400).json({
      //     message: 'Cannot check-in with future time',
      //   })
      // }

      const trx = await db.transaction()
      
      try {
        // Create or update attendance record
        if (existingAttendance) {
          await existingAttendance.merge({
            check_in_time: payload.check_in_time,
            status: 'present',
            is_self_marked: true,
            marked_by: ctx.auth.user!.id,
          }).useTransaction(trx).save()
        } else {
          await StaffAttendanceMaster.create({
            staff_id: staffId,
            academic_year: payload.academic_year as number as number,
            attendance_date: new Date(today),
            check_in_time: payload.check_in_time,
            status: 'present',
            is_self_marked: true,
            marked_by: ctx.auth.user!.id,
          }, { client: trx })
        }
        
        await trx.commit()
        
        return ctx.response.status(200).json({
          message: 'Check-in successful',
        })
      } catch (error) {
        await trx.rollback()
        throw error
      }
    } catch (error) {
      return ctx.response.status(500).json({
        message: 'Error during check-in',
        error: error.message,
      })
    }
  }

  /**
   * Staff self check-out
   */
  async checkOut(ctx: HttpContext) {
    const staffId = ctx.auth.user!.staff_id
    
    if (!staffId) {
      return ctx.response.status(400).json({
        message: 'Only staff members can check out',
      })
    }

    try {
      const payload = await ValidatorForCheckOut.validate(ctx.request.body())
      
      // Get current date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0]
      
      // Check if attendance record exists
      const existingAttendance = await StaffAttendanceMaster.query()
        .where('staff_id', staffId)
        .where('attendance_date', today)
        .first()
      
      if (!existingAttendance) {
        return ctx.response.status(400).json({
          message: 'You need to check in before checking out',
        })
      }

      if (existingAttendance.check_out_time) {
        return ctx.response.status(400).json({
          message: 'You have already checked out today',
        })
      }

      // Validate check-out time is after check-in time
      if (!existingAttendance.check_in_time) {
        return ctx.response.status(400).json({
          message: 'You need to check in before checking out',
        })
      }

      // const checkInTime = DateTime.fromFormat(existingAttendance.check_in_time, 'HH:mm')
      // const checkOutTime = DateTime.fromFormat(payload.check_out_time, 'HH:mm')
      // const currentTime = DateTime.now()
      
      // if (checkOutTime < checkInTime) {
      //   return ctx.response.status(400).json({
      //     message: 'Check-out time cannot be before check-in time',
      //   })
      // }
      
      // if (checkOutTime > currentTime) {
      //   return ctx.response.status(400).json({
      //     message: 'Cannot check-out with future time',
      //   })
      // }

      const trx = await db.transaction()
      
      try {
        await existingAttendance.merge({
          check_out_time: payload.check_out_time,
        }).useTransaction(trx).save()
        
        await trx.commit()
        
        return ctx.response.status(200).json({
          message: 'Check-out successful',
        })
      } catch (error) {
        await trx.rollback()
        throw error
      }
    } catch (error) {
      return ctx.response.status(500).json({
        message: 'Error during check-out',
        error: error.message,
      })
    }
  }

  /**
   * Admin marking staff attendance
   */
  async adminMarkAttendance(ctx: HttpContext) {
    // Only admins can mark attendance for others
    if (![1, 2, 3].includes(ctx.auth.user!.role_id)) {
      return ctx.response.status(403).json({
        message: 'Only administrators can mark attendance for staff',
      })
    }

    try {
      const payload = await ValidatorForAdminMarkAttendance.validate(ctx.request.body())
      
      // Validate date is not in future
      const attendanceDate = DateTime.fromISO(payload.attendance_date)
      const today = DateTime.now().startOf('day')
      
      if (attendanceDate > today) {
        return ctx.response.status(400).json({
          message: 'Cannot mark attendance for future dates',
        })
      }
      
      // If check-in and check-out times are provided, validate them
      if (payload.check_in_time && payload.check_out_time) {
        const checkInTime = DateTime.fromFormat(payload.check_in_time, 'HH:mm')
        const checkOutTime = DateTime.fromFormat(payload.check_out_time, 'HH:mm')
        
        if (checkOutTime < checkInTime) {
          return ctx.response.status(400).json({
            message: 'Check-out time cannot be before check-in time',
          })
        }
      }

      // Check if staff exists
      const staff = await Staff.query()
        .where('id', payload.staff_id)
        .where('school_id', ctx.auth.user!.school_id as number)
        .first()
      
      if (!staff) {
        return ctx.response.status(404).json({
          message: 'Staff not found',
        })
      }

      // Check if attendance record already exists
      const existingAttendance = await StaffAttendanceMaster.query()
        .where('staff_id', payload.staff_id)
        .where('attendance_date', payload.attendance_date)
        .first()

      const trx = await db.transaction()
      
      try {
        if (existingAttendance) {
          await existingAttendance.merge({
            check_in_time: payload.check_in_time || existingAttendance.check_in_time,
            check_out_time: payload.check_out_time || existingAttendance.check_out_time,
            status: payload.status || existingAttendance.status,
            remarks: payload.remarks || existingAttendance.remarks,
            marked_by: ctx.auth.user!.id,
            is_self_marked: false,
          }).useTransaction(trx).save()
        } else {
          await StaffAttendanceMaster.create({
            staff_id: payload.staff_id,
            academic_year: payload.academic_year as number as number,
            attendance_date: new Date(payload.attendance_date),
            check_in_time: payload.check_in_time,
            check_out_time: payload.check_out_time,
            status: payload.status || 'present',
            remarks: payload.remarks,
            marked_by: ctx.auth.user!.id,
            is_self_marked: false,
          }, { client: trx })
        }
        
        await trx.commit()
        
        return ctx.response.status(200).json({
          message: 'Staff attendance marked successfully',
        })
      } catch (error) {
        await trx.rollback()
        throw error
      }
    } catch (error) {
      return ctx.response.status(500).json({
        message: 'Error marking staff attendance',
        error: error.message,
      })
    }
  }

  /**
   * Request edit for attendance
   */
  async requestEdit(ctx: HttpContext) {
    const staffId = ctx.auth.user!.staff_id
    
    if (!staffId) {
      return ctx.response.status(400).json({
        message: 'Only staff members can request attendance edits',
      })
    }

    try {
      const payload = await ValidatorForEditRequest.validate(ctx.request.body())
      
      // Check if attendance record exists
      const attendance = await StaffAttendanceMaster.query()
        .where('id', payload.staff_attendance_id)
        .first()
      
      if (!attendance) {
        return ctx.response.status(404).json({
          message: 'Attendance record not found',
        })
      }
      
      // Verify staff is editing their own record
      if (attendance.staff_id !== staffId) {
        return ctx.response.status(403).json({
          message: 'You can only request edits for your own attendance',
        })
      }
      
      // Check for existing pending requests
      const existingRequest = await StaffAttendanceEditRequest.query()
        .where('staff_attendance_id', payload.staff_attendance_id)
        .where('status', 'pending')
        .first()
      
      if (existingRequest) {
        return ctx.response.status(400).json({
          message: 'You already have a pending edit request for this record',
        })
      }

      // Validate times if provided
      if (payload.requested_check_in_time && payload.requested_check_out_time) {
        const checkInTime = DateTime.fromFormat(payload.requested_check_in_time, 'HH:mm')
        const checkOutTime = DateTime.fromFormat(payload.requested_check_out_time, 'HH:mm')
        
        if (checkOutTime < checkInTime) {
          return ctx.response.status(400).json({
            message: 'Check-out time cannot be before check-in time',
          })
        }
      }

      const trx = await db.transaction()
      
      try {
        const editRequest = await StaffAttendanceEditRequest.create({
          staff_attendance_id: payload.staff_attendance_id,
          requested_check_in_time: payload.requested_check_in_time,
          requested_check_out_time: payload.requested_check_out_time,
          reason: payload.reason,
          status: 'pending',
          requested_by: ctx.auth.user!.id,
        }, { client: trx })
        
        await trx.commit()
        
        return ctx.response.status(201).json({
          message: 'Edit request submitted successfully',
          request: editRequest,
        })
      } catch (error) {
        await trx.rollback()
        throw error
      }
    } catch (error) {
      return ctx.response.status(500).json({
        message: 'Error submitting edit request',
        error: error.message,
      })
    }
  }

  /**
   * Admin approve/reject edit request
   */
  async processEditRequest(ctx: HttpContext) {
    // Only admins can process edit requests
    if (![1, 2, 3].includes(ctx.auth.user!.role_id)) {
      return ctx.response.status(403).json({
        message: 'Only administrators can process edit requests',
      })
    }

    const { id } = ctx.params
    const { status, admin_remarks } = ctx.request.body()
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return ctx.response.status(400).json({
        message: 'Invalid status provided',
      })
    }
    
    if (!admin_remarks) {
      return ctx.response.status(400).json({
        message: 'Admin remarks are required',
      })
    }

    try {
      const editRequest = await StaffAttendanceEditRequest.query()
        .where('id', id)
        .where('status', 'pending')
        .preload('attendance')
        .first()
      
      if (!editRequest) {
        return ctx.response.status(404).json({
          message: 'Edit request not found or already processed',
        })
      }

      const trx = await db.transaction()
      
      try {
        // Update the request status
        await editRequest.merge({
          status,
          admin_remarks,
          actioned_by: ctx.auth.user!.id,
          actioned_at: DateTime.now(),
        }).useTransaction(trx).save()
        
        // If approved, update the attendance record
        if (status === 'approved') {
          await editRequest.attendance.merge({
            check_in_time: editRequest.requested_check_in_time || editRequest.attendance.check_in_time,
            check_out_time: editRequest.requested_check_out_time || editRequest.attendance.check_out_time,
          }).useTransaction(trx).save()
        }
        
        await trx.commit()
        
        return ctx.response.status(200).json({
          message: `Edit request ${status}`,
        })
      } catch (error) {
        await trx.rollback()
        throw error
      }
    } catch (error) {
      return ctx.response.status(500).json({
        message: 'Error processing edit request',
        error: error.message,
      })
    }
  }

  /**
   * Get staff attendance records
   */
  async getStaffAttendance(ctx: HttpContext) {
    let staffId = ctx.params.staff_id
    const year = ctx.request.input('year', new Date().getFullYear())
    const month = ctx.request.input('month', new Date().getMonth() + 1)
    
    // If staff_id is 'me', use the authenticated user's staff_id
    if (staffId === 'me') {
      staffId = ctx.auth.user!.staff_id
      
      if (!staffId) {
        return ctx.response.status(400).json({
          message: 'You are not associated with any staff account',
        })
      }
    } else {
      // Check permissions for viewing others' attendance
      if (![1, 2, 3].includes(ctx.auth.user!.role_id) && 
          staffId !== ctx.auth.user!.staff_id) {
        return ctx.response.status(403).json({
          message: 'You can only view your own attendance records',
        })
      }
    }

    try {
      // Build date range for the query
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]
      
      // Get attendance records
      const attendanceRecords = await StaffAttendanceMaster.query()
        .where('staff_id', staffId)
        .whereBetween('attendance_date', [startDate, endDate])
        .preload('editRequests', (query) => {
          query.where('status', 'pending')
        })
        .orderBy('attendance_date', 'asc')
      
      // Get staff details
      const staff = await Staff.query()
        .select('id', 'first_name', 'middle_name', 'last_name', 'employee_code')
        .where('id', staffId)
        .first()
      
      // Calculate statistics
      const totalWorkingDays = DateTime.fromISO(endDate).day
      const presentDays = attendanceRecords.filter(r => r.status === 'present').length
      const absentDays = attendanceRecords.filter(r => r.status === 'absent').length
      const lateDays = attendanceRecords.filter(r => r.status === 'late').length
      const halfDays = attendanceRecords.filter(r => r.status === 'half_day').length
      const unmarkedDays = totalWorkingDays - (presentDays + absentDays + lateDays + halfDays)
      
      return ctx.response.status(200).json({
        staff,
        period: {
          year,
          month,
          totalWorkingDays,
        },
        statistics: {
          presentDays,
          absentDays,
          lateDays,
          halfDays,
          unmarkedDays,
        },
        attendance: attendanceRecords,
      })
    } catch (error) {
      return ctx.response.status(500).json({
        message: 'Error fetching attendance records',
        error: error.message,
      })
    }
  }

  /**
   * Get all edit requests for admin
   */
  async getEditRequests(ctx: HttpContext) {
    // Only admins can view all edit requests
    if (![1, 2, 3].includes(ctx.auth.user!.role_id)) {
      return ctx.response.status(403).json({
        message: 'Only administrators can view all edit requests',
      })
    }

    const status = ctx.request.input('status', 'pending')
    const page = ctx.request.input('page', 1)
    const perPage = ctx.request.input('per_page', 10)

    try {
      const requests = await StaffAttendanceEditRequest.query()
        .where('status', status)
        .preload('attendance', (query) => {
          query.preload('staff', (staffQuery) => {
            staffQuery.select('id', 'first_name', 'middle_name', 'last_name', 'employee_code')
          })
        })
        .preload('requester', (query) => {
          query.select('id', 'first_name', 'last_name')
        })
        .orderBy('created_at', 'desc')
        .paginate(page, perPage)
      
      return ctx.response.status(200).json(requests)
    } catch (error) {
      return ctx.response.status(500).json({
        message: 'Error fetching edit requests',
        error: error.message,
      })
    }
  }
}