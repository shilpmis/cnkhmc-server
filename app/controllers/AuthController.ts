import Organization from '#models/Organization'
import Schools from '#models/Schools'
import Staff from '#models/Staff'
import User from '#models/User'
import Entity from '#models/Entity'
import { CreateValidatorForSchools } from '#validators/Schools'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'

import { DateTime } from 'luxon'

export default class AuthController {
  /**
   * Controller for create/regoster the schools & create a one admin level users default
   *
   *
   * @param ctx
   * @returns
   */
  async createSchool(ctx: HttpContext) {
    let trx = await db.transaction()

    try {
      const payload = await CreateValidatorForSchools.validate(ctx.request.all()) // Ensure organization_id exists in request payload
      if (!payload.organization_id) {
        throw new Error('Organization ID is required')
      }

      const organization = await Organization.find(payload.organization_id)
      if (!organization) {
        return ctx.response.notFound({ message: 'Organization not found' })
      }

      // Generate Branch Code: First letter of each word in the school name + established year
      const schoolInitials = payload.name
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase())
        .join('')

      const branchCode = `${schoolInitials}${payload.established_year}`

      // Assign branch_code to payload
      payload.branch_code = branchCode

      // 1. Create the Entity first to reserve/generate the unique ID
      const entity = await Entity.create({
        organization_id: payload.organization_id,
        name: payload.name,
        type: payload.school_type === 'COLLEGE' ? 'COLLEGE' : 'SCHOOL',
        email: payload.email,
        branch_code: branchCode,
        contact_number: payload.contact_number,
        address: payload.address || null,
        city: payload.city,
        state: payload.state,
        pincode: payload.pincode ? String(payload.pincode) : null,
        status: payload.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
      }, { client: trx })

      // 2. Create the school using the exact same ID
      const school = await Schools.create({
        ...payload,
        id: entity.id,
      }, { client: trx })

      /**
       * Create one admin level role for this school
       */
      const admin_user = await User.create(
        {
          school_id: school.id,
          email: `admin@${payload.branch_code}.saral`,
          username: `admin_${payload.branch_code.toLowerCase()}`,
          password: '12345678',
          role_id: 1,
          name: 'Admin',
          is_active: true,
        },
        { client: trx }
      )

      await trx.commit()
      return ctx.response.json({ school: school.serialize(), admin: admin_user.serialize() })
    } catch (error) {
      await trx.rollback()
      return ctx.response.status(500).json({
        message: 'Internal Server Error !! Please contact service center !',
        error: error,
      })
    }
  }

  async login(ctx: HttpContext) {
    const { username, password } = ctx.request.all()

    if (!username || !password) {
      return ctx.response
        .status(400)
        .json({ message: 'Username and password are required' })
    }

    try {
      let user = await User.query()
        .preload('school', (query) => {
          query.preload('academicSessions')
        })
        .preload('role')
        .preload('staff', (query) => {
          query.preload('role_type')
          query.preload('enrollments')
        })
        .where('username', username)
        .first()

      if (user && (await hash.verify(user.password, password))) {
        const token = await User.accessTokens.create(user, ['*'], {
          expiresIn: '7 days',
        })
        return ctx.response.json({ user: user.serialize(), token })
      }

      return ctx.response
        .status(404)
        .json({ message: 'Your username or password is incorrect!' })
    } catch (error) {
      console.error('LOGIN_ERROR:', error)
      return ctx.response
        .status(500)
        .json({ 
          message: 'Internal Server Error !! Please contact service center !',
          error: error.message,
          stack: error.stack 
        })
    }
  }

  async verifyUser(ctx: HttpContext) {
    try {
      console.log('VERIFY_REQUEST_RECEIVED')
      if (!ctx.auth.user) {
        console.log('VERIFY_NO_AUTH_USER')
        return ctx.response.status(401).json({ message: 'Unauthorized' })
      }

      let userQuery = User.query()
        .preload('school', (query) => {
          query.preload('academicSessions')
        })
        .preload('role')

      if (ctx.auth.user.staff_id) {
        userQuery.preload('staff', (query) => {
          query.preload('role_type')
          query.preload('enrollments')
          query.preload('assigend_classes', (query) => {
            query.preload('divisions', (query) => {
              query.preload('class')
            })
          })
        })
      }

      userQuery.where('id', ctx.auth.user.id)

      let user = await userQuery.first()
      if (user) {
        console.log('VERIFY_SUCCESS_FOR_USER:', user.id)
        return ctx.response.json({ user: user.serialize() })
      } else {
        console.log('VERIFY_USER_NOT_FOUND_IN_DB')
        return ctx.response.status(404).json({ message: 'User not found!' })
      }
    } catch (error) {
      console.error('VERIFY_ERROR:', error)
      return ctx.response.status(500).json({ 
        message: 'Internal Server Error during verification!',
        error: error.message 
      })
    }
  }

  async logout(ctx: HttpContext) {
    if (!ctx.auth.user) {
      return ctx.response.status(404).json({ message: 'Bad Request' })
    }

    let now = DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss') // Format current time

    let token = await db.rawQuery(
      'SELECT * FROM auth_access_tokens WHERE tokenable_id = ? ORDER BY created_at desc LIMIT 1',
      [ctx.auth.user.id]
    )

    await db.rawQuery('UPDATE auth_access_tokens SET expires_at = ? WHERE id = ?', [
      now,
      token[0][0].id,
    ])

    return ctx.response.json({ message: 'You have been logout succesfully ! ' })
  }

  async resetPassword(ctx: HttpContext) {
    try {
      const { employee_code, date_of_birth, mobile_number, password, confirm_password } = ctx.request.all()

      // Validate input
      if (!employee_code || !date_of_birth || !mobile_number) {
        return ctx.response.status(400).json({
          message: 'Employee code, date of birth, and mobile number are required',
        })
      }

      // Validate password fields
      if (!password || !confirm_password) {
        return ctx.response.status(400).json({
          message: 'Password and confirm password are required',
        })
      }

      // Check if passwords match
      if (password !== confirm_password) {
        return ctx.response.status(400).json({
          message: 'Passwords do not match',
        })
      }

      // Validate password strength
      if (password.length < 8) {
        return ctx.response.status(400).json({
          message: 'Password must be at least 8 characters long',
        })
      }

      // Find staff member with matching credentials
      const staff = await Staff.query()
        .where('employee_code', employee_code)
        .where('mobile_number', mobile_number)
        .where('birth_date', date_of_birth) 
        .first()

      if (!staff) {
        return ctx.response.status(404).json({
          message: 'No matching staff record found',
        })
      }

      // Find associated user account
      const user = await User.query()
        .where('staff_id', staff.id)
        .first()

      if (!user) {
        return ctx.response.status(404).json({
          message: 'No user account associated with this staff member',
        })
      }

      // Reset password to the new one provided by the user
      user.password = password
      await user.save()

      return ctx.response.json({
        message: 'Password has been reset successfully',
      })
    } catch (error) {
      return ctx.response.status(500).json({
        message: 'An error occurred while resetting password',
        error: error.message,
      })
    }
  }
}
