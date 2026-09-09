import type { HttpContext } from '@adonisjs/core/http'
import Classes from '#models/Classes'
import {
  CreateManyValidatorForClasses,
  CreateValidatorForClasses,
  CreateValidatorForDivision,
  UpdateValidatorForClasses,
} from '#validators/Classes'
import Divisions from '#models/Divisions'
import db from '@adonisjs/lucid/services/db'

export default class ClassesController {
  async indexClassesForSchool(ctx: HttpContext) {
    if (ctx.request.qs().without_fees_plan === 'true') {
      try {
        let class_for_School_without_fees_plan = await
          db.query()
          .from('classes as cls')
          .distinct('cls.id')
          .select('cls.*')
          .leftJoin('fees_plans as fp', 'cls.id', 'fp.class_id')
          .andWhere((query) => {
            query
              .whereNull('fp.id') // No fees plan associated
              .orWhere('fp.status', 'Inactive') // Inactive fees plan
          })
          .where('cls.school_id', ctx.auth.user!.school_id!)

        // Classes.query().where('school_id', ctx.auth.user!.school_id as number)

        // if (class_for_School.length === 0) {
        //   return ctx.response.status(404).json({
        //     message: 'No classes found for this school',
        //   })
        // }

        // let divisions = await db
        //   .query()
        //   .from('divisions as div')
        //   .select('div.*')
        //   .leftJoin('fees_plans as fp', 'div.id', 'fp.division_id')
        //   .andWhereIn('div.class_id', [...class_for_School.map((item) => item.id)])
        //   .andWhere((query) => {
        //     query
        //       .whereNull('fp.id') // No fees plan associated
        //       .orWhere('fp.status', 'Inactive') // Inactive fees plan
        //   })

        return ctx.response.json(class_for_School_without_fees_plan)
      } catch (error) {
        console.log('Error while fetching classes', error)
        return ctx.response.status(500).json({ message: error })
      }
    } else {
      let classes = await Classes.query()
        .preload('divisions')
        .preload('batch')
        .preload('department')
        .where('school_id', ctx.auth.user!.school_id!)
      return ctx.response.json(classes)

      /**
       * Edjust output object according to `
       */
      // if (classes.length > 0) {

      //   let output_obj: TypeForIndexSchoolClasses[] = [
      //     {
      //       class: 1,
      //       divisions: []
      //     },
      //     {
      //       class: 2,
      //       divisions: []
      //     },
      //     {
      //       class: 3,
      //       divisions: []
      //     },
      //     {
      //       class: 4,
      //       divisions: []
      //     },
      //     {
      //       class: 5,
      //       divisions: []
      //     },
      //     {
      //       class: 6,
      //       divisions: []
      //     },
      //     {
      //       class: 7,
      //       divisions: []
      //     },
      //     {
      //       class: 8,
      //       divisions: []
      //     },
      //     {
      //       class: 9,
      //       divisions: []
      //     },
      //     {
      //       class: 10,
      //       divisions: []
      //     },
      //     {
      //       class: 11,
      //       divisions: []
      //     },
      //     {
      //       class: 12,
      //       divisions: []
      //     },
      //   ];

      //   output_obj = output_obj.map((std: TypeForIndexSchoolClasses) => {
      //     // console.log("Check Classes" , [...classes])
      //     let divisions = [...classes].filter((item) => {
      //       return item.class == std.class
      //     })
      //     divisions.sort((a, b) => a.division.localeCompare(b.division))
      //     return { ...std, divisions: divisions }
      //   })
      //   return ctx.response.json(output_obj);
      // }
    }
  }

  async indexStandard(ctx: HttpContext) {
    if (ctx.params.school_id) {
      let classes = await Classes.query()
        .where('school_id', ctx.params.school_id)
        .andWhere('class', ctx.params.class)
      return ctx.response.json(classes)
    } else {
      return ctx.response.status(404).json({ message: 'Please provide valid Class ID.' })
    }
  }

  /**
   *
   * @param ctx
   * @returns
   *
   * this method will only create default class , which will create divition 'A' only
   */
  async createClass(ctx: HttpContext) {
    /**
     * TODO : Check for unique alise names of class , for perticular school
     */
    // const academic_session_id = ctx.auth.user?.academic_session_id;
    if (![1, 2, 3, 4, 5, 7, 8, 11].includes(Number(ctx.auth.user?.role_id))) {
      return ctx.response
        .status(403)
        .json({ message: 'You are not allocated to manage this functions.' })
    }

    let trx = await db.transaction()

    try {
      const payload = await CreateValidatorForClasses.validate(ctx.request.body())
      const { with_division, ...classData } = payload
      const created_class = await Classes.create(
        { ...classData, school_id: ctx.auth.user!.school_id! },
        { client: trx }
      )

      if (with_division) {
        await Divisions.create(
          {
            class_id: created_class.id,
            division: 'A' as 'A',
            academic_year: payload.academic_year as number,
          },
          { client: trx }
        )
      }
      await trx.commit()
      return ctx.response.json(created_class.serialize())
    } catch (error) {
      await trx.rollback()
      return ctx.response.status(500).json({ message: error })
    }
  }

  /**
   *
   * @param ctx
   * @returns
   *
   * this method will create classes, optionally creating default division 'A' if with_division is true
   */
  async createMultipleClasses(ctx: HttpContext) {
    /**
     * TODO : Check for unique alise names of class , for perticular school
     */

    if (![1, 2, 3, 4, 5, 7, 8, 11].includes(Number(ctx.auth.user?.role_id))) {
      return ctx.response
        .status(403)
        .json({ message: 'You are not allocated to manage this functions.' })
    }
    let validatedPayload = await CreateManyValidatorForClasses.validate(ctx.request.body())
    let trx = await db.transaction()
    const classPayloads = validatedPayload.map((item) => {
      const { with_division, ...rest } = item
      return { ...rest, school_id: ctx.auth.user!.school_id! }
    })
    try {
      const created_class = await Classes.createMany(classPayloads, { client: trx })
      // create default division for each class if requested
      let divisions = created_class
        .filter((_, index) => validatedPayload[index].with_division)
        .map((item) => {
          return {
            class_id: item.id,
            division: 'A' as 'A',
            academic_year: item.academic_year as number,
            aliases: null,
          }
        })
      if (divisions.length > 0) {
        await Divisions.createMany(divisions, { client: trx })
      }
      await trx.commit()
      return ctx.response.json(created_class)
    } catch (error) {
      await trx.rollback()
      return ctx.response.status(500).json({ message: error })
    }
  }

  async updateClass(ctx: HttpContext) {
    let school_id = ctx.auth.user!.school_id!
    if (![1, 2, 3, 4, 5, 7, 8, 11].includes(Number(ctx.auth.user?.role_id))) {
      return ctx.response
        .status(403)
        .json({ message: 'You are not allocated to manage this functions.' })
    }
    const payload = await UpdateValidatorForClasses.validate(ctx.request.body())
    const divisioin_id = ctx.params.division_id
    const division = await Divisions.query().where('id', divisioin_id).first()

    if (!division) {
      return ctx.response.status(404).json({
        message: 'Please provide a valid division id',
      })
    }

    let cls = await Classes.query()
      .where('id', division.class_id)
      .andWhere('school_id', school_id as number)
      .first()

    if (!cls) {
      return ctx.response.status(404).json({
        message: 'This class is not belongs to your school.',
      })
    }

    division.merge(payload)
    await division.save()
    return ctx.response.json(division.serialize())
  }

  /**
   *
   * @param ctx
   * @returns
   *
   * method will create Division for class
   *
   * TODO :: Add automation code for create a plus one division only .
   *     ex : if there is division A and B are there , the next one should be C not D or any other .
   */
  async createDivision(ctx: HttpContext) {
    if (![1, 2, 3, 4, 5, 7, 8, 11].includes(Number(ctx.auth.user?.role_id))) {
      return ctx.response
        .status(403)
        .json({ message: 'You are not allocated to manage this functions.' })
    }

    const body = ctx.request.body()
    const academicYear = body.academic_year || body.academic_session_id || new Date().getFullYear()
    const payload = await CreateValidatorForDivision.validate({
      ...body,
      academic_year: Number(academicYear),
    })

    const { academic_session_id, ...divisionData } = payload
    const created_division = await Divisions.create(divisionData)
    return ctx.response.json(created_division.serialize())
  }

  async deleteDivision(ctx: HttpContext) {
    if (![1, 2, 3, 4, 5, 7, 8, 11].includes(Number(ctx.auth.user?.role_id))) {
      return ctx.response
        .status(403)
        .json({ message: 'You are not allocated to manage this functions.' })
    }
    const division_id = ctx.params.id
    const division = await Divisions.query().where('id', division_id).first()

    if (!division) {
      return ctx.response.status(404).json({
        message: 'Please provide a valid division id',
      })
    }

    let trx = await db.transaction()

    try {
      // 1. Check for dependent student enrollments
      const studentEnrollment = await db
        .from('student_enrollments')
        .where('division_id', division_id)
        .first()

      if (studentEnrollment) {
        await trx.rollback()
        return ctx.response.status(400).json({
          message: 'Cannot delete division because students are currently enrolled in it.',
        })
      }

      // 2. Check for fees plans
      const feesPlan = await db
        .from('fees_plans')
        .where('division_id', division_id)
        .first()

      if (feesPlan) {
        await trx.rollback()
        return ctx.response.status(400).json({
          message: 'Cannot delete division because fee plans are associated with it.',
        })
      }

      // 3. Check for lecture attendance
      const attendance = await db
        .from('lecture_attendance_masters')
        .where('division_id', division_id)
        .first()

      if (attendance) {
        await trx.rollback()
        return ctx.response.status(400).json({
          message: 'Cannot delete division because attendance records exist for it.',
        })
      }

      // Clean up period configuration records referencing this division
      await db
        .from('periods_config')
        .useTransaction(trx)
        .where('division_id', division_id)
        .delete()

      // Clean up class teacher assignments
      await db
        .from('class_teacher_masters')
        .useTransaction(trx)
        .where('division_id', division_id)
        .delete()

      // Clean up timetable versions
      await db
        .from('timetable_versions')
        .useTransaction(trx)
        .where('division_id', division_id)
        .delete()

      // Clean up subjects division staff masters & subjects division masters
      const subjectDivs = await db
        .from('subjects_division_masters')
        .where('division_id', division_id)
        .select('id')

      const subjectDivIds = subjectDivs.map((s) => s.id)
      if (subjectDivIds.length > 0) {
        await db
          .from('subjects_division_staff_masters')
          .useTransaction(trx)
          .whereIn('subjects_division_id', subjectDivIds)
          .delete()
      }

      await db
        .from('subjects_division_masters')
        .useTransaction(trx)
        .where('division_id', division_id)
        .delete()

      // Delete the division
      await division.useTransaction(trx).delete()

      await trx.commit()
      return ctx.response.json({ message: 'Division deleted successfully', id: division_id })
    } catch (error) {
      await trx.rollback()
      console.log('Error while deleting division:', error)
      return ctx.response.status(500).json({
        message: 'Failed to delete division due to server error.',
        error: error.message || error,
      })
    }
  }
}
