import Classes from '#models/Classes'
import Access from '#services/access_control'
import ConcessionFeesPlanMaster from '#models/ConcessionFeesPlanMaster'
import Concessions from '#models/Concessions'
import ConcessionsInstallmentMasters from '#models/ConcessionsInstallmentMasters'
import ConcessionStudentMaster from '#models/ConcessionStudentMaster'
import Divisions from '#models/Divisions'
import FeesPlan from '#models/FeesPlan'
import FeesPlanDetails from '#models/FeesPlanDetails'
import FeesType from '#models/FeesType'
import InstallmentBreakDowns from '#models/InstallmentBreakDowns'
import StudentEnrollments from '#models/StudentEnrollments'
import StudentFeesInstallments from '#models/StudentFeesInstallments'
import StudentFeesMaster from '#models/StudentFeesMaster'
import StudentFeesPlanMaster from '#models/StudentFeesPlanMasters'
import StudentFeesTypeInstallmentBreakdowns from '#models/StudentFeesTypeInstallmentBreakdowns'
import StudentFeesTypeMasters from '#models/StudentFeesTypeMasters'
import Students from '#models/Students'
import {
  CreateValidationForApplyConcessionToPlan,
  CreateValidationForApplyConcessionToStudent,
  CreateValidationForApplyExtraFeesToStudent,
  CreateValidationForConcessionType,
  CreateValidationForMultipleInstallments,
  CreateValidatorForFeesPlan,
  CreateValidatorForFeesType,
  UpdateValidationForAppliedConcessionToPlan,
  UpdateValidationForAppliedConcessionToStudent,
  UpdateValidationForConcessionType,
  UpdateValidationFprPaidInstallment,
  UpdateValidatorForFeesPlanDetails,
  UpdateValidatorForFeesType,
} from '#validators/Fees'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { HasOne } from '@adonisjs/lucid/types/relations'
import StudentExtraFeesInstallment from '#models/StudentExtraFeesInstallment'
import { CreateValidationForPayMultipleInstallmentsOfExtraFees } from '#validators/Fees'
import { DateTime } from 'luxon'
import SpacesService from '#services/SpacesService'
import * as xlsx from 'xlsx'

export default class FeesController {

  // index fees type for school which are applicable to plan 
  async indexFeesTyeForSchool(ctx: HttpContext) {
    let academic_year = ctx.request.input('academic_year') || ctx.request.input('academic_session')
    let applicable_to = ctx.request.input('type')
    let status = ctx.request.input('status', 'Active')
    if (!academic_year) {
      return ctx.response.status(400).json({
        message: 'Please provide academic_year or academic_session',
      })
    }
    let fetch_all = ctx.request.input('all', false)
    let query = FeesType.query()
      .where('school_id', ctx.auth.user!.school_id as number)
      .andWhere('academic_year', Number(academic_year))

    if (applicable_to && applicable_to !== 'All') {
      query.andWhere('applicable_to', applicable_to)
    }

    if (status && status !== 'All') {
      query.andWhere('status', status)
    }

    if (applicable_to === 'plan') {
      query.whereNot('name', 'like', '%Quota%')
    }

    let fees_types: any
    if (!fetch_all) {
      fees_types = await query.paginate(ctx.request.input('page', 1), 10)
    } else {
      fees_types = await query
      if (fees_types.length === 0 && applicable_to === 'plan') {
        const standardTypes = [
          { school_id: ctx.auth.user!.school_id as number, academic_year: Number(academic_year), name: 'Tuition Fee', description: 'Annual Academic Tuition Fee', applicable_to: 'plan' as const, status: 'Active' },
          { school_id: ctx.auth.user!.school_id as number, academic_year: Number(academic_year), name: 'Admission Fee', description: 'One-time Enrollment / Admission Fee', applicable_to: 'plan' as const, status: 'Active' },
          { school_id: ctx.auth.user!.school_id as number, academic_year: Number(academic_year), name: 'Laboratory & Library Fee', description: 'Lab practicals and library access fees', applicable_to: 'plan' as const, status: 'Active' },
          { school_id: ctx.auth.user!.school_id as number, academic_year: Number(academic_year), name: 'Hostel & Amenities Fee', description: 'Host accommodation and campus amenities', applicable_to: 'plan' as const, status: 'Active' },
          { school_id: ctx.auth.user!.school_id as number, academic_year: Number(academic_year), name: 'Activity & Development Fee', description: 'Sports, events, and campus development', applicable_to: 'plan' as const, status: 'Active' }
        ]
        await FeesType.createMany(standardTypes)
        fees_types = await FeesType.query()
          .where('school_id', ctx.auth.user!.school_id as number)
          .andWhere('academic_year', Number(academic_year))
          .andWhere('applicable_to', 'plan')
          .andWhere('status', 'Active')
          .whereNot('name', 'like', '%Quota%')
      }
    }
    return ctx.response.json(fees_types)
  }

  async indexFeesTypeByFilter(ctx: HttpContext) {
    let academic_year = ctx.request.input('academic_year') || ctx.request.input('academic_session') || ctx.request.input('academic_session_id') || ctx.request.input('academic_session_id')
    let filter_type = ctx.request.input('type')

    if (filter_type === 'division') {
      if (!academic_year) {
        return ctx.response.status(400).json({
          message: 'Please provide academic_year',
        })
      }

  
      let class_id = ctx.request.input('value')

      let fees_types = await db
        .query()
        .from('fees_plans as fp')
        .join('fees_plan_details as fpd', 'fp.id', 'fpd.fees_plan_id')
        .join('fees_types as ft', 'fpd.fees_type_id', 'ft.id')
        .where('fp.academic_year', academic_year)
        .andWhere('ft.applicable_to', 'plan')
        .andWhere('fp.class_id', class_id)
        .distinct()
        .select('ft.*')

      return ctx.response.json(fees_types)
    } else {
      return ctx.response.status(400).json([])
    }
  }

  async createFeesType(ctx: HttpContext) {
    if (!(await Access.allows(ctx.auth.user!, 'create', 'Fees', [1, 2, 3, 4, 5, 7, 8, 11]))) {
      return ctx.response.status(401).json({
        message: 'You are not authorized to perform this action !',
      })
    }

    let payload = await CreateValidatorForFeesType.validate(ctx.request.body())

    let academic_year = payload.academic_year


    let fees_type = await FeesType.create({
      ...payload,
      academic_year: (typeof academic_year !== 'undefined' ? academic_year : 2024) as number,
      school_id: ctx.auth.user!.school_id as number,
    })

    return ctx.response.status(201).json(fees_type)
  }

  async updateFeesType(ctx: HttpContext) {
    if (!(await Access.allows(ctx.auth.user!, 'update', 'Fees', [1, 2, 3, 4, 5, 7, 8, 11]))) {
      return ctx.response.status(401).json({
        message: 'You are not authorized to perform this action !',
      })
    }
    let payload = await UpdateValidatorForFeesType.validate(ctx.request.body())

    let fees_type = await FeesType.query()
      .where('id', ctx.params.id)
      .andWhere('school_id', ctx.auth.user!.school_id as number)
      .first()

    if (!fees_type) {
      return ctx.response.status(404).json({
        message: 'Fees Type not found',
      })
    }

    let academic_session: any = { id: fees_type?.academic_year, is_active: 1 }

    if (!academic_session) {
      return ctx.response.status(404).json({
        message: 'No active acadaemic session found for this fees type .',
      })
    }

    if (!academic_session.is_active) {
      return ctx.response.status(400).json({
        message: 'Academic session for this fees type is not active',
      })
    }

    if (payload.status === 'Inactive') {
      let active_plan_for_fees_type = await FeesPlanDetails.query()
        .where('fees_type_id', fees_type.id)
        .andWhere('status', 'Active')
        .first()

      if (active_plan_for_fees_type) {
        return ctx.response.status(400).json({
          message: 'Can not inactive this fees type because it is used in active fees plan',
        })
      }
    }
    try {
      fees_type.merge(payload).save()
    } catch (error) {
      return ctx.response.status(500).json({
        message: 'Internal Server Error',
        error: error,
      })
    }

    return ctx.response.status(201).json(fees_type)
  }

  async deleteFeesType(ctx: HttpContext) {
    if (!(await Access.allows(ctx.auth.user!, 'delete', 'Fees', [1, 2, 3, 4, 5, 7, 8, 11]))) {
      return ctx.response.status(401).json({
        message: 'You are not authorized to perform this action !',
      })
    }

    let fees_type = await FeesType.query()
      .where('id', ctx.params.id)
      // .andWhere('school_id', ctx.auth.user!.school_id as number)
      .first()

    if (!fees_type) {
      return ctx.response.status(404).json({
        message: 'Fees Type not found',
      })
    }


    // if (!academic_session.is_active) {
    //   return ctx.response.status(400).json({
    //     message: 'Academic session for this fees type is not active',
    //   })
    // }

    // check whether fees type is been used in any fees plan or not
    let active_plan_for_fees_type = await FeesPlanDetails.query()
      .where('fees_type_id', fees_type.id)
      // .andWhere('status', 'Active')
      .first()

    if (active_plan_for_fees_type) {
      return ctx.response.status(400).json({
        message: 'Can not delete this fees type because it is used in active fees plan',
      })
    }

    try {
      await fees_type.delete()
      return ctx.response.status(200).json({
        message: 'Fees Type deleted successfully',
      })
    } catch (error) {
      return ctx.response.status(500).json({
        message: 'Internal Server Error',
        error: error,
      })
    }
  }

  async indexFeesPlanForSchool(ctx: HttpContext) {
    let academic_year = ctx.request.input('academic_year') || ctx.request.input('academic_session') || ctx.request.input('academic_session_id') || ctx.request.input('academic_session_id')

    // let plan_id = ctx.request.input('plan_id');
    if (!academic_year) {
      return ctx.response.status(400).json({
        message: 'Please provide academic_year or academic_session',
      })
    }

    let filter_for_eligibility_to_apply_concession = ctx.request.input('eligible_for_concession')
    let status = ctx.request.input('status', 'All')
    let quota_id = ctx.request.input('quota_id')
    let class_id = ctx.request.input('class_id')

    let baseQuery = FeesPlan.query()
      .preload('quota')
      .preload('fees_detail', (q) => {
        q.preload('fees_type')
      })
      .preload('concession_for_plan', (query) => {
        query
          .preload('concession')
          .where('academic_year', academic_year as number)
          .andWhere('status', 'Active')
      })
      .where('academic_year', academic_year as number)

    if (quota_id) {
      baseQuery = baseQuery.andWhere('quota_id', quota_id)
    }

    if (class_id) {
      baseQuery = baseQuery.andWhere('class_id', class_id)
    }

    if (filter_for_eligibility_to_apply_concession) {
      baseQuery = baseQuery
        .andWhere('status', 'Active')
        .whereDoesntHave('concession_for_plan', (query) => {
          query
            .where('concession_id', filter_for_eligibility_to_apply_concession)
            .andWhere('status', 'Active')
        })
    } else if (status !== 'All') {
      baseQuery = baseQuery.andWhere('status', status)
    }

    let limit = ctx.request.input('limit', 50)
    let fees_types = await baseQuery.paginate(ctx.request.input('page', 1), limit)
    return ctx.response.json(fees_types)
  }

  async fetchFeesPlanDetails(ctx: HttpContext) {
    let plan_id = ctx.params.plan_id

    type TypeForResObj = {
      fees_plan: FeesPlan | null
      consession: ConcessionFeesPlanMaster[] | null
      fees_types: {
        fees_type: FeesPlanDetails
        installment_breakDowns: InstallmentBreakDowns[]
      }[]
    }

    let resObj: TypeForResObj = {
      fees_plan: null,
      fees_types: [],
      consession: null,
    }

    if (!plan_id) {
      return ctx.response.status(400).json({
        message: 'Please provide plan_id',
      })
    }

    let plan = await FeesPlan.query().preload('quota').where('id', plan_id).first()

    if (!plan) {
      return ctx.response.status(404).json({
        message: 'No fees plan found for this school',
      })
    }

    resObj.fees_plan = plan

    let fees_types = await FeesPlanDetails.query()
      .preload('fees_type')
      .where('fees_plan_id', plan_id)

    for (let i = 0; i < fees_types.length; i++) {
      let installment_breakDowns: InstallmentBreakDowns[] =
        await InstallmentBreakDowns.query().where('fee_plan_details_id', fees_types[i].id)
      resObj.fees_types.push({
        fees_type: fees_types[i],
        installment_breakDowns: installment_breakDowns,
      })
    }

    let consession = await ConcessionFeesPlanMaster.query()
      .where('fees_plan_id', plan_id)
      .andWhere('status', 'Active');

    if (consession.length > 0) {
      resObj.consession = consession
    }

    // check whether fees plan is available for update ot not 
    let attachd_student_with_plan = await StudentFeesMaster.query()
      .where('academic_year', plan.academic_year)
      .andWhere('fees_plan_id', plan_id)

    return ctx.response.json({ ...resObj, is_editable: attachd_student_with_plan.length > 0 ? false : true })
  }

  async createFeePlan(ctx: HttpContext) {
    if (!(await Access.allows(ctx.auth.user!, 'create', 'Fees', [1, 2, 3, 4, 5, 7, 8, 11]))) {
      return ctx.response.status(401).json({
        message: 'You are not authorized to perform this action !',
      })
    }

    let reqBody = ctx.request.body()
    if (!reqBody.academic_year && reqBody.academic_session_id) {
      reqBody.academic_year = Number(reqBody.academic_session_id)
    }
    let validated = await CreateValidatorForFeesPlan.validate(reqBody)
    let academic_year = validated.academic_year || validated.academic_session_id || 2026
    let payload = validated

    let check_for_plan_query = FeesPlan.query()
      .where('academic_year', Number(academic_year))
      .andWhere('class_id', payload.fees_plan.class_id)
      .andWhere('status', 'Active')

    if (payload.fees_plan.quota_id) {
      check_for_plan_query = check_for_plan_query.andWhere('quota_id', payload.fees_plan.quota_id)
    } else {
      check_for_plan_query = check_for_plan_query.whereNull('quota_id')
    }

    // A class can have several active templates (e.g. Tuition, Hostel, Mess); only a template with the same name is a duplicate
    if (payload.fees_plan.name) {
      check_for_plan_query = check_for_plan_query.andWhere('name', payload.fees_plan.name)
    } else {
      check_for_plan_query = check_for_plan_query.whereNull('name')
    }

    let check_for_plan = await check_for_plan_query.first()

    if (check_for_plan) {
      return ctx.response.status(400).json({
        message: 'An active Fee template with this name already exists for this Class and Quota.',
      })
    }

    type res = {
      fees_plan: FeesPlan
      fees_types: {
        fees_type: FeesPlanDetails
        installment_breakDowns: InstallmentBreakDowns[]
      }[]
    }

    let trx = await db.transaction()

    try {
      let fees_type = await FeesPlan.create(
        {
          ...payload.fees_plan,
          quota_id: payload.fees_plan.quota_id || null,
          academic_year: (typeof academic_year !== 'undefined' ? academic_year : 2024),
          total_amount: payload.plan_details.reduce(
            (acc: number, detail: any) => acc + Number(detail.total_amount),
            0
          ),
        },
        { client: trx }
      )

      let resp: res = {
        fees_plan: fees_type,
        fees_types: [],
      }

      for (let i = 0; i < payload.plan_details.length; i++) {
        let fees_plan_details = await FeesPlanDetails.create(
          {
            fees_type_id: payload.plan_details[i].fees_type_id,
            total_amount: payload.plan_details[i].total_amount,
            total_installment: payload.plan_details[i].total_installment,
            installment_type: payload.plan_details[i].installment_type,
            // academic_year: (typeof academic_year !== 'undefined' ? academic_year : 2024) as number,
            fees_plan_id: fees_type.id,
            status: 'Active',
          },
          { client: trx }
        )

        resp.fees_types.push({
          fees_type: fees_plan_details,
          installment_breakDowns: [],
        })

        for (let j = 0; j < payload.plan_details[i].installment_breakDowns.length; j++) {
          let installment_breakDowns = await InstallmentBreakDowns.create(
            {
              ...payload.plan_details[i].installment_breakDowns[j],
              fee_plan_details_id: fees_plan_details.id,
              status: 'Active',
            },
            { client: trx }
          )

          resp.fees_types[i].installment_breakDowns.push(installment_breakDowns)
        }
      }
      await trx.commit()
      return ctx.response.status(201).json(resp)
    } catch (error) {
      await trx.rollback()
      console.log(error)
      return ctx.response.status(500).json({
        message: 'Internal Server Error',
        errors: error,
      })
    }
  }

  async updateFeesPlanStatus(ctx: HttpContext) {
    let plan_id = ctx.params.plan_id

    let requestd_status = ctx.params.status
    if (requestd_status != 'Active' && requestd_status != 'Inactive') {
      return ctx.response.status(404).json({
        message: 'Please provicde valid Status code !',
      })
    }

    if (!(await Access.allows(ctx.auth.user!, 'update', 'Fees', [1, 2, 3, 4, 5, 7, 8, 11]))) {
      return ctx.response.status(401).json({
        message: 'You are not authorized to perform this action !',
      })
    }

    let plan = await FeesPlan.query().where('id', plan_id).first()

    if (!plan) {
      return ctx.response.status(404).json({
        message: 'Plan not found',
      })
    }


    try {
      if (requestd_status === 'Active') {
        // activating a template replaces only an active template of the same name, class and quota
        const sameTemplate = FeesPlan.query()
          .where('academic_year', plan.academic_year)
          .andWhere('class_id', plan.class_id)
          .andWhere('status', 'Active')
          .andWhereNot('id', plan.id)
        if (plan.quota_id) sameTemplate.andWhere('quota_id', plan.quota_id)
        else sameTemplate.whereNull('quota_id')
        if (plan.name) sameTemplate.andWhere('name', plan.name)
        else sameTemplate.whereNull('name')
        await sameTemplate.update('status', 'Inactive')
      }
      await plan.merge({ status: requestd_status }).save()
      return ctx.response.status(200).json([plan])
    } catch (error) {
      return ctx.response.status(500).json({
        message: 'Internal Server Error',
        error: error,
      })
    }
  }

  async updatePlan(ctx: HttpContext) {

    let plan_id = ctx.params.plan_id
    if (!(await Access.allows(ctx.auth.user!, 'update', 'Fees', [1, 2, 3, 4, 5, 7, 8, 11]))) {
      return ctx.response.status(401).json({
        message: 'You are not authorized to perform this action !',
      })
    }


    const { general_detail_for_plan, new_fees_type, existing_fees_type, deleted_fees_type } = await UpdateValidatorForFeesPlanDetails.validate(ctx.request.body())

    // check whthere there is fees_detail_id inside existing_fees_type or new_fees_type , which are also in delete_fees_type 
    if (deleted_fees_type && existing_fees_type && existing_fees_type.length !== 0) {
      for (let detail of existing_fees_type) {
        if (deleted_fees_type.includes(detail.fees_plan_detail_id)) {
          return ctx.response.status(400).json({
            message: 'Fees type cannot be deleted as it is already attached to a student',
          })
        }
      }
    }

    if (deleted_fees_type && new_fees_type && new_fees_type.length !== 0) {
      for (let detail of new_fees_type) {
        if (deleted_fees_type.includes(detail.fees_type_id)) {
          return ctx.response.status(400).json({
            message: 'Fees type cannot be deleted as it is already attached to a student',
          })
        }
      }
    }

    let plan = await FeesPlan
      .query()
      .preload('fees_detail')
      .where('id', plan_id).first()

    if (!plan) {
      return ctx.response.status(404).json({
        message: 'Plan not found',
      })
    }


    let trx = await db.transaction()

    try {

      // update basic information of plan (general_detail_for_plan)
      if (general_detail_for_plan) await plan.merge(general_detail_for_plan).useTransaction(trx).save()

      // add new fees type of plan
      if (new_fees_type && new_fees_type.length !== 0) {
        for (let detail of new_fees_type) {
          let fees_plan_detail = await FeesPlanDetails.create(
            {
              fees_type_id: detail.fees_type_id,
              total_amount: detail.total_amount,
              total_installment: detail.total_installment,
              installment_type: detail.installment_type,
              fees_plan_id: plan.id,
              status: 'Active',
            },
            { client: trx }
          )

          for (let breakdown of detail.installment_breakDowns) {
            await InstallmentBreakDowns.create(
              {
                ...breakdown,
                fee_plan_details_id: fees_plan_detail.id,
                status: 'Active',
              },
              { client: trx }
            )
          }
          // udpate fees plan details
        }
        await plan
          .merge({
            total_amount:
              Number(plan.total_amount) +
              new_fees_type.reduce((acc, detail) => acc + detail.total_amount, 0),
          })
          .useTransaction(trx)
          .save()
      }

      // update existing fees type of plan
      if (existing_fees_type && existing_fees_type.length !== 0) {
        for (let detail of existing_fees_type) {
          let fees_plan_detail = await FeesPlanDetails.query()
            .preload('installments_breakdown')
            .where('id', detail.fees_plan_detail_id)
            .andWhere('fees_plan_id', plan.id)
            .first()

          if (!fees_plan_detail) {
            return ctx.response.status(404).json({
              message: 'Fees plan detail not found for this plan',
            })
          }

          fees_plan_detail.merge({
            // fees_type_id: detail.fees_type_id,
            total_amount: detail.total_amount,
            total_installment: detail.total_installment,
            installment_type: detail.installment_type,
          })

          await fees_plan_detail.useTransaction(trx).save()

          // remove previous installment breakdowns
          for (let breakdown of fees_plan_detail.installments_breakdown) {
            await breakdown.useTransaction(trx).delete()
          }

          // update installment breakdowns
          if (detail.installment_breakDowns && detail.installment_breakDowns.length > 0) {
            for (let breakdown of detail.installment_breakDowns) {
              let { id, ...rest } = breakdown
              await InstallmentBreakDowns.create(
                {
                  ...rest,
                  fee_plan_details_id: fees_plan_detail.id,
                  status: 'Active',
                },
                { client: trx }
              )
            }
          }
        }
      }

      // handle delete fees type of plan
      let reduced_amount_from_deleted_Fees_type = 0
      if (deleted_fees_type && deleted_fees_type.length !== 0) {
        for (let fees_plan_detail_id of deleted_fees_type) {
          let fees_plan_detail = await FeesPlanDetails.query()
            .preload('installments_breakdown')
            .where('id', fees_plan_detail_id)
            .andWhere('fees_plan_id', plan.id)
            .first()

          if (!fees_plan_detail) {
            return ctx.response.status(404).json({
              message: 'Fees plan detail not found for this plan',
            })
          }
          reduced_amount_from_deleted_Fees_type += fees_plan_detail.total_amount
          await fees_plan_detail.useTransaction(trx).delete()

          // remove previous installment breakdowns
          for (let breakdown of fees_plan_detail.installments_breakdown) {
            await breakdown.useTransaction(trx).delete()
          }
        }
      }

      // update fees plan 

      // Calculate amount to subtract: only for existing fees types that actually exist in plan.fees_detail
      let amount_to_subtract = reduced_amount_from_deleted_Fees_type;
      if (existing_fees_type && plan.fees_detail) {
        amount_to_subtract = existing_fees_type.reduce((acc, detail) => {
          const found = plan.fees_detail.find((fd) => fd.id === detail.fees_plan_detail_id)
          return found ? acc + Number(found.total_amount) : acc
        }, 0)
      }

      let amount_to_add = 0
      if (new_fees_type) amount_to_add += new_fees_type.reduce((acc, detail) => acc + Number(detail.total_amount), 0)

      if (existing_fees_type) amount_to_add += existing_fees_type.reduce((acc, detail) => acc + Number(detail.total_amount), 0)

      await plan.merge({
        total_amount: (plan.total_amount - amount_to_subtract) + amount_to_add,
      }).useTransaction(trx).save()

      await trx.commit()
      return ctx.response.status(200).json(plan)
    } catch (error) {
      console.log("error", error)
      await trx.rollback()
      return ctx.response.status(500).json({
        message: 'Internal Server Error',
        error: error,
      })
    }
  }

  // async updatePlan(ctx : HttpContext){
  //   return ctx.response.status(400).json({
  //     message: 'This endpoint is not implemented yet !',
  //   })
  // }

  async deleteFeesPlan(ctx: HttpContext) {
    let plan_id = ctx.params.plan_id

    const userRoleId = Number(ctx.auth.user?.role_id)
    if (userRoleId && ![1, 2, 3, 4, 5, 7, 8, 11].includes(userRoleId)) {
      return ctx.response.status(401).json({
        message: 'You are not authorized to perform this action !',
      })
    }

    let plan = await FeesPlan.query().where('id', plan_id).first()

    if (!plan) {
      return ctx.response.status(404).json({
        message: 'Plan not found',
      })
    }

    // Safeguard: Check if any actual payments have been collected against this fee plan
    const hasActualPayments = await StudentFeesMaster.query()
      .where('fees_plan_id', plan_id)
      .andWhere('paid_amount', '>', 0)
      .first()

    if (hasActualPayments) {
      return ctx.response.status(400).json({
        message: 'Cannot delete this fee plan because payments have already been collected under it. Please mark the plan as Inactive instead.',
      })
    }

    const trx = await db.transaction()
    try {
      // 1. Remove student fee master assignments & dependent installments/plan masters
      const masters = await StudentFeesMaster.query({ client: trx }).where('fees_plan_id', plan_id)
      for (const m of masters) {
        await db.from('student_fees_installments').where('student_fees_master_id', m.id).useTransaction(trx).delete()
        await db.from('student_fees_plan_masters').where('student_fees_master_id', m.id).useTransaction(trx).delete()
        await m.useTransaction(trx).delete()
      }

      // 2. Remove student fees type mappings and concessions referencing this plan
      await db.from('student_fees_type_masters').where('fees_plan_id', plan_id).useTransaction(trx).delete()
      await db.from('concessions_student_masters').where('fees_plan_id', plan_id).useTransaction(trx).delete()
      await db.from('concession_fees_plan_master').where('fees_plan_id', plan_id).useTransaction(trx).delete()

      // 3. Remove fee plan details and their installment breakdowns
      const details = await FeesPlanDetails.query({ client: trx }).where('fees_plan_id', plan_id)
      for (const d of details) {
        await db.from('installment_breakdowns').where('fee_plan_details_id', d.id).useTransaction(trx).delete()
        await d.useTransaction(trx).delete()
      }

      // 4. Finally delete the plan
      await plan.useTransaction(trx).delete()
      await trx.commit()

      return ctx.response.status(200).json({
        message: 'Fees Plan deleted successfully',
      })
    } catch (error) {
      await trx.rollback()
      return ctx.response.status(500).json({
        message: 'Internal Server Error',
        error: error?.message || error,
      })
    }
  }

  async fetchFeesStatusForClass(ctx: HttpContext) {
    let division_id = ctx.params.division_id
    if (!division_id) {
      return ctx.response.status(400).json({
        message: 'Please provide class_id',
      })
    }

    let academic_year = ctx.request.input('academic_year') || ctx.request.input('academic_session') || ctx.request.input('academic_session_id') || ctx.request.input('academic_session_id')
    if (!academic_year) {
      return ctx.response.status(400).json({
        message: 'Please provide academic_year or academic_session',
      })
    }

    let division = await Divisions.query().where('id', division_id).first()

    if (!division) {
      return ctx.response.status(404).json({
        message: 'Division not found',
      })
    }

    let clas = await Classes.query()
      .where('id', division.class_id)
      .andWhere('school_id', ctx.auth.user!.school_id!)
      .first()

    if (!clas) {
      return ctx.response.status(404).json({
        message: 'Class not found for provided division',
      })
    }

    let class_fee_plans = await FeesPlan.query()
      .preload('quota')
      .where('class_id', clas.id)
      .andWhere('academic_year', Number(academic_year))
      .andWhere('status', 'Active')

    if (class_fee_plans.length === 0) {
      return ctx.response.status(200).json({
        data: [],
        meta: {
          total: 0,
          per_page: 10,
          current_page: 1,
          last_page: 1,
          first_page: 1,
          first_page_url: '/?page=1',
          last_page_url: '/?page=1',
          next_page_url: null,
          previous_page_url: null,
        },
        hasFeesPlan: false,
        message: 'No active fees plan found for this class in this academic session.',
      })
    }

    let student_enrollments = await StudentEnrollments.query()
      .preload('quota')
      .where('division_id', division_id)
      .andWhere('academic_year', Number(academic_year))
      .andWhere('status', 'pursuing')

    if (student_enrollments.length === 0) {
      return ctx.response.status(200).json({
        data: [],
        meta: {
          total: 0,
          per_page: 10,
          current_page: 1,
          last_page: 1,
          first_page: 1,
          first_page_url: '/?page=1',
          last_page_url: '/?page=1',
          next_page_url: null,
          previous_page_url: null,
        },
        hasFeesPlan: true,
        hasStudents: false,
        message: 'No student found in this class for this academic session !',
      })
    }

    let filter_for_eligibility_to_apply_concession = ctx.request.input('eligible_for_concession')

    const studentColumns = [
      'id',
      'first_name',
      'middle_name',
      'last_name',
      'gr_no',
      'first_year_roll_number',
      'second_year_roll_number',
      'third_year_roll_number',
      'fourth_year_roll_number',
    ]

    let studentQuery = Students.query()
      .select(studentColumns)
      .preload('fees_status', (query) => {
        query.where('academic_year', Number(academic_year))
        query.preload('fees_plan', (qp) => qp.preload('quota'))
      })
      .whereIn('id', [
        ...student_enrollments.map((student: StudentEnrollments) => student.student_id),
      ])

    if (filter_for_eligibility_to_apply_concession) {
      studentQuery.whereDoesntHave('provided_concession', (query) => {
        query
          .where('concession_id', filter_for_eligibility_to_apply_concession)
          .andWhere('status', 'Active')
      })
    }

    let students = await studentQuery.paginate(ctx.request.input('page', 1), 10)
    let { data, meta } = students.toJSON()

    let enrollmentMap = new Map<number, StudentEnrollments>()
    student_enrollments.forEach((e) => enrollmentMap.set(e.student_id, e))

    let res: any[] = []

    for (let i = 0; i < data.length; i++) {
      let student = students[i].serialize()
      const studentEnrollment = enrollmentMap.get(students[i].id)
      student.quota = studentEnrollment?.quota || null
      student.quota_id = studentEnrollment?.quota_id || null

      if (!students[i].fees_status) {
        let matchingPlan = class_fee_plans.find(
          (p) => studentEnrollment?.quota_id && p.quota_id === studentEnrollment.quota_id
        ) || class_fee_plans.find((p) => p.quota_id === null) || class_fee_plans[0]

        student.fees_status = {
          student_id: students[i].id,
          academic_year: Number(academic_year),
          fees_plan_id: matchingPlan ? matchingPlan.id : 0,
          discounted_amount: 0,
          paid_amount: 0,
          total_amount: matchingPlan ? Number(matchingPlan.total_amount) : 0,
          due_amount: matchingPlan ? Number(matchingPlan.total_amount) : 0,
          status: 'Pending',
          is_locked: false,
          fees_plan: matchingPlan || null,
        }
        res.push(student)
      } else {
        res.push(student)
      }
    }

    return ctx.response.json({ data: res, meta })
  }

  async fetchFeesStatusForSingleStudent(ctx: HttpContext) {
    let student_id = ctx.params.student_id
    let academic_year = ctx.request.input('academic_year') || ctx.request.input('academic_session') || ctx.request.input('academic_session_id')

    if (!student_id) {
      return ctx.response.status(400).json({
        message: 'Please provide student_id',
      })
    }

    if (!academic_year) {
      const latestEnrollment = await StudentEnrollments.query()
        .where('student_id', student_id)
        .orderBy('academic_year', 'desc')
        .first()
      if (latestEnrollment) {
        academic_year = latestEnrollment.academic_year
      }
    }

    let enrollmentQuery = StudentEnrollments.query()
      .preload('division')
      .where('student_id', student_id)

    if (academic_year) {
      enrollmentQuery = enrollmentQuery.andWhere('academic_year', academic_year)
    }

    let student_enrollment = await enrollmentQuery.orderBy('id', 'desc').first()

    if (!student_enrollment) {
      return ctx.response.status(404).json({
        message: 'No student enrollment found for this student',
      })
    }

    // Check if the student already has a locked fee record (Cohort-Based Grandfathering Lock-in Rule)
    let existingFeeMaster = await StudentFeesMaster.query()
      .where('student_id', student_id)
      .first()

    let feesPlan_for_student: FeesPlan[] = []

    if (existingFeeMaster && existingFeeMaster.fees_plan_id) {
      // Grandfathering: Use the student's locked fee plan!
      let lockedPlan = await FeesPlan.query()
        .preload('fees_detail')
        .preload('quota')
        .preload('concession_for_plan', (query) => {
          query.preload('concession', (q) => q.andWhere('status', 'Active'))
          query.andWhere('status', 'Active')
        })
        .where('id', existingFeeMaster.fees_plan_id)
        .first()

      if (lockedPlan) {
        feesPlan_for_student = [lockedPlan]
      }
    }

    if (feesPlan_for_student.length === 0) {
      // Look up template matching student's enrollment cohort & quota
      let cohortYear = student_enrollment.academic_year || (typeof academic_year !== 'undefined' ? Number(academic_year) : 2024)
      let planQuery = FeesPlan.query()
        .preload('fees_detail')
        .preload('quota')
        .preload('concession_for_plan', (query) => {
          query.preload('concession', (q) => q.andWhere('status', 'Active'))
          query.andWhere('status', 'Active')
        })
        .where('class_id', student_enrollment.division.class_id)
        .andWhere('academic_year', cohortYear)
        .andWhere('status', 'Active')

      if (student_enrollment.quota_id) {
        let quotaPlan = await planQuery.clone().andWhere('quota_id', student_enrollment.quota_id).first()
        if (quotaPlan) feesPlan_for_student = [quotaPlan]
      }

      if (feesPlan_for_student.length === 0) {
        let generalPlan = await planQuery.clone().whereNull('quota_id').first()
        if (generalPlan) {
          feesPlan_for_student = [generalPlan]
        } else {
          let anyPlan = await planQuery.first()
          if (anyPlan) feesPlan_for_student = [anyPlan]
        }
      }
    }

    if (feesPlan_for_student.length === 0) {
      return ctx.response.status(404).json({
        message: 'No fees plan found for this student',
      })
    }

    let student = await Students.query()
      .select('id', 'first_name', 'middle_name', 'last_name', 'gr_no', 'first_year_roll_number', 'second_year_roll_number', 'third_year_roll_number', 'fourth_year_roll_number')
      .preload('fees_status', (query) => {
        query.preload('paid_fees', (query) => {
          query.preload('applied_concessions')
          // query.whereNotIn('payment_status', ['Failed', 'Disputed', 'Cancelled'])
          query.andWhereNot('status', 'Reversed')
        })
        query.preload('reversed_fees', (query) => {
          query.andWhere('status', 'Reversed')
        })
        query.preload('paid_fees_details')
        query.where('fees_plan_id', feesPlan_for_student[0].id)
      })
      .preload('provided_concession', (query) => {
        query.preload('concession', (query) => {
          query.andWhere('status', 'Active')
        })
        query.andWhere('status', 'Active')
      })
      .preload('academic_class', (query) => {
        query.preload('division', (query) => {
          query.preload('class', (query) => {
            query.select('id', 'class').where('school_id', ctx.auth.user!.school_id as number)
          })
        })
        query.where('academic_year', typeof academic_year !== 'undefined' ? academic_year : 2024)
      })
      .where('id', student_id)
      .andWhere('school_id', ctx.auth.user!.school_id!)
      .first()

    if (!student) {
      return ctx.response.status(404).json({
        message: 'Student not found',
      })
    }


    let feesDetails = await FeesPlanDetails.query()
      .preload('fees_type')
      .preload('installments_breakdown')
      .where('fees_plan_id', feesPlan_for_student[0].id)

    type ResType = {
      fees_plan: FeesPlan
      fees_details: FeesPlanDetails[]
      paid_fees: StudentFeesInstallments[]
      extra_fees: StudentFeesTypeMasters[]
      wallet: {
        total_concession_for_student: number
        total_concession_for_plan: number
      }
    }

    let res: ResType = {
      fees_details: [],
      fees_plan: {} as FeesPlan,
      paid_fees: [],
      extra_fees: [],
      wallet: {
        total_concession_for_student: 0,
        total_concession_for_plan: 0,
      },
    }

    let totalConcessionAmountForStudent = student.provided_concession.reduce(
      (acc: number, cons: ConcessionStudentMaster) => {
        if (cons.amount) {
          return acc + Number(cons.amount)
        }
        return acc
      },
      0
    )

    let totalConcessionPercentageForStudent = student.provided_concession.reduce(
      (acc: number, cons: ConcessionStudentMaster) => {
        if (cons.percentage) {
          if (cons.concession.concessions_to === 'plan') {
            return acc + (Number(cons.percentage) * Number(feesPlan_for_student[0].total_amount)) / 100
          } else {
            const matchingDetail = feesDetails.find(
              (detail) => detail.fees_type_id === cons.fees_type_id
            )
            if (matchingDetail) {
              return acc + (Number(cons.percentage) * Number(matchingDetail.total_amount)) / 100
            }
            return acc
          }
        }
        return acc
      },
      0
    )

    let totalConcessionForStudent =
      Number(totalConcessionAmountForStudent) + Number(totalConcessionPercentageForStudent)

    res.wallet.total_concession_for_student = totalConcessionForStudent

    let studentObj: any = { ...student.serialize() }

    if (!student.fees_status) {
      studentObj.fees_status = {
        student_id: student.id,
        academic_year: (typeof academic_year !== 'undefined' ? academic_year : 2024),
        fees_plan_id: feesPlan_for_student[0].id,
        discounted_amount: 0.0,
        paid_amount: 0.0,
        total_amount: feesPlan_for_student[0].total_amount,
        due_amount: 0.00,
        status: 'Pending',
      }
    } else {
      let paidFees = await StudentFeesInstallments.query().where(
        'student_fees_master_id',
        student.fees_status.id
      )
      res.paid_fees = paidFees
    }

    res.fees_plan = feesPlan_for_student[0]
    res.fees_details = feesDetails

    type InstallmentForFeesStatusOfStudent = {
      id: number
      installment_no: number
      installment_amount: string
      paid_amount: string
      due_date: Date
      payment_status: 'Paid' | 'Unpaid' | 'Partially Paid'
      is_paid: boolean
      discounted_amount: string | null
      payment_date: Date | null
      transaction_reference: string | null
      remaining_amount: string
      carry_forward_amount: string | null
      amount_paid_as_carry_forward: string | null
      applied_concession:
      | {
        concession_id: number
        applied_amount: number
      }[]
      | null
    }

    type TypeForFeesStatusOfStudent = {
      id: number
      fees_plan_id: number
      fees_type_id: number
      installment_type: string
      total_installment: number
      total_amount: string
      paid_amount: string
      discounted_amount: string
      due_amount: string
      concession_amount: number | null
      installments_breakdown: InstallmentForFeesStatusOfStudent[]
    }

    let FeesStatusForStudent: TypeForFeesStatusOfStudent[] = []

    for (let i = 0; i < feesDetails.length; i++) {
      let installment_breakDowns: InstallmentBreakDowns[] = feesDetails[i].installments_breakdown

      let total_due_amount = 0.0

      let fees_plan_detail_for_indexed_feees_type =
        student.fees_status && student.fees_status.paid_fees_details
          ? student.fees_status.paid_fees_details.find(
            (fees_plan) => fees_plan.fees_plan_details_id === feesDetails[i].id
          )
          : null

      if (fees_plan_detail_for_indexed_feees_type) {
        total_due_amount = fees_plan_detail_for_indexed_feees_type.due_amount
      }

      let paid_installments_for_fees_type =
        student.fees_status && student.fees_status
          ? student.fees_status.paid_fees.filter(
            (paid_installment, index, self) =>
              installment_breakDowns.some(
                (installment) => installment.id === paid_installment.installment_id
              ) &&
              self.findIndex(
                (item) => item.installment_id === paid_installment.installment_id
              ) === index
          )
          : []

      let applied_concession = student.provided_concession.filter(
        (concession) => concession.fees_type_id === feesDetails[i].fees_type_id
      )

      let installment_status: InstallmentForFeesStatusOfStudent[] = []

      for (let j = 0; j < installment_breakDowns.length; j++) {
        let installment = installment_breakDowns[j]

        // console.log('applied_concession', applied_concession)

        let distributed_concession_amount: {
          concession_id: number
          applied_amount: number
        }[] = applied_concession.map((concession) => {
          let left_concession_amount =
            (concession.amount
              ? Number(concession.amount)
              : (Number(concession.percentage) / 100) * Number(feesDetails[i].total_amount)) -
            concession.applied_discount

          return {
            concession_id: concession.concession_id,
            applied_amount:
              Number(left_concession_amount) /
              (installment_breakDowns.length - paid_installments_for_fees_type.length),
          }
        })

        if (student.fees_status) {
          let paid_installments = student.fees_status.paid_fees.filter(
            (paid_installment) => paid_installment.installment_id === installment.id
          )

          if (paid_installments.length > 0) {
            for (let k = 0; k < paid_installments.length; k++) {
              let paid_installment = paid_installments[k]

              installment_status.push({
                id: installment.id,
                installment_no: installment.installment_no,
                installment_amount: installment.installment_amount.toString(),
                paid_amount: paid_installment.paid_amount.toString(),
                discounted_amount: paid_installment.discounted_amount.toString(),
                remaining_amount: paid_installment.remaining_amount.toString(),
                carry_forward_amount:
                  Number(feesDetails[i].total_installment) - Number(installment.installment_no) ===
                    0 ||
                    (j === installment_breakDowns.length - 1 && k === paid_installments.length - 1)
                    ? total_due_amount.toString()
                    : '0.00',
                due_date: installment.due_date,
                payment_status:
                  (parseFloat(total_due_amount.toString()) > 0 &&
                    Number(feesDetails[i].total_installment) -
                    Number(installment.installment_no) ===
                    0) ||
                    (j === installment_breakDowns.length - 1 && k === paid_installments.length - 1)
                    ? 'Partially Paid'
                    : 'Paid',
                is_paid: true,
                payment_date: paid_installment.payment_date,
                transaction_reference: paid_installment.transaction_reference,
                amount_paid_as_carry_forward: paid_installment.amount_paid_as_carry_forward
                  ? paid_installment.amount_paid_as_carry_forward.toString()
                  : '0.00',
                applied_concession: null,
              })
            }
          } else {
            let carry_forwarded_amount = total_due_amount
            total_due_amount = 0.0
            installment_status.push({
              id: installment.id,
              installment_no: installment.installment_no,
              installment_amount: installment.installment_amount.toString(),
              due_date: installment.due_date,
              payment_status: 'Unpaid',
              is_paid: false,
              payment_date: null,
              remaining_amount: '0.00',
              transaction_reference: null,
              discounted_amount: distributed_concession_amount
                .reduce((acc, curr) => {
                  return acc + curr.applied_amount
                }, 0)
                .toString(),
              paid_amount: '0.00',
              carry_forward_amount: carry_forwarded_amount.toString(),
              amount_paid_as_carry_forward: '0.00',
              applied_concession: distributed_concession_amount,
            })
          }
        } else {
          let carry_forwarded_amount = total_due_amount
          total_due_amount = 0.0
          installment_status.push({
            id: installment.id,
            installment_no: installment.installment_no,
            installment_amount: installment.installment_amount.toString(),
            due_date: installment.due_date,
            payment_status: 'Unpaid',
            is_paid: false,
            payment_date: null,
            remaining_amount: '0.00',
            transaction_reference: null,
            discounted_amount: distributed_concession_amount
              .reduce((acc, curr) => {
                return acc + curr.applied_amount
              }, 0)
              .toString(),
            carry_forward_amount: carry_forwarded_amount.toString(),
            paid_amount: '0.00',
            amount_paid_as_carry_forward: '0.00',
            applied_concession: distributed_concession_amount,
          })
        }
      }

      FeesStatusForStudent.push({
        id: feesDetails[i].id,
        fees_plan_id: feesDetails[i].fees_plan_id,
        fees_type_id: feesDetails[i].fees_type_id,
        installment_type: feesDetails[i].installment_type,
        total_installment: feesDetails[i].total_installment,
        total_amount: feesDetails[i].total_amount.toString(),
        paid_amount: fees_plan_detail_for_indexed_feees_type
          ? fees_plan_detail_for_indexed_feees_type.paid_amount.toString()
          : '0.00',
        discounted_amount: fees_plan_detail_for_indexed_feees_type
          ? fees_plan_detail_for_indexed_feees_type.discounted_amount.toString()
          : '0.00',
        due_amount: fees_plan_detail_for_indexed_feees_type
          ? fees_plan_detail_for_indexed_feees_type.due_amount.toString()
          : '0.00',
        concession_amount: null,
        installments_breakdown: installment_status,
      })
    }


    // // fetch extra Fees applied for student
    // let extra_fees = await StudentFeesTypeMasters.query()
    //   .preload('paid_installment', (query) => {
    //     // query.whereNotIn('payment_status', ['Failed', 'Disputed', 'Cancelled'])
    //     query.andWhereNot('status', 'Reversed')
    //   })
    //   .preload('installment_breakdown')
    //   .where('student_enrollments_id', student_enrollment.id)
    //   .andWhere('fees_plan_id', feesPlan_for_student[0].id)
    //   .andWhere('status', 'Active')

    // if (extra_fees) {
    //   res.extra_fees = [...extra_fees]
    // }


    // ...existing code...

    // fetch extra Fees applied for student
    let extra_fees = await StudentFeesTypeMasters.query()
      .preload('paid_installment', (query) => {
        query.andWhereNot('status', 'Reversed')
      })
      .preload('installment_breakdown')
      .where('student_enrollments_id', student_enrollment.id)
      .andWhere('fees_plan_id', feesPlan_for_student[0].id)
      .andWhere('status', 'Active')

    let extra_fees_installments: any[] = []

    if (extra_fees && extra_fees.length > 0) {
      for (const extra of extra_fees) {
        // Group paid installments by installment_id for quick lookup
        const paidMap = new Map<number, StudentExtraFeesInstallment>()
        for (const paid of extra.paid_installment) {
          paidMap.set(paid.installment_id, paid)
        }

        let breakdowns = extra.installment_breakdown
        // let total_due_amount = Number(extra.total_amount) - Number(extra.paid_amount)

        let breakdown_status = breakdowns.map((installment) => {
          const paid = paidMap.get(installment.id)
          if (paid) {
            // Paid or partially paid
            const remaining = Number(installment.installment_amount) - Number(paid.paid_amount)
            return {
              id: installment.id,
              installment_no: installment.installment_no,
              installment_amount: installment.installment_amount.toString(),
              paid_amount: paid.paid_amount.toString(),
              due_date: installment.due_date,
              payment_status: remaining > 0 ? 'Partially Paid' : 'Paid',
              is_paid: true,
              payment_date: paid.payment_date,
              remaining_amount: remaining.toFixed(2),
              transaction_reference: paid.transaction_reference,
              discounted_amount: paid.discounted_amount ? paid.discounted_amount.toString() : '0.00',
              carry_forward_amount: paid.amount_paid_as_carry_forward ? paid.amount_paid_as_carry_forward.toString() : '0.00',
              amount_paid_as_carry_forward: paid.amount_paid_as_carry_forward ? paid.amount_paid_as_carry_forward.toString() : '0.00',
              applied_concession: null,
            }
          } else {
            // Not paid
            return {
              id: installment.id,
              installment_no: installment.installment_no,
              installment_amount: installment.installment_amount.toString(),
              paid_amount: '0.00',
              due_date: installment.due_date,
              payment_status: 'Unpaid',
              is_paid: false,
              payment_date: null,
              remaining_amount: installment.installment_amount.toString(),
              transaction_reference: null,
              discounted_amount: '0.00',
              carry_forward_amount: '0.00',
              amount_paid_as_carry_forward: '0.00',
              applied_concession: null,
            }
          }
        })

        extra_fees_installments.push({
          id: extra.id,
          fees_type_id: extra.fees_type_id,
          total_amount: extra.total_amount.toString(),
          paid_amount: extra.paid_amount.toString(),
          due_amount: (Number(extra.total_amount) - Number(extra.paid_amount)).toString(),
          installments_breakdown: breakdown_status,
        })
      }
    }

    // ...existing code...

    return ctx.response.json({
      student: studentObj,
      installments: FeesStatusForStudent,
      detail: res,
      extra_fees: extra_fees,
      extra_fees_installments, // <-- add this to your response
    })

    // return ctx.response.json({
    //   student: studentObj,
    //   installments: FeesStatusForStudent,
    //   detail: res,
    //   extra_fees_installments
    // })

  }

  async payMultipleInstallments(ctx: HttpContext) {
    const payload = await CreateValidationForMultipleInstallments.validate(ctx.request.body())
    let academic_year = ctx.request.input('academic_year') || ctx.request.input('academic_session') || ctx.request.input('academic_session_id')
    let student_id = payload.student_id

    if (!student_id) {
      return ctx.response.status(400).json({
        message: 'Please provide student_id',
      })
    }


    let student_enrollment = await StudentEnrollments.query()
      .preload('division')
      .where('student_id', student_id)
      .andWhere('academic_year', academic_year as number)
      .andWhereIn('status', ['pursuing', 'onboarded'])
      .first()

    if (!student_enrollment) {
      return ctx.response.status(404).json({
        message: 'No student enrollment found for this student',
      })
    }

    // Resolve the plan exactly like fetchFeesStatusForSingleStudent: locked plan first,
    // then the student's quota plan, then a general plan, then any active plan.
    let feesPlan_for_student: FeesPlan[] = []
    const existingFeeMasterForPlan = await StudentFeesMaster.query()
      .where('student_id', student_id)
      .first()

    if (existingFeeMasterForPlan && existingFeeMasterForPlan.fees_plan_id) {
      const lockedPlan = await FeesPlan.query()
        .preload('fees_detail')
        .where('id', existingFeeMasterForPlan.fees_plan_id)
        .first()
      if (lockedPlan) feesPlan_for_student = [lockedPlan]
    }

    if (feesPlan_for_student.length === 0) {
      const planQuery = FeesPlan.query()
        .preload('fees_detail')
        .where('class_id', student_enrollment.division.class_id)
        .andWhere('academic_year', student_enrollment.academic_year || Number(academic_year))
        .andWhere('status', 'Active')

      if (student_enrollment.quota_id) {
        const quotaPlan = await planQuery
          .clone()
          .andWhere('quota_id', student_enrollment.quota_id)
          .first()
        if (quotaPlan) feesPlan_for_student = [quotaPlan]
      }
      if (feesPlan_for_student.length === 0) {
        const generalPlan = await planQuery.clone().whereNull('quota_id').first()
        const anyPlan = generalPlan || (await planQuery.clone().first())
        if (anyPlan) feesPlan_for_student = [anyPlan]
      }
    }

    if (feesPlan_for_student.length === 0) {
      return ctx.response.status(404).json({
        message: 'No fees plan found for this student',
      })
    }

    let student = await Students.query()
      .select('id', 'first_name', 'middle_name', 'last_name', 'gr_no', 'first_year_roll_number', 'second_year_roll_number', 'third_year_roll_number', 'fourth_year_roll_number')
      // .preload('fees_status', (query) => {
      //   query.preload('paid_fees', (query) => {
      //     query.preload('applied_concessions')
      //   })
      //   query.preload('paid_fees_details')
      //   query.where('fees_plan_id', feesPlan_for_student[0].id)
      // })
      .preload('fees_status', (query) => {
        query.preload('paid_fees', (query) => {
          query.preload('applied_concessions')
          // query.whereNotIn('payment_status', ['Failed', 'Disputed', 'Cancelled'])
          query.andWhereNot('status', 'Reversed')
        })
        query.preload('paid_fees_details')
        query.where('fees_plan_id', feesPlan_for_student[0].id)
      })
      .preload('provided_concession', (query) => {
        query.preload('concession', (query) => {
          query.where('status', 'Active')
        })
        query.where('status', 'Active')
      })
      .preload('academic_class', (query) => {
        query.preload('division', (query) => {
          query.preload('class', (query) => {
            query.select('id', 'class').where('school_id', ctx.auth.user!.school_id as number)
          })
        })
        query.where('academic_year', typeof academic_year !== 'undefined' ? academic_year : 2024)
      })
      .where('id', student_id)
      .andWhere('school_id', ctx.auth.user!.school_id!)
      .first()

    if (!student) {
      return ctx.response.status(404).json({
        message: 'Student not found',
      })
    }

    let total_paid_amount = payload.installments.reduce(
      (acc: number, installment: any) => acc + Number(installment.paid_amount),
      0
    )

    let total_discount = payload.installments.reduce(
      (acc: number, installment: any) => acc + Number(installment.discounted_amount),
      0
    )

    let total_paid_carry_forwarded_amount = payload.installments.reduce(
      (acc: number, installment: any) =>
        acc +
        Number(installment.amount_paid_as_carry_forward) +
        (installment.repaid_installment === true ? installment.paid_amount : 0),
      0
    )

    let trx = await db.transaction()
    let result_status = 500
    let result_message = 'Internal Server Error'
    try {
      /**
       * Update Student Fees Status
       */

      if (!student.fees_status) {
        let studentFeesMaster = await StudentFeesMaster.create(
          {
            student_id: student_id,
            fees_plan_id: feesPlan_for_student[0].id,
            academic_year: (typeof academic_year !== 'undefined' ? academic_year : 2024),
            discounted_amount: total_discount,
            paid_amount: Number(total_paid_amount),
            total_amount: feesPlan_for_student[0].total_amount,
            due_amount: Math.max(
              Number(feesPlan_for_student[0].total_amount) -
                (Number(total_paid_amount) + Number(total_discount)),
              0
            ),
            status:
              feesPlan_for_student[0].total_amount - (Number(total_paid_amount) + Number(total_discount)) === 0
                ? 'Paid'
                : 'Partially Paid',
          },
          { client: trx }
        )
        student.fees_status = studentFeesMaster as HasOne<typeof StudentFeesMaster>
      } else {
        await student.fees_status
          .merge({
            paid_amount:
              Number(student.fees_status!.paid_amount) +
              Number(total_paid_amount) +
              Number(total_paid_carry_forwarded_amount),
            due_amount: Math.max(
              Number(student.fees_status!.total_amount) -
                (Number(student.fees_status!.paid_amount) +
                  Number(total_paid_amount) +
                  Number(total_paid_carry_forwarded_amount) +
                  Number(student.fees_status!.discounted_amount) +
                  Number(total_discount)),
              0
            ),
            discounted_amount:
              Number(student.fees_status!.discounted_amount) + Number(total_discount),
            status:
              Number(student.fees_status.total_amount) -
                Number(
                  Number(student.fees_status!.paid_amount) +
                  Number(total_paid_amount) +
                  Number(student.fees_status!.discounted_amount) +
                  Number(total_discount) +
                  Number(total_paid_carry_forwarded_amount)
                ) ===
                0
                ? 'Paid'
                : 'Partially Paid',
          })
          .useTransaction(trx)
          .save()
      }

      type TypeForPaidInstallmentsOfDifferentFeesType = {
        fees_plan_detail_id: number
        intallments: {
          fee_plan_details_id: number
          installment_id: number
          paid_amount: number
          remaining_amount: number
          discounted_amount: number
          paid_as_refund: boolean
          refunded_amount: number
          payment_mode: 'Cash' | 'Online' | 'Bank Transfer' | 'Cheque' | 'UPI' | 'Full Discount'
          transaction_reference: String | null
          payment_date: Date
          remarks: string | null
          amount_paid_as_carry_forward: number | null
          repaid_installment: boolean
        }[]
      }

      let different_type_of_paid_installments: TypeForPaidInstallmentsOfDifferentFeesType[] = []

      let different_type_of_concession_applied: {
        concession_id: number
        total_amount: number
      }[] = []

      let paid_installments = payload.installments

      /**
       * Add paid installments to student fees installments table
       */

      for (let installment of paid_installments) {
        let fees_installment = await InstallmentBreakDowns.query()
          .andWhere('id', installment.installment_id)
          .where('fee_plan_details_id', installment.fee_plan_details_id)
          .first()

        if (!fees_installment) {
          result_status = 404
          result_message = `No installment found for installment number ${installment.installment_id}`
          throw new Error(result_message)
        }

        if (
          different_type_of_paid_installments.find(
            (item) => item.fees_plan_detail_id === installment.fee_plan_details_id
          )
        ) {
          let index = different_type_of_paid_installments.findIndex(
            (item) => item.fees_plan_detail_id === installment.fee_plan_details_id
          )
          different_type_of_paid_installments[index].intallments.push(installment)
        } else {
          different_type_of_paid_installments.push({
            fees_plan_detail_id: installment.fee_plan_details_id,
            intallments: [installment],
          })
        }

        let already_paid_installments = student.fees_status.paid_fees
          ? student.fees_status.paid_fees.filter(
            (paid_installment) => paid_installment.installment_id === fees_installment.id
          )
          : null

        if (already_paid_installments && already_paid_installments.length > 0) {
          /**
           *
           * In case of already paid installments, we need to update the paid amount and remaining amount
           *
           * when payment is been done partially for this installment and installment is last installment ,
           * then amount will be carry forward in same installment with status of Patially Paid installment.
           */

          let total_paid_amount_for_installment = already_paid_installments.reduce(
            (acc: number, paid_installment: StudentFeesInstallments) =>
              acc + Number(paid_installment.paid_amount),
            0
          )
          // let total_remaining_amount = already_paid_installments.reduce(
          //   (acc: number, paid_installment: StudentFeesInstallments) =>
          //     acc + Number(paid_installment.remaining_amount),
          //   0
          // )

          if (
            Number(total_paid_amount_for_installment) ===
            Number(fees_installment.installment_amount) + Number(installment.discounted_amount)
          ) {
            result_status = 400
            result_message = `Installment is already been paid`
            throw new Error(result_message)
          }

          // if (
          //   Number(total_remaining_amount) > 0 &&
          //   Number(total_remaining_amount) !== Number(installment.amount_paid_as_carry_forward)
          // ) {
          //   result_status = 400
          //   result_message = `Paid amount for installment number ${installment.installment_id} is not equals to remaining amount for this installment.`
          //   throw new Error(result_message)
          // }

          if (!installment.repaid_installment) {
            result_status = 400
            result_message =
              'Field "repaid_installment" should be true if paying remaining amount for same installment .'
            throw new Error(result_message)
          }

          // if (Number(installment.amount_paid_as_carry_forward) !== 0) {
          //   result_status = 400
          //   result_message = `Amount paid as carry forward amount should be 0 , (Installments is bieng paid for seconed time to pay remaining amount in case where installment is last and there can not be any carry forward available . ).`
          //   throw new Error(result_message)
          // }

          if (Number(installment.discounted_amount) !== 0) {
            result_status = 400
            result_message = `Discounted amount should be 0 , (Installments is bieng paid for seconed time to pay remaining amount . ).`
            throw new Error(result_message)
          }

          // console.log(
          //   'already_paid_installments[0].paid_amount',
          //   installment.remaining_amount,
          //   installment.amount_paid_as_carry_forward,
          //   installment.remaining_amount == 0 ? 0 : installment.amount_paid_as_carry_forward
          // )

          await StudentFeesInstallments.create(
            {
              student_fees_master_id: already_paid_installments[0].student_fees_master_id,
              installment_id: already_paid_installments[0].installment_id,
              paid_amount: Number(installment.paid_amount),
              remaining_amount: 0.0, // added static value to avoid confusion in case of carry forward amount.,
              discounted_amount: 0.0,
              payment_mode: installment.payment_mode,
              transaction_reference: installment.transaction_reference,
              payment_date: installment.payment_date,
              remarks: installment.remarks,
              status: fees_installment.due_date < new Date() ? 'Paid Late' : 'Paid',
              payment_status: (installment.payment_mode === 'Cash' || installment.payment_mode === 'Full Discount') ? 'Success' : 'In Progress',
              amount_paid_as_carry_forward:
                installment.remaining_amount > 0 ? 0 : installment.amount_paid_as_carry_forward,
            },
            { client: trx }
          )
        } else {
          /**
           * Verfiy if amount  paid is not more then the pre-defined installment amount.
           */
          if (
            Number(fees_installment.installment_amount) !==
            Number(installment.paid_amount) +
            Number(installment.discounted_amount) +
            Number(installment.remaining_amount) // fees_installment.installment_amount - Number(installment.paid_amount) +
            // + Number(installment.remaining_amount)
          ) {
            result_status = 400
            result_message = `Paid amount for installment number ${installment.installment_id} is not equals to installment amount.`
            throw new Error(result_message)
          }

          if (installment.repaid_installment) {
            result_status = 400
            result_message =
              'Field "repaid_installment" should be false if paying installment for first time .'
            throw new Error(result_message)
          }

          if (installment.discounted_amount == 0 && installment.applied_concessions) {
            result_status = 400
            result_message = ` applied_concessions should be null if no discount is been applied .`
            throw new Error(result_message)
          }

          if (installment.discounted_amount !== 0 && !installment.applied_concessions) {
            result_status = 400
            result_message = `If Discounted is applied then please provide applied_concessions.`
            throw new Error(result_message)
          }

          let fees_deails_for_installment_type = student.fees_status.paid_fees_details
            ? student.fees_status.paid_fees_details.find(
              (item) => item.fees_plan_details_id === installment.fee_plan_details_id
            )
            : null

          if (fees_deails_for_installment_type && installment.amount_paid_as_carry_forward) {
            if (
              fees_deails_for_installment_type.due_amount <
              Number(installment.amount_paid_as_carry_forward)
            ) {
              result_status = 400
              result_message = `Paid carry forwarded amount for installment number ${installment.installment_id} can not be more then due amount of this installment.`
              throw new Error(result_message)
            }
          }

          /**
           * Verify applied concession
           */

          if (installment.discounted_amount !== 0 && installment.applied_concessions) {
            for (let p = 0; p < installment.applied_concessions.length; p++) {
              let applied_concession = student.provided_concession.find(
                (concession) =>
                  concession.concession_id === installment.applied_concessions![p].concession_id
              )

              if (!applied_concession) {
                result_status = 404
                result_message = `No Concession (Id : ${installment.applied_concessions[p].concession_id}) is found for this student.`
                throw new Error(result_message)
              }
            }
          }

          let new_paid_installment = await StudentFeesInstallments.create(
            {
              student_fees_master_id: student.fees_status.id,
              installment_id: fees_installment.id,
              paid_amount: Number(installment.paid_amount),
              remaining_amount:
                Number(fees_installment.installment_amount) -
                (Number(installment.paid_amount) + Number(installment.discounted_amount)),
              discounted_amount: Number(installment.discounted_amount),
              payment_mode: installment.payment_mode,
              transaction_reference: installment.transaction_reference,
              payment_date: installment.payment_date,
              remarks: installment.remarks,
              status: fees_installment.due_date < new Date() ? 'Paid Late' : 'Paid',
              payment_status: (installment.payment_mode === 'Cash' || installment.payment_mode === 'Full Discount') ? 'Success' : 'In Progress',
              amount_paid_as_carry_forward: installment.amount_paid_as_carry_forward
                ? Number(installment.amount_paid_as_carry_forward)
                : 0.0,
            },
            { client: trx }
          )

          if (installment.applied_concessions) {
            for (let p = 0; p < installment.applied_concessions.length; p++) {
              let index = different_type_of_concession_applied.findIndex(
                (concession) =>
                  concession.concession_id === installment.applied_concessions![p].concession_id
              )

              if (index !== -1) {
                different_type_of_concession_applied[index].total_amount +=
                  installment.applied_concessions![p].applied_amount ?? 0
              } else {
                different_type_of_concession_applied.push({
                  concession_id: installment.applied_concessions![p].concession_id,
                  total_amount: installment.applied_concessions![p].applied_amount ?? 0,
                })
              }

              await ConcessionsInstallmentMasters.create(
                {
                  concession_id: installment.applied_concessions![p].concession_id,
                  student_fees_installment_id: new_paid_installment.id,
                  concession_amount: installment.applied_concessions[p]!.applied_amount ?? 0,
                  applied_amount: installment.applied_concessions[p]!.applied_amount ?? 0,
                },
                { client: trx }
              )
            }
          }
        }
      }

      /**
       *
       * Need to update student fees plan master ,
       * which maintain records of all installments paid for perticualt fees type.
       */

      for (let i = 0; i < different_type_of_paid_installments.length; i++) {
        let fees_plan_details_for_fees_type = student.fees_status.paid_fees_details
          ? student.fees_status.paid_fees_details.find(
            (item) =>
              item.fees_plan_details_id ===
              different_type_of_paid_installments[i].fees_plan_detail_id
          )
          : null

        if (fees_plan_details_for_fees_type) {
          // Calculate values before using them in transaction
          const newPaidAmount =
            Number(fees_plan_details_for_fees_type.paid_amount) +
            different_type_of_paid_installments[i].intallments.reduce(
              (acc: number, installment: { paid_amount: number }) =>
                acc + Number(installment.paid_amount),
              0
            ) +
            different_type_of_paid_installments[i].intallments.reduce(
              (acc: number, installment: { amount_paid_as_carry_forward: number | null }) =>
                acc +
                (installment.amount_paid_as_carry_forward
                  ? Number(installment.amount_paid_as_carry_forward)
                  : 0),
              0
            )

          const newDueAmount =
            Number(fees_plan_details_for_fees_type.due_amount) +
            different_type_of_paid_installments[i].intallments.reduce(
              (acc: number, installment: { remaining_amount: number }) =>
                acc + Number(installment.remaining_amount),
              0
            ) -
            different_type_of_paid_installments[i].intallments.reduce(
              (
                acc: number,
                installment: {
                  amount_paid_as_carry_forward: number | null
                  repaid_installment: boolean
                  paid_amount: number
                }
              ) =>
                acc +
                (installment.amount_paid_as_carry_forward
                  ? Number(installment.amount_paid_as_carry_forward)
                  : 0) +
                (installment.repaid_installment === true ? installment.paid_amount : 0),
              0
            )

          const newDiscountedAmount =
            Number(fees_plan_details_for_fees_type.discounted_amount) +
            different_type_of_paid_installments[i].intallments.reduce(
              (acc: number, installment: { discounted_amount: number }) =>
                acc + Number(installment.discounted_amount),
              0
            )

          await fees_plan_details_for_fees_type
            .merge({
              paid_amount: newPaidAmount,
              due_amount: newDueAmount,
              discounted_amount: newDiscountedAmount,
              status:
                Number(fees_plan_details_for_fees_type.total_amount) -
                  (Number(newPaidAmount) + Number(newDiscountedAmount)) ===
                  0
                  ? 'Paid'
                  : 'Partially Paid',
            })
            .useTransaction(trx)
            .save()
        } else {
          let paid_amount = different_type_of_paid_installments[i].intallments.reduce(
            (acc: number, installment: { paid_amount: number }) =>
              acc + Number(installment.paid_amount),
            0
          )

          let due_amount = different_type_of_paid_installments[i].intallments.reduce(
            (acc: number, installment: { remaining_amount: number }) =>
              acc + Number(installment.remaining_amount),
            0
          )

          let discounted_amount = different_type_of_paid_installments[i].intallments.reduce(
            (acc: number, installment: { discounted_amount: number }) =>
              acc + Number(installment.discounted_amount),
            0
          )

          let total_amount = feesPlan_for_student[0].fees_detail.find(
            (item) => item.id === different_type_of_paid_installments[i].fees_plan_detail_id
          )!.total_amount

          await StudentFeesPlanMaster.create(
            {
              student_fees_master_id: student.fees_status.id,
              fees_plan_details_id: different_type_of_paid_installments[i].fees_plan_detail_id,
              paid_amount: paid_amount,
              due_amount: due_amount,
              total_amount: total_amount,
              discounted_amount: discounted_amount,
              status:
                Number(total_amount) - (Number(paid_amount) + Number(discounted_amount)) === 0
                  ? 'Paid'
                  : 'Partially Paid',
            },
            { client: trx }
          )
        }
      }

      /**
       *
       * Need to update Concession Student MASTER ,
       * which maintain records of how much total amount of concession is beem used for pearticular type.
       */

      for (let i = 0; i < different_type_of_concession_applied.length; i++) {

        let concession_student_master = await ConcessionStudentMaster.query()
          .where('concession_id', different_type_of_concession_applied[i].concession_id)
          .andWhere('student_id', student.id)
          .andWhere('academic_year', typeof academic_year !== 'undefined' ? academic_year : 2024)
          .first()

        if (!concession_student_master) {
          result_status = 500
          result_message = `No Concession Student Master found (Id : ${different_type_of_concession_applied[i].concession_id}).`
          throw new Error(result_message)
        } else {
          await concession_student_master
            .merge({
              applied_discount:
                Number(concession_student_master.applied_discount) +
                Number(different_type_of_concession_applied[i].total_amount ?? 0),
            })
            .useTransaction(trx)
            .save()
        }
      }

      await trx.commit()
      return ctx.response.status(201).json({
        message: 'Installments paid successfully',
      })
    } catch (error) {
      console.log('error', error)
      await trx.rollback()
      return ctx.response.status(result_status).json({
        message: result_message,
        error: error,
      })
    }

  }

  async updateStatusOfPaidInstallments(ctx: HttpContext) {
    let transaction_id = ctx.params.transaction_id;
    let stundet_fees_master_id = ctx.params.stundet_fees_master_id;
    let is_extar_fees = ctx.request.input('is_extra_fees', false);

    let transaction: StudentFeesInstallments | StudentExtraFeesInstallment | null = null

    if (is_extar_fees == "false") {
      console.log("Updating normal fees installment")
      transaction = await StudentFeesInstallments.query()
        .where('id', transaction_id)
        .andWhere('student_fees_master_id', stundet_fees_master_id)
        .first();
    } else {
      console.log("Updating Extra fees installment")
      transaction = await StudentExtraFeesInstallment.query()
        .where('id', transaction_id)
        .andWhere('student_fees_master_id', stundet_fees_master_id)
        .first();
    }
    if (!transaction) {
      return ctx.response.status(404).json({
        message: 'Transaction not found',
      });
    }
    let payload = await UpdateValidationFprPaidInstallment.validate(ctx.request.body());
    let trx = await db.transaction();
    try {
      await transaction.merge(payload).useTransaction(trx).save();
      await trx.commit();
      return ctx.response.status(201).json(transaction);
    }
    catch (error) {
      await trx.rollback();
      return ctx.response.status(500).json({
        message: 'Internal Server Error',
        error: error,
      });
    }
  }

  async reversePaidInstallments(ctx: HttpContext) {
    let transaction_id = ctx.params.transaction_id;
    let stundet_fees_master_id = ctx.params.stundet_fees_master_id;
    let is_extar_fees = ctx.request.input('is_extra_fees', false);
    let { remarks } = ctx.request.all();
    if (is_extar_fees == "false") {
      let transaction = await StudentFeesInstallments.query()
        .preload('installment')
        .preload('applied_concessions')
        .where('id', transaction_id)
        .andWhere('student_fees_master_id', stundet_fees_master_id)
        .first();

      if (!transaction) {
        return ctx.response.status(404).json({
          message: 'Transaction not found',
        });
      }

      if (transaction.status !== 'Reversal Requested') {
        return ctx.response.status(400).json({
          message: 'Transaction is not in Reversal Requested status',
        });
      }

      let student_fees_master = await StudentFeesMaster.query()
        .where('id', stundet_fees_master_id)
        .first();

      if (!student_fees_master) {
        return ctx.response.status(404).json({
          message: 'Student Fees Master not found',
        });
      }

      // Now we need to reverse the transaction
      /***
       *  Update status of Installments
       *  
       *  student_fees_installments , update status to 'Reversal'
       *  student_fees_plan_masters , paid_amount , discounted_amount , due_amount
       *  student_fees_master , update paid_amount, due_amount, discounted_amount
       *  concessions_installment_masters , update status to 'Reversal'
       *  concessions_student_masters  , update applied_discount
       */

      let trx = await db.transaction();
      try {
        // upate status of installment
        await transaction.merge({
          status: 'Reversed',
          remarks: remarks,
        }).useTransaction(trx).save();

        // update student_fees_plan_masters
        let student_fees_plan_master = await StudentFeesPlanMaster.query()
          .where('student_fees_master_id', stundet_fees_master_id)
          .andWhere('fees_plan_details_id', transaction.installment.fee_plan_details_id)
          .first();

        if (!student_fees_plan_master) {
          await trx.rollback();
          return ctx.response.status(404).json({
            message: 'Fees Plan Details not found for this transaction',
          });
        }

        // console.log("paid" , Number(student_fees_plan_master.paid_amount) - (Number(transaction.paid_amount) + Number(transaction.amount_paid_as_carry_forward)))
        // console.log("discounted_amount" , Number(student_fees_plan_master.discounted_amount) - Number(transaction.discounted_amount))
        // console.log("due_amount" , (Number(student_fees_plan_master.due_amount) + Number(transaction.amount_paid_as_carry_forward)) - Number(transaction.remaining_amount))

        await student_fees_plan_master.merge({
          paid_amount: Number(student_fees_plan_master.paid_amount) - (Number(transaction.paid_amount) + Number(transaction.amount_paid_as_carry_forward)),  // 4000 - 750 
          discounted_amount: Number(student_fees_plan_master.discounted_amount) - Number(transaction.discounted_amount), //  XXX - 500
          due_amount: (Number(student_fees_plan_master.due_amount) - Number(transaction.remaining_amount)) + Number(transaction.amount_paid_as_carry_forward),
        }).useTransaction(trx).save();

        // update concessions_installment_masters
        if (transaction.applied_concessions && transaction.applied_concessions.length > 0) {
          for (let applied_concessions of transaction.applied_concessions) {

            await applied_concessions.merge({
              installment_status: 'Reversed',
            }).useTransaction(trx).save();

            // update concessions_student_masters
            let concession_student_master = await ConcessionStudentMaster.query()
              .where('concession_id', applied_concessions.concession_id)
              .andWhere('student_id', student_fees_master.student_id)
              .andWhere('academic_year', student_fees_master.academic_year as number)
              .first();

            if (!concession_student_master) {
              await trx.rollback();
              return ctx.response.status(404).json({
                message: 'Concession Student Master not found for this transaction',
              });
            }

            await concession_student_master.merge({
              applied_discount: Number(concession_student_master.applied_discount) - Number(applied_concessions.applied_amount),
            }).useTransaction(trx).save();
          }
        }

        // console.log("paid 2" , Number(student_fees_master.paid_amount) - (Number(transaction.paid_amount) + Number(transaction.amount_paid_as_carry_forward)))

        // update student_fees_master
        await student_fees_master.merge({
          paid_amount: Number(student_fees_master.paid_amount) - (Number(transaction.paid_amount) + Number(transaction.amount_paid_as_carry_forward)),
          discounted_amount: Number(student_fees_master.discounted_amount) - Number(transaction.applied_concessions.reduce(
            (acc: number, applied_concession: any) => acc + Number(applied_concession.applied_amount),
            0
          )),
          due_amount: (Number(student_fees_master.due_amount) - Number(transaction.remaining_amount)) + Number(transaction.amount_paid_as_carry_forward),
          status: student_fees_master.status === 'Paid' ? 'Partially Paid' : student_fees_master.status,
        }).useTransaction(trx).save();

        await trx.commit();
        return ctx.response.status(201).json({
          message: 'Transaction reversed successfully',
          transaction: transaction,
        });

      } catch (error) {
        await trx.rollback();
        return ctx.response.status(500).json({
          message: 'Internal Server Error',
          error: error,
        });
      }

    } else {
      // IMPLEMENTATION FOR EXTAR FEES INSTALLMENTS

      /**
       * Need to reverse the transaction
       * student_fees_type_mastersp
       */
      let transaction = await StudentExtraFeesInstallment.query()
        .where('id', transaction_id)
        .andWhere('student_fees_master_id', stundet_fees_master_id)
        .first();

      if (!transaction) {
        return ctx.response.status(404).json({
          message: 'Transaction not found',
        });
      }

      if (transaction.status !== 'Reversal Requested') {
        return ctx.response.status(400).json({
          message: 'Transaction is not in Reversal Requested status',
        });
      }

      let student_fees_master = await StudentFeesMaster.query()
        .where('id', stundet_fees_master_id)
        .first();

      if (!student_fees_master) {
        return ctx.response.status(404).json({
          message: 'Student Fees Master not found',
        });
      }


      let trx = await db.transaction();
      try {
        // Now we need to reverse the transaction
        // upate status of installment

        await transaction.merge({
          status: 'Reversed',
          remarks: remarks,
        }).useTransaction(trx).save();

        // update student_fees_type_masters
        let student_fees_type_master = await StudentFeesTypeMasters.query()
          // .where('student_enrollments_id', acadamic_session.id)
          .where('id', transaction.student_fees_type_masters_id)
          .first();
        if (!student_fees_type_master) {
          await trx.rollback();
          return ctx.response.status(404).json({
            message: 'Fees Type Master not found for this transaction',
          });
        }
        await student_fees_type_master.merge({
          paid_amount: Number(student_fees_type_master.paid_amount) - (Number(transaction.paid_amount) + Number(transaction.amount_paid_as_carry_forward)),  // 4000 - 750
          // discounted_amount: Number(student_fees_type_master.discounted_amount) - Number(transaction.discounted_amount), //  XXX - 500
          // due_amount: (Number(student_fees_type_master.due_amount) - Number(transaction.remaining_amount)) + Number(transaction.amount_paid_as_carry_forward),
        }).useTransaction(trx).save();

        // update student fees master
        await student_fees_master.merge({
          paid_amount: Number(student_fees_master.paid_amount) - (Number(transaction.paid_amount) + Number(transaction.amount_paid_as_carry_forward)),
          discounted_amount: Number(student_fees_master.discounted_amount) - Number(transaction.discounted_amount),
          due_amount: (Number(student_fees_master.due_amount) - Number(transaction.remaining_amount)) + Number(transaction.amount_paid_as_carry_forward),
          status: student_fees_master.status === 'Paid' ? 'Partially Paid' : student_fees_master.status,
        }).useTransaction(trx).save();

        await trx.commit();
        return ctx.response.status(201).json({
          message: 'Transaction reversed successfully',
          transaction: transaction,
        });

      } catch (error) {
        await trx.rollback();
        return ctx.response.status(500).json({
          message: 'Internal Server Error',
          error: error,
        });
      }
    }
  }

  async indexConcessionType(ctx: HttpContext) {
    let academic_year = ctx.request.input('academic_year') || ctx.request.input('academic_session') || ctx.request.input('academic_session_id')
    let status = ctx.request.input('status')
    let category = ctx.request.input('category')
    let search = ctx.request.input('search')
    let page = ctx.request.input('page', 1)

    if (!academic_year) {
      return ctx.response.status(400).json({
        message: 'Please provide academic_year or academic_session',
      })
    }

    let fetch_all = ctx.request.input('all', false)
    let concessions: Concessions[] = []
    if (!fetch_all) {
      let concessions = db
        .query()
        .from('concessions')
        .where('school_id', ctx.auth.user!.school_id as number)
        .andWhere('academic_year', academic_year as number)


      if (status !== 'all' && status !== 'All') {
        // console.log("Inside status")
        concessions.andWhere('status', status == 'active' ? 'Active' : 'Inactive')
      }

      if (category !== 'all' && category !== 'All') {
        // console.log("Inside cate")        
        concessions.andWhere('category', category)
      }

      if (search !== '' && (search !== undefined && search !== 'undefined')) {
        // console.log("Inside search")
        concessions.andWhereILike('name', `%${search}%`)
        concessions.orWhereILike('description', `%${search}%`)
        // concessions.orWhereILike('applicable_to', `%${search}%`)
      }

      let responce = await concessions.paginate(page, 6)

      return ctx.response.json(responce)

    } else {
      concessions = await Concessions.query()
        .where('school_id', ctx.auth.user!.school_id as number)
        .andWhere('academic_year', academic_year as number)
      // .paginate(ctx.request.input('page', 1), 10);
      return ctx.response.json(concessions)
    }
  }

  async indexAllConcessionType(ctx: HttpContext) {
    let academic_year = ctx.request.input('academic_year') || ctx.request.input('academic_session') || ctx.request.input('academic_session_id')
    if (!academic_year) {
      return ctx.response.status(400).json({
        message: 'Please provide academic_year or academic_session',
      })
    }
    let concessions: Concessions[] = []
    concessions = await Concessions.query()
      .where('school_id', ctx.auth.user!.school_id as number)
      .andWhere('academic_year', academic_year as number)

    return ctx.response.json(concessions)
  }

  async fetchDetailConcessionType(ctx: HttpContext) {
    let concession_id = ctx.params.concession_id
    let academic_year = ctx.request.input('academic_year') || ctx.request.input('academic_session') || ctx.request.input('academic_session_id')
    let concession = await Concessions.query()
      .where('id', concession_id)
      .andWhere('academic_year', academic_year as number)
      .first()
    if (!concession) {
      return ctx.response.status(404).json({
        message: 'Concession not found',
      })
    }
    return ctx.response.json(concession)
  }

  async fetchConcessionHolderStudents(ctx: HttpContext) {
    let concession_id = ctx.params.concession_id
    let academic_year = ctx.request.input('academic_year') || ctx.request.input('academic_session') || ctx.request.input('academic_session_id')
    let class_id = ctx.request.input('class')
    let division_id = ctx.request.input('division')
    let search = ctx.request.input('search')


    let concession = await Concessions.query()
      .where('id', concession_id)
      .andWhere('academic_year', academic_year as number)
      .first()
    if (!concession) {
      return ctx.response.status(404).json({
        message: 'Concession not found',
      })
    }

    let students = db.query().from('concessions_student_masters')
      .select('concessions_student_masters.*',
        'students.first_name',
        'students.middle_name',
        'students.last_name',
        'students.gr_no',
        'students.first_year_roll_number',
        'students.second_year_roll_number',
        'students.third_year_roll_number',
        'students.fourth_year_roll_number',
        'd.class_id',
        'd.id as division_id',
        'fp.name as fees_plan_name',
        'ft.name as fees_type_name',
      )
      .where('concession_id', concession_id)
      .andWhere('concessions_student_masters.academic_year', academic_year)
      .leftJoin('students', 'concessions_student_masters.student_id', 'students.id')
      .join('student_enrollments as se', 'students.id', 'se.student_id')
      .join('divisions as d', 'se.division_id', 'd.id')
      .join('fees_plans as fp', 'concessions_student_masters.fees_plan_id', 'fp.id')
      .join('fees_types as ft', 'concessions_student_masters.fees_type_id', 'ft.id')

    if (class_id && class_id !== undefined && class_id !== 'undefined') {
      students.andWhere('d.class_id', class_id)
    }

    if (division_id && division_id !== undefined && division_id !== 'undefined') {
      students.andWhere('d.id', division_id)
    }

    if (search && search !== undefined && search !== 'undefined') {
      students.where('students.first_name', 'like', `%${search}%`)
        .orWhere('students.middle_name', 'like', `%${search}%`)
        .orWhere('students.last_name', 'like', `%${search}%`)
        .orWhere('students.gr_no', 'like', `%${search}%`)
        .orWhere('students.first_year_roll_number', 'like', `%${search}%`)
        .orWhere('students.second_year_roll_number', 'like', `%${search}%`)
        .orWhere('students.third_year_roll_number', 'like', `%${search}%`)
        .orWhere('students.fourth_year_roll_number', 'like', `%${search}%`)
    }


    let response = await students.paginate(ctx.request.input('page', 1), 6)

    return ctx.response.json(response)
  }

  async createConcession(ctx: HttpContext) {
    const payload = await CreateValidationForConcessionType.validate(ctx.request.body())



    if (ctx.auth.user!.role_id == 1 || ctx.auth.user!.role_id == 2) {
      let studentFeesMaster = await Concessions.create({
        ...payload,
        status: 'Active',
        school_id: ctx.auth.user!.school_id as number,
      })
      return ctx.response.status(201).json(studentFeesMaster)
    } else {
      return ctx.response.status(401).json({
        message: 'You are not authorized to perform this action !',
      })
    }
  }

  async updateConcession(ctx: HttpContext) {
    if (ctx.auth.user!.role_id == 1 || ctx.auth.user!.role_id == 2) {
      const payload = await UpdateValidationForConcessionType.validate(ctx.request.body())
      let concession_id = ctx.params.concession_id
      let concession = await Concessions.query().where('id', concession_id).first()
      if (!concession) {
        return ctx.response.status(404).json({
          message: 'Concession not found',
        })
      }


      if (payload.status && payload.status === 'Inactive') {
        if (concession.applicable_to === 'plan') {
          await ConcessionFeesPlanMaster.query()
            .where('concession_id', concession_id)
            .update({ status: 'Inactive' })
        }
        if (concession.applicable_to === 'students') {
          await ConcessionStudentMaster.query()
            .where('concession_id', concession_id)
            .update({ status: 'Inactive' })
        }
      }

      await concession.merge(payload).save()
      return ctx.response.status(201).json(concession)
    } else {
      return ctx.response.status(401).json({
        message: 'You are not authorized to perform this action !',
      })
    }
  }

  async applyConcessionToPlan(ctx: HttpContext) {
    if (ctx.auth.user!.role_id == 1 || ctx.auth.user!.role_id == 2) {
      const payload = await CreateValidationForApplyConcessionToPlan.validate(ctx.request.body())

      let fees_plan = await FeesPlan.query().where('id', payload.fees_plan_id).first()

      if (!fees_plan) {
        return ctx.response.status(404).json({
          message: 'Fees Plan not found',
        })
      }

      let acadamic_session = { id: fees_plan.academic_year, is_active: 1 }

      let concssion = await Concessions.query()
        .where('id', payload.concession_id)
        .andWhere('academic_year', acadamic_session.id)
        .andWhere('school_id', ctx.auth.user!.school_id!)
        .andWhere('status', 'Active')
        .first()

      if (!concssion) {
        return ctx.response.status(404).json({
          message: 'Concession not found',
        })
      }

      if (concssion.applicable_to !== 'plan') {
        return ctx.response.status(400).json({
          message: 'Concession is not applicable to plan',
        })
      }

      if (payload.deduction_type === 'fixed_amount' && !payload.amount) {
        return ctx.response.status(400).json({
          message: 'Amount is required for fixed amount deduction',
        })
      }

      if (payload.deduction_type === 'fixed_amount' && payload.percentage) {
        return ctx.response.status(400).json({
          message: 'Percentage should be null fixed amount deduction',
        })
      }

      if (payload.deduction_type === 'percentage' && !payload.percentage) {
        return ctx.response.status(400).json({
          message: 'Percentage is required for percentage deduction',
        })
      }

      if (payload.deduction_type === 'percentage' && payload.amount) {
        return ctx.response.status(400).json({
          message: 'Amount should be null for percentage deduction',
        })
      }

      if (payload.amount && payload.amount > fees_plan.total_amount) {
        return ctx.response.status(400).json({
          message: 'Concession amount cannot be greater than total fees amount',
        })
      }

      let trx = await db.transaction()
      let { fees_type_ids, ...payload_without_fees_type } = payload

      try {
        if (concssion.concessions_to === 'plan') {
          if (payload.fees_type_ids) {
            return ctx.response.status(400).json({
              message: 'fees_ids field should be null for this concession',
            })
          }
          await ConcessionFeesPlanMaster.create(
            {
              ...payload_without_fees_type,
              fees_type_id: null,
              academic_year: acadamic_session.id,
            },
            { client: trx }
          )
        } else {
          if (!fees_type_ids) {
            return ctx.response.status(400).json({
              message: 'fees_ids field is required for this concession',
            })
          }
          if (fees_type_ids.length === 0) {
            return ctx.response.status(400).json({
              message: 'fees_ids field is required for this concession',
            })
          }

          for (let i = 0; i < fees_type_ids.length; i++) {
            let fees_type = await FeesType.query()
              .where('id', fees_type_ids[i])
              .andWhere('academic_year', acadamic_session.id)
              .andWhere('school_id', ctx.auth.user!.school_id!)
              .first()

            if (!fees_type) {
              return ctx.response.status(404).json({
                message: `${fees_type_ids[i]} - fees type not found`,
              })
            }

            await ConcessionFeesPlanMaster.create(
              {
                ...payload_without_fees_type,
                fees_type_id: fees_type.id,
                academic_year: acadamic_session.id,
              },
              { client: trx }
            )
          }
        }
        await trx.commit()
        return ctx.response.status(201).json({
          message: 'Concession applied to plan successfully',
        })
      } catch (error) {
        await trx.rollback()
        return ctx.response.status(500).json({
          message: 'Internal Server Error',
          error: error,
        })
      }
    } else {
      return ctx.response.status(401).json({
        message: 'You are not authorized to perform this action !',
      })
    }
  }

  async updateAppliedConcessionToPlan(ctx: HttpContext) {
    let concession_id = ctx.params.concession_id
    let plan_id = ctx.params.plan_id

    if (ctx.auth.user!.role_id == 1 || ctx.auth.user!.role_id == 2) {
      const payload = await UpdateValidationForAppliedConcessionToPlan.validate(ctx.request.body())

      let concession_applied_to_plan = await ConcessionFeesPlanMaster.query()
        .preload('concession')
        .where('fees_plan_id', plan_id)
        .andWhere('concession_id', concession_id)
        .first()

      if (!concession_applied_to_plan) {
        return ctx.response.status(404).json({
          message: 'Concession not found',
        })
      }


      if (payload.deduction_type) {
        if (payload.deduction_type === 'fixed_amount' && !payload.amount) {
          return ctx.response.status(400).json({
            message: 'Amount is required for fixed amount deduction',
          })
        }

        if (payload.deduction_type === 'fixed_amount' && payload.percentage) {
          return ctx.response.status(400).json({
            message: 'Percentage should be null fixed amount deduction',
          })
        }

        if (payload.deduction_type === 'percentage' && !payload.percentage) {
          return ctx.response.status(400).json({
            message: 'Percentage is required for percentage deduction',
          })
        }

        if (payload.deduction_type === 'percentage' && payload.amount) {
          return ctx.response.status(400).json({
            message: 'Amount should be null for percentage deduction',
          })
        }

        if (payload.amount && payload.amount > concession_applied_to_plan.fees_plan.total_amount) {
          return ctx.response.status(400).json({
            message: 'Concession amount cannot be greater than total fees amount',
          })
        }
      }

      let trx = await db.transaction()

      try {
        if (
          payload.status === 'Active' &&
          concession_applied_to_plan.concession.status === 'Inactive'
        ) {
          await trx.rollback()
          return ctx.response.status(400).json({
            message: 'Concession Plan is not active , You can not modify this plan',
          })
        }
        ; (await concession_applied_to_plan.merge(payload).save()).useTransaction(trx)
        await trx.commit()
        return ctx.response.status(201).json({
          message: 'Concession applied to plan successfully',
        })
      } catch (error) {
        await trx.rollback()
        return ctx.response.status(500).json({
          message: 'Internal Server Error',
          error: error,
        })
      }
    } else {
      return ctx.response.status(401).json({
        message: 'You are not authorized to perform this action !',
      })
    }
  }

  async applyConcessionToStudent(ctx: HttpContext) {
    if (ctx.auth.user!.role_id == 1 || ctx.auth.user!.role_id == 2) {
      const payload = await CreateValidationForApplyConcessionToStudent.validate(ctx.request.body())

      let fees_plan = await FeesPlan.query()
        .preload('fees_detail')
        .where('id', payload.fees_plan_id)
        .first()

      console.log('fees_plan', fees_plan?.fees_detail)

      if (!fees_plan) {
        return ctx.response.status(404).json({
          message: 'Fees Plan not found',
        })
      }

      let acadamic_session = { id: fees_plan.academic_year, is_active: 1 }

      let studentEnrollment = await StudentEnrollments.query()
        // .preload('provided_concession')
        .where('student_id', payload.student_id)
        .where('academic_year', acadamic_session.id)
        .andWhereIn('status', ['pursuing', 'onboarded'])
        .first()

      let fees_status = await StudentFeesMaster.query()
        .preload('paid_fees_details')
        .where('student_id', payload.student_id)
        .andWhere('academic_year', acadamic_session.id)
        .first()

      let provided_concession = await ConcessionStudentMaster.query()
        .where('student_id', payload.student_id)
        .andWhere('academic_year', acadamic_session.id)

      if (!studentEnrollment) {
        return ctx.response.status(404).json({
          message: 'Student not found for this academic session',
        })
      }

      let concssion = await Concessions.query()
        .where('id', payload.concession_id)
        .andWhere('academic_year', acadamic_session.id)
        .andWhere('school_id', ctx.auth.user!.school_id!)
        .andWhere('status', 'Active')
        .first()

      if (!concssion) {
        return ctx.response.status(404).json({
          message: 'Concession not found',
        })
      }

      if (concssion.applicable_to !== 'students') {
        return ctx.response.status(400).json({
          message: 'Concession is not applicable to Student',
        })
      }
      if (payload.deduction_type === 'fixed_amount' && !payload.amount) {
        return ctx.response.status(400).json({
          message: 'Amount is required for fixed amount deduction',
        })
      }

      if (payload.deduction_type === 'fixed_amount' && payload.percentage) {
        return ctx.response.status(400).json({
          message: 'Percentage should be null fixed amount deduction',
        })
      }

      if (payload.deduction_type === 'percentage' && !payload.percentage) {
        return ctx.response.status(400).json({
          message: 'Percentage is required for percentage deduction',
        })
      }

      if (payload.deduction_type === 'percentage' && payload.amount) {
        return ctx.response.status(400).json({
          message: 'Amount should be null for percentage deduction',
        })
      }

      if (payload.amount && payload.amount > fees_plan.total_amount) {
        return ctx.response.status(400).json({
          message: 'Concession amount cannot be greater than total fees amount',
        })
      }

      let { fees_type_ids, ...payload_without_fees_type } = payload

      let trx = await db.transaction()

      try {
        if (concssion.concessions_to === 'plan') {
          if (payload.fees_type_ids) {
            return ctx.response.status(400).json({
              message: 'fees_ids field should be null for this concession',
            })
          }
          await ConcessionStudentMaster.create(
            {
              ...payload_without_fees_type,
              fees_type_id: null,
              academic_year: acadamic_session.id,
            },
            { client: trx }
          )
        } else {
          if (!fees_type_ids) {
            return ctx.response.status(400).json({
              message: 'fees_ids field is required for this concession',
            })
          }
          if (fees_type_ids.length === 0) {
            return ctx.response.status(400).json({
              message: 'fees_ids field is required for this concession',
            })
          }

          for (let i = 0; i < fees_type_ids.length; i++) {
            let fees_type = await FeesType.query()
              .where('id', fees_type_ids[i])
              .andWhere('academic_year', acadamic_session.id)
              .andWhere('school_id', ctx.auth.user!.school_id!)
              .first()

            if (!fees_type) {
              return ctx.response.status(404).json({
                message: `${fees_type_ids[i]} - fees type not found`,
              })
            }

            let total_amount =
              fees_plan.fees_detail.find((item) => item.fees_type_id === fees_type_ids[i])
                ?.total_amount || 0.0

            if (total_amount === 0) {
              return ctx.response.status(500).json({
                message: 'Something went wrong',
              })
            }

            let paid_amount = 0.0
            let remaining_amount_to_pay = total_amount
            let remaining_amount_after_apply_this_concession = 0.0

            if (fees_status && fees_status.paid_fees_details) {
              let fees_type_detail_for_student = fees_status.paid_fees_details.find(
                (item) => item.fees_plan_details_id === fees_type.id
              )
              if (fees_type_detail_for_student) {
                paid_amount =
                  Number(fees_type_detail_for_student.paid_amount) +
                  Number(fees_type_detail_for_student.due_amount)

                remaining_amount_to_pay -= Number(paid_amount)
              }

              remaining_amount_after_apply_this_concession =
                Number(remaining_amount_to_pay) -
                (payload_without_fees_type.amount
                  ? payload_without_fees_type.amount
                  : payload_without_fees_type.percentage
                    ? (total_amount * payload_without_fees_type.percentage) / 100
                    : 0)
            } else {
              remaining_amount_after_apply_this_concession =
                total_amount -
                (payload_without_fees_type.amount
                  ? payload_without_fees_type.amount
                  : payload_without_fees_type.percentage
                    ? (total_amount * payload_without_fees_type.percentage) / 100
                    : 0)
            }

            if (remaining_amount_after_apply_this_concession < 0) {
              return ctx.response.status(400).json({
                message: 'After appliying this concession, remaining amount will be in nagative',
                status: {
                  fees_type_id: fees_type.id,
                  applid_concession: provided_concession,
                  remaining_amount_after_apply_this_concession:
                    remaining_amount_after_apply_this_concession,
                },
              })
            }

            await ConcessionStudentMaster.create(
              {
                ...payload_without_fees_type,
                fees_type_id: fees_type.id,
                academic_year: acadamic_session.id,
              },
              { client: trx }
            )
          }
        }
        await trx.commit()
        return ctx.response.status(201).json({
          message: 'Concession applied to plan successfully',
        })
      } catch (error) {
        console.log('error', error)
        await trx.rollback()
        return ctx.response.status(500).json({
          message: 'Internal Server Error',
          error: error,
        })
      }
    } else {
      return ctx.response.status(401).json({
        message: 'You are not authorized to perform this action !',
      })
    }
  }

  async updateConcessionAppliedToStudent(ctx: HttpContext) {
    let concession_id = ctx.params.concession_id
    let student_id = ctx.params.student_id
    let plan_id = ctx.params.plan_id

    if (ctx.auth.user!.role_id == 1 || ctx.auth.user!.role_id == 2) {
      const payload = await UpdateValidationForAppliedConcessionToStudent.validate(
        ctx.request.body()
      )

      let concession_applied_to_student = await ConcessionStudentMaster.query()
        .preload('concession')
        .where('student_id', student_id)
        .andWhere('concession_id', concession_id)
        .andWhere('fees_plan_id', plan_id)
        .first()

      if (!concession_applied_to_student) {
        return ctx.response.status(404).json({
          message: 'Concession not found',
        })
      }


      if (payload.deduction_type) {
        if (payload.deduction_type === 'fixed_amount' && !payload.amount) {
          return ctx.response.status(400).json({
            message: 'Amount is required for fixed amount deduction',
          })
        }

        if (payload.deduction_type === 'fixed_amount' && payload.percentage) {
          return ctx.response.status(400).json({
            message: 'Percentage should be null fixed amount deduction',
          })
        }

        if (payload.deduction_type === 'percentage' && !payload.percentage) {
          return ctx.response.status(400).json({
            message: 'Percentage is required for percentage deduction',
          })
        }

        if (payload.deduction_type === 'percentage' && payload.amount) {
          return ctx.response.status(400).json({
            message: 'Amount should be null for percentage deduction',
          })
        }

        if (
          payload.amount &&
          payload.amount > concession_applied_to_student.fees_plan.total_amount
        ) {
          return ctx.response.status(400).json({
            message: 'Concession amount cannot be greater than total fees amount',
          })
        }
      }

      let trx = await db.transaction()

      try {
        if (
          payload.status === 'Active' &&
          concession_applied_to_student.concession.status === 'Inactive'
        ) {
          await trx.rollback()
          return ctx.response.status(400).json({
            message: 'Concession Plan is not active , You can not modify this plan',
          })
        }
        ; (await concession_applied_to_student.merge(payload).save()).useTransaction(trx)
        await trx.commit()
        return ctx.response.status(201).json({
          message: 'Concession applied to plan successfully',
        })
      } catch (error) {
        await trx.rollback()
        return ctx.response.status(500).json({
          message: 'Internal Server Error',
          error: error,
        })
      }
    } else {
      return ctx.response.status(401).json({
        message: 'You are not authorized to perform this action !',
      })
    }
  }

  async applyFeesTypeToStudentFeesPlan(ctx: HttpContext) {

    let payload = await CreateValidationForApplyExtraFeesToStudent.validate(ctx.request.body())

    let academic_enrollment = await StudentEnrollments.query()
      .preload('division')
      .where('student_id', payload.student_id)
      .andWhere('academic_year', payload.academic_year as number)
      .andWhereIn('status', ['pursuing', 'onboarded'])
      .first()

    if (!academic_enrollment) {
      return ctx.response.status(404).json({
        message: 'Student not found for this academic session',
      })
    }

    // check fees plan for class 
    let fees_paln = await FeesPlan.query()
      .where('id', payload.fees_plan_id)
      .andWhere('academic_year', payload.academic_year as number)
      .andWhere('class_id', academic_enrollment.division.class_id)
      .first()

    if (!fees_paln) {
      return ctx.response.status(404).json({
        message: 'Fees plan not found for this class , Fees plan is required to apply extra fees',
      })
    }

    // check payload 

    let extra_fees = await FeesType.query()
      .where('id', payload.fees_type_id)
      .andWhere('academic_year', payload.academic_year as number)
      .andWhere('school_id', ctx.auth.user!.school_id!)
      .andWhere('applicable_to', 'student')
      .first()

    if (!extra_fees) {
      return ctx.response.status(404).json({
        message: 'Fees type not found for your school !',
      })
    }

    // check if student extra fees are already applied
    let student_fees_type = await StudentFeesTypeMasters.query()
      .where('student_enrollments_id', academic_enrollment.id)
      .andWhere('fees_type_id', payload.fees_type_id)
      .andWhere('fees_plan_id', payload.fees_plan_id)
      .andWhere('status', 'Active')
      .first()

    if (student_fees_type) {
      return ctx.response.status(404).json({
        message: 'This Fees type is already applied to this student .',
      })
    }

    let student_fees_master = await StudentFeesMaster.query()
      .where('student_id', payload.student_id)
      .andWhere('academic_year', payload.academic_year as number)
      .andWhere('fees_plan_id', payload.fees_plan_id)
      .first()

    let trx = await db.transaction();
    try {

      if (!student_fees_master) {
        await StudentFeesMaster.create(
          {
            student_id: payload.student_id,
            fees_plan_id: payload.fees_plan_id,
            academic_year: payload.academic_year as number as number,
            discounted_amount: 0.00,
            paid_amount: 0.00,
            total_amount: Number(fees_paln.total_amount) + Number(payload.total_amount),
            due_amount: 0.00,
            status: 'Pending',
          }, { client: trx }
        )
      } else {
        await student_fees_master.merge({
          total_amount: Number(student_fees_master.total_amount) + Number(payload.total_amount),
          status: student_fees_master.status === 'Paid' ? 'Partially Paid' : student_fees_master.status,
        }).useTransaction(trx).save()
      }

      // apply extra fees to student fees plan
      let student_fees_type_master = await StudentFeesTypeMasters.create({
        student_enrollments_id: academic_enrollment.id,
        fees_type_id: payload.fees_type_id,
        fees_plan_id: payload.fees_plan_id,
        total_amount: payload.total_amount,
        paid_amount: 0.00,
        status: 'Active',
      }, { client: trx })


      for (let i = 0; i < payload.installment_breakDowns.length; i++) {
        let installment_breakdown = payload.installment_breakDowns[i]

        await StudentFeesTypeInstallmentBreakdowns.create({
          student_fees_type_masters_id: student_fees_type_master.id,
          installment_no: installment_breakdown.installment_no,
          due_date: installment_breakdown.due_date,
          installment_amount: installment_breakdown.installment_amount,
        }, { client: trx })
      }

      await trx.commit()
      return ctx.response.status(201).json({
        message: 'Extra fees applied successfully',
      })
    } catch (error) {
      await trx.rollback()
      return ctx.response.status(500).json({
        message: 'Internal Server Error',
        error: error,
      })
    }

  }

  async payMultipleInstallmentsForExtraFees(ctx: HttpContext) {
    const payload = await CreateValidationForPayMultipleInstallmentsOfExtraFees.validate(ctx.request.body())

    let academic_year = ctx.request.input('academic_year') || ctx.request.input('academic_session') || ctx.request.input('academic_session_id')

    const { student_id, student_fees_master_id, installments } = payload

    // Get active academic session for user


    // Get student enrollment
    const student_enrollment = await StudentEnrollments.query()
      .where('student_id', student_id)
      .andWhere('academic_year', typeof academic_year !== 'undefined' ? academic_year : 2024)
      .andWhereIn('status', ['pursuing', 'onboarded'])
      .first()

    if (!student_enrollment) {
      return ctx.response.status(404).json({ message: 'No student enrollment found for this student' })
    }

    type TypeForPaidInstallmentsOfDifferentFeesType = {
      student_fees_type_masters_id: number
      intallments: {
        installment_id: number,
        paid_amount: number,
        remaining_amount: number,
        discounted_amount: number,
        amount_paid_as_carry_forward: number | null,
        payment_mode: 'Cash' | 'Online' | 'Bank Transfer' | 'Cheque' | 'UPI' | 'Full Discount',
        transaction_reference: string | null,
        payment_date: Date,
        remarks: string | null,
        paid_as_refund: boolean,
        refunded_amount: number,
        repaid_installment: boolean,

      }[]
    }

    let different_type_of_paid_installments: TypeForPaidInstallmentsOfDifferentFeesType[] = []

    let trx = await db.transaction()

    try {

      // check student fess master 

      const total_paid = installments.reduce((acc, p) => acc + Number(p.paid_amount), 0);
      const due_amount = installments.reduce((acc, p) => acc + Number(p.remaining_amount), 0);

      let studentFeesMaster: StudentFeesMaster | null = null

      if (!student_fees_master_id) {

        // fetch student fees plan 

        let student_enrollment = await StudentEnrollments.query()
          .preload('division')
          .where('student_id', student_id)
          .andWhere('academic_year', typeof academic_year !== 'undefined' ? academic_year : 2024)
          .andWhereIn('status', ['pursuing', 'onboarded'])
          .first()
        if (!student_enrollment) {
          await trx.rollback()
          return ctx.response.status(404).json({ message: 'No student enrollment found for this student' })
        }

        let fees_plan = await FeesPlan.query()
          .where('academic_year', typeof academic_year !== 'undefined' ? academic_year : 2024)
          .andWhere('class_id', student_enrollment.division.class_id)
          .first()
        if (!fees_plan) {
          await trx.rollback()
          return ctx.response.status(404).json({ message: 'No fees plan found for this class' })
        }

        studentFeesMaster = await StudentFeesMaster.create({
          student_id: student_id,
          academic_year: (typeof academic_year !== 'undefined' ? academic_year : 2024),
          total_amount: fees_plan.total_amount,
          paid_amount: Number(total_paid),
          discounted_amount: 0.00,
          due_amount: Number(due_amount),
          status: 'Partially Paid',
        }, { client: trx })
      } else {
        studentFeesMaster = await StudentFeesMaster.query()
          .where('id', student_fees_master_id)
          .andWhere('student_id', student_id)
          .andWhere('academic_year', typeof academic_year !== 'undefined' ? academic_year : 2024)
          .first()
        if (!studentFeesMaster) {
          await trx.rollback()
          return ctx.response.status(404).json({ message: 'No student fees master found for this student' })
        }
        studentFeesMaster.merge({
          paid_amount: Number(studentFeesMaster.paid_amount) + Number(total_paid),
          due_amount: Number(studentFeesMaster.due_amount) + Number(due_amount),
        })
        if (Number(studentFeesMaster.total_amount) - (Number(studentFeesMaster.paid_amount) + Number(studentFeesMaster.discounted_amount)) === 0) {
          studentFeesMaster.status = 'Paid'
        }
        await studentFeesMaster.useTransaction(trx).save()
      }

      // Fetch all breakdowns for this fees type
      for (const inst of installments) {

        // Get StudentFeesTypeMasters for this student and extra fees type
        const feesTypeMaster = await StudentFeesTypeMasters.query()
          .where('student_enrollments_id', student_enrollment.id)
          .andWhere('id', inst.student_fees_type_masters_id)
          .andWhere('status', 'Active')
          .first()

        if (!feesTypeMaster) {
          return ctx.response.status(404).json({ message: 'No extra fees found for this student' })
        }
        const validate_installment = await StudentFeesTypeInstallmentBreakdowns.query()
          .where('student_fees_type_masters_id', feesTypeMaster.id)
          .andWhere('id', inst.installment_id)
          .first()

        if (!validate_installment) {
          await trx.rollback()
          return ctx.response.status(404).json({ message: `No installment breakdown found for id ${inst.installment_id}` })
        }

        // Check if already paid
        const alreadyPaid = await StudentExtraFeesInstallment.query()
          .where('student_fees_type_masters_id', feesTypeMaster.id)
          .andWhere('installment_id', inst.installment_id)
          .andWhereNotIn('payment_status', ['Failed', 'Disputed', 'Cancelled'])
          .andWhereNot('status', 'Reversed')
          .first()

        if (alreadyPaid && !inst.repaid_installment) {
          await trx.rollback()
          return ctx.response.status(400).json({ message: `Installment ${inst.installment_id} already paid` })
        }

        // Validate paid_amount + discounted_amount + remaining_amount == installment_amount
        if (
          Number(validate_installment.installment_amount) !==
          Number(inst.paid_amount) + Number(inst.discounted_amount) + Number(inst.remaining_amount)
        ) {
          await trx.rollback()
          return ctx.response.status(400).json({ message: `Paid amount for installment ${inst.installment_id} does not match installment amount` })
        }

        if (
          different_type_of_paid_installments.find(
            (item) => item.student_fees_type_masters_id === feesTypeMaster.id
          )
        ) {
          let index = different_type_of_paid_installments.findIndex(
            (item) => item.student_fees_type_masters_id === feesTypeMaster.id
          )
          different_type_of_paid_installments[index].intallments.push(inst)
        } else {
          different_type_of_paid_installments.push({
            student_fees_type_masters_id: feesTypeMaster.id,
            intallments: [inst],
          })
        }

        // Insert payment record
        await StudentExtraFeesInstallment.create(
          {
            student_fees_master_id: studentFeesMaster.id,
            student_fees_type_masters_id: feesTypeMaster.id,
            installment_id: validate_installment.id,
            paid_amount: Number(inst.paid_amount),
            discounted_amount: Number(inst.discounted_amount),
            remaining_amount: Number(inst.remaining_amount),
            amount_paid_as_carry_forward: inst.amount_paid_as_carry_forward ?? 0,
            paid_as_refund: inst.paid_as_refund,
            refunded_amount: inst.refunded_amount,
            payment_mode: inst.payment_mode,
            transaction_reference: inst.transaction_reference,
            payment_date: inst.payment_date,
            remarks: inst.remarks,
            status: validate_installment.due_date < new Date() ? 'Overdue' : (Number(inst.remaining_amount) === 0 ? 'Paid' : 'Partially Paid'),
          },
          { client: trx }
        )
      }


      for (const paid_fees_type of different_type_of_paid_installments) {

        const feesTypeMaster = await StudentFeesTypeMasters.query()
          .where('student_enrollments_id', student_enrollment.id)
          .andWhere('id', paid_fees_type.student_fees_type_masters_id)
          .andWhere('status', 'Active')
          .first()

        if (!feesTypeMaster) {
          await trx.rollback()
          return ctx.response.status(404).json({ message: 'No extra fees found for this student' })
        }

        let total_paid_amount = paid_fees_type.intallments.reduce((acc, p) => acc + Number(p.paid_amount), 0)
        // let total_discounted_amount = paid_fees_type.intallments.reduce((acc, p) => acc + Number(p.discounted_amount), 0)
        // let total_remaining_amount = paid_fees_type.intallments.reduce((acc, p) => acc + Number(p.remaining_amount), 0)
        // let total_amount_paid_as_carry_forward = paid_fees_type.intallments.reduce((acc, p) => acc + (p.amount_paid_as_carry_forward ? Number(p.amount_paid_as_carry_forward) : 0), 0)

        await feesTypeMaster
          .merge({
            paid_amount: Number(feesTypeMaster.paid_amount) + Number(total_paid_amount),
          })
          .useTransaction(trx)
          .save()

      }

      await trx.commit()
      return ctx.response.status(201).json({ message: 'Extra fees installments paid successfully' })
    } catch (error) {
      await trx.rollback()
      return ctx.response.status(500).json({
        message: 'Internal Server Error',
        error: error.message || error,
      })
    }
  }

  // report

  async fetchFeesTyesWithInstallmentsForClass(ctx: HttpContext) {
    let division_id = ctx.params.division_id

    let academic_year = ctx.request.input('academic_year') || ctx.request.input('academic_session') || ctx.request.input('academic_session_id') || ctx.request.input('academic_session_id')
    if (!academic_year) {
      return ctx.response.status(400).json({
        message: 'Please provide academic_year or academic_session',
      })
    }
    let division = await Divisions.query()
      .where('id', division_id)
      // .andWhere('school_id', ctx.auth.user!.school_id as number)
      .first()
    if (!division) {
      return ctx.response.status(404).json({
        message: 'Division not found',
      })
    }
    let class_fees_plan = await FeesPlan.query()
      .preload('fees_detail', (query) => {
        query.preload('installments_breakdown')
      })
      .where('academic_year', academic_year as number)
      .andWhere('class_id', division!.class_id)
      .andWhere('status', 'Active')
      .first()
    if (!class_fees_plan) {
      return ctx.response.status(404).json({
        message: 'Fees plan not found for this class',
      })
    }

    return ctx.response.status(200).json(class_fees_plan)

  }

  async installmentWiseReportClass(ctx: HttpContext) {

    let division_id = ctx.params.division_id
    let fees_type_id = ctx.params.fees_type_id
    let installment_id = ctx.params.installment_id
    let academic_year = ctx.request.input('academic_year') || ctx.request.input('academic_session') || ctx.request.input('academic_session_id') || ctx.request.input('academic_session_id')
    if (!academic_year) {
      return ctx.response.status(400).json({
        message: 'Please provide academic_year or academic_session',
      })
    }


    let division = await Divisions.query()
      .where('id', division_id)
      // .andWhere('school_id', ctx.auth.user!.school_id as number)
      .first()

    if (!division) {
      return ctx.response.status(404).json({
        message: 'Division not found',
      })
    }

    let class_fees_plan = await FeesPlan.query()
      .where('academic_year', academic_year as number)
      .andWhere('class_id', division!.class_id)
      .first()

    if (!class_fees_plan) {
      return ctx.response.status(404).json({
        message: 'Fees plan not found for this class',
      })
    }

    let fees_type_details = await FeesPlanDetails.query()
      // .where('academic_year', academic_year as number)
      .where('fees_plan_id', class_fees_plan.id)
      .andWhere('fees_type_id', fees_type_id)
      .first()

    if (!fees_type_details) {
      return ctx.response.status(404).json({
        message: 'Fees type details not found for this fees type',
      })
    }

    let installment = await InstallmentBreakDowns.query()
      .where('id', installment_id)
      .andWhere('fee_plan_details_id', fees_type_details.id)
      .first()

    if (!installment) {
      return ctx.response.status(404).json({
        message: 'Installment not found',
      })
    }

    let stundent_enrollment = await db.query()
      .from('student_enrollments as se')
      .leftJoin('students as s', 's.id', 'se.student_id')
      .leftJoin('student_fees_master as sfm', function () {
        this.on('sfm.student_id', '=', 's.id')
          .andOn('sfm.academic_year', '=', 'se.academic_year')
      })
      .leftJoin('student_fees_installments as sfi', function () {
        this.on('sfi.student_fees_master_id', '=', 'sfm.id')
        this.andOnVal('sfi.installment_id', '=', installment_id)
      })
      .where('se.academic_year', academic_year)
      .andWhere('se.division_id', division_id)
      .groupBy(
        's.id',
        's.enrollment_code',
        's.first_name',
        's.middle_name',
        's.last_name',
        's.gr_no',
        'sfi.installment_id',
        'sfm.id' // Add sfm.id to GROUP BY to satisfy ONLY_FULL_GROUP_BY
      )
      .select([
        's.id',
        's.enrollment_code',
        's.first_name',
        's.middle_name',
        's.last_name',
        's.gr_no',
        'sfi.installment_id',
        // db.raw(`COALESCE(
        //   (SELECT sfi2.status FROM student_fees_installments sfi2
        //   WHERE sfi2.student_fees_master_id = sfm.id
        //     AND sfi2.installment_id = sfi.installment_id
        //   ORDER BY sfi2.payment_date DESC, sfi2.id DESC
        //   LIMIT 1
        //   ), sfi.status
        // ) as status`),
        db.raw('COALESCE(SUM(sfi.paid_amount), 0) as total_paid_amount'),
        db.raw('COALESCE(SUM(sfi.discounted_amount), 0) as total_discounted_amount'),
        db.raw('COALESCE(SUM(sfi.remaining_amount), 0) as total_remaining_amount'),
        db.raw('MIN(sfi.payment_date) as first_payment_date'),
        db.raw('MAX(sfi.payment_date) as last_payment_date'),
        db.raw('COUNT(sfi.id) as payment_count')
      ])

    // .andWhere('status', 'Active')

    return ctx.response.status(200).json({
      message: 'Installment report',
      data: stundent_enrollment,
      fees_type_details: fees_type_details,
      installment: installment
    })

  }

  async feesTypesWiseReportClass(ctx: HttpContext) {
    let division_id = ctx.params.division_id
    let fees_type_id = ctx.params.fees_type_id
    let academic_year = ctx.request.input('academic_year') || ctx.request.input('academic_session') || ctx.request.input('academic_session_id') || ctx.request.input('academic_session_id')
    if (!academic_year) {
      return ctx.response.status(400).json({
        message: 'Please provide academic_year or academic_session',
      })
    }

    let division = await Divisions.query()
      .where('id', division_id)
      .first()
    // .andWhere('school_id', ctx.auth.user!.school_id as number)

    if (!division) {
      return ctx.response.status(404).json({
        message: 'Division not found',
      })
    }

    let class_fees_plan = await FeesPlan.query()
      .where('academic_year', academic_year as number)
      .andWhere('class_id', division!.class_id)
      .andWhere('status', 'Active')
      .first()

    if (!class_fees_plan) {
      return ctx.response.status(404).json({
        message: 'Fees plan not found for this class',
      })
    }

    let fees_type_details = await FeesPlanDetails.query()
      .where('fees_plan_id', class_fees_plan.id)
      .andWhere('fees_type_id', fees_type_id)
      .andWhere('status', 'Active')
      .first()
    if (!fees_type_details) {
      return ctx.response.status(404).json({
        message: 'Fees type details not found for this fees type',
      })
    }

    // let stundent_enrollment = await db.query()
    //   .from('student_enrollments as se')
    //   .leftJoin('students as s', 's.id', 'se.student_id')
    //   .leftJoin('student_fees_master as sfm', function () {
    //     this.on('sfm.student_id', '=', 's.id')
    //       .andOn('sfm.academic_year', '=', 'se.academic_year')
    //   })
    //   .leftJoin('student_fees_plan_masters as sfpm', function () {
    //     this.on('sfpm.student_fees_master_id', '=', 'sfm.id')
    //       .andOn('sfpm.fees_plan_details_id', '=', fees_type_details.id.toString())
    //   })
    //   .where('se.academic_year', academic_year)
    //   .andWhere('se.division_id', division_id)
    //   .select([
    //     's.id',
    //     's.enrollment_code',
    //     's.first_name',
    //     's.middle_name',
    //     's.last_name',
    //     's.gr_no',
    //     'sfpm.*',
    //   ])

    let student_enrollment = await db.query()
      .from('student_enrollments as se')
      .leftJoin('students as s', 's.id', 'se.student_id')
      .leftJoin('student_fees_master as sfm', 'sfm.student_id', 's.id')
      .join('student_fees_plan_masters as sfpm', function () {
        this.on('sfpm.student_fees_master_id', '=', 'sfm.id')
          .andOnVal('sfpm.fees_plan_details_id', '=', fees_type_details.id)
      })
      .where('se.academic_year', academic_year)
      .andWhere('se.division_id', division_id)
      .select([
        's.id',
        's.enrollment_code',
        's.first_name',
        's.middle_name',
        's.last_name',
        's.gr_no',
        'sfpm.*',
      ])

    return ctx.response.status(200).json({
      message: 'Fees types report',
      data: student_enrollment,
      fees_type_details: fees_type_details,
    })
  }

  /**
   * Helper: Build student financial statement data
   */
  private async getStudentFinancialStatementData(student_id: number | string, academic_year?: number | string) {
    // 1. Fetch student base information
    let student = await Students.query()
      .select(
        'id',
        'first_name',
        'middle_name',
        'last_name',
        'gr_no',
        'enrollment_code',
        'first_year_roll_number',
        'second_year_roll_number',
        'third_year_roll_number',
        'fourth_year_roll_number'
      )
      .where('id', student_id)
      .first()

    if (!student) {
      return null
    }

    // 2. Fetch student enrollment (with division, class, quota)
    let enrollmentQuery = StudentEnrollments.query()
      .preload('division', (q) => q.preload('class'))
      .preload('quota')
      .where('student_id', student_id)
      .andWhereIn('status', ['pursuing', 'onboarded'])

    if (academic_year) {
      enrollmentQuery = enrollmentQuery.andWhere('academic_year', Number(academic_year))
    }

    let enrollment = await enrollmentQuery.first()
    if (!enrollment) {
      enrollment = await StudentEnrollments.query()
        .preload('division', (q) => q.preload('class'))
        .preload('quota')
        .where('student_id', student_id)
        .orderBy('academic_year', 'desc')
        .first()
    }

    // 3. Fetch StudentFeesMaster (Grandfathered lock-in record)
    let feeMaster = await StudentFeesMaster.query()
      .preload('fees_plan', (q) => q.preload('quota'))
      .preload('paid_fees', (q) => {
        q.preload('applied_concessions')
        q.preload('installment')
        q.orderBy('payment_date', 'desc')
      })
      .preload('reversed_fees')
      .preload('paid_fees_details')
      .where('student_id', student_id)
      .first()

    // 4. Resolve the fee template (locked or matched by cohort & quota)
    let feesPlan: FeesPlan | null = null
    if (feeMaster && feeMaster.fees_plan_id) {
      feesPlan = await FeesPlan.query()
        .preload('quota')
        .preload('fees_detail', (q) => q.preload('installments_breakdown'))
        .preload('concession_for_plan', (q) => q.preload('concession'))
        .where('id', feeMaster.fees_plan_id)
        .first()
    }

    if (!feesPlan && enrollment) {
      let planQuery = FeesPlan.query()
        .preload('quota')
        .preload('fees_detail', (q) => q.preload('installments_breakdown'))
        .where('class_id', enrollment.division?.class_id)
        .andWhere('academic_year', enrollment.academic_year)
        .andWhere('status', 'Active')

      if (enrollment.quota_id) {
        let quotaPlan = await planQuery.clone().andWhere('quota_id', enrollment.quota_id).first()
        if (quotaPlan) feesPlan = quotaPlan
      }

      if (!feesPlan) {
        feesPlan = (await planQuery.clone().whereNull('quota_id').first()) || (await planQuery.first())
      }
    }

    // 5. Fetch fee details & breakdown
    let feeDetails: FeesPlanDetails[] = []
    if (feesPlan) {
      feeDetails = await FeesPlanDetails.query()
        .preload('installments_breakdown')
        .where('fees_plan_id', feesPlan.id)
    }

    // 6. Fetch all fee types for friendly labels
    const allFeeTypes = await FeesType.query()
    const feeTypeNameMap = new Map<number, string>()
    allFeeTypes.forEach((ft) => feeTypeNameMap.set(ft.id, ft.name))

    // 7. Calculate ledger & statement values
    const lockedTotalFee = Number(
      feeMaster?.locked_amount || feeMaster?.total_amount || feesPlan?.total_amount || 0
    )
    const paidAmount = Number(feeMaster?.paid_amount || 0)
    const discountedAmount = Number(feeMaster?.discounted_amount || 0)
    const netPayable = Math.max(0, lockedTotalFee - discountedAmount)
    const outstandingBalance = Math.max(0, netPayable - paidAmount)
    const isLocked = feeMaster?.is_locked ?? (feeMaster !== null)
    const lockedAt = feeMaster?.locked_at || feeMaster?.createdAt || null
    const lockedCohortYear = feeMaster?.locked_academic_year || enrollment?.academic_year || null

    // 8. Granular breakdown by component & installment
    const breakdown = feeDetails.map((detail) => {
      const typeName = feeTypeNameMap.get(detail.fees_type_id) || `Fee Component #${detail.fees_type_id}`
      const totalComponent = Number(detail.total_amount)

      const installments = (detail.installments_breakdown || []).map((ib) => {
        const matchingPaid = (feeMaster?.paid_fees || []).find((p) => p.installment_id === ib.id)
        const scheduledAmount = Number(ib.installment_amount)
        const paidInstAmount = Number(matchingPaid?.paid_amount || 0)
        const remAmount = Math.max(0, scheduledAmount - paidInstAmount)

        return {
          installment_id: ib.id,
          installment_no: ib.installment_no,
          due_date: ib.due_date,
          scheduled_amount: scheduledAmount,
          paid_amount: paidInstAmount,
          remaining_amount: remAmount,
          status: matchingPaid
            ? matchingPaid.status
            : new Date(ib.due_date) < new Date()
              ? 'Overdue'
              : 'Unpaid',
          payment_date: matchingPaid?.payment_date || null,
          transaction_reference: matchingPaid?.transaction_reference || null,
          payment_mode: matchingPaid?.payment_mode || null,
        }
      })

      const paidComponent = installments.reduce((acc, inst) => acc + inst.paid_amount, 0)
      const dueComponent = Math.max(0, totalComponent - paidComponent)

      return {
        fee_plan_details_id: detail.id,
        fees_type_id: detail.fees_type_id,
        fee_type_name: typeName,
        installment_type: detail.installment_type,
        total_installment: detail.total_installment,
        total_amount: totalComponent,
        paid_amount: paidComponent,
        due_amount: dueComponent,
        installments: installments,
      }
    })

    // 9. Chronological Transaction History
    const transactionHistory = (feeMaster?.paid_fees || []).map((pf) => ({
      id: pf.id,
      transaction_reference: pf.transaction_reference || `REC-${pf.id}`,
      payment_date: pf.payment_date,
      payment_mode: pf.payment_mode,
      amount: Number(pf.paid_amount),
      remaining_amount: Number(pf.remaining_amount || 0),
      discounted_amount: Number(pf.discounted_amount || 0),
      status: pf.status,
      payment_status: pf.payment_status,
      remarks: pf.remarks,
      installment_no: pf.installment?.installment_no || null,
      due_date: pf.installment?.due_date || null,
    }))

    const fullName = `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`.trim()

    return {
      statement_date: new Date().toISOString(),
      student: {
        id: student.id,
        first_name: student.first_name,
        middle_name: student.middle_name,
        last_name: student.last_name,
        full_name: fullName,
        gr_no: student.gr_no,
        roll_number:
          student.first_year_roll_number ||
          student.second_year_roll_number ||
          student.third_year_roll_number ||
          student.fourth_year_roll_number ||
          'N/A',
        enrollment_code: (student as any).enrollment_code || null,
        class_name: (enrollment?.division as any)?.class?.class || 'N/A',
        division_name: enrollment?.division?.division || 'N/A',
        quota_id: enrollment?.quota?.id || enrollment?.quota_id || null,
        quota_name: enrollment?.quota?.name || 'General Quota',
        enrollment_year: enrollment?.academic_year || null,
        cohort_session: enrollment?.academic_year
          ? `${enrollment.academic_year}-${enrollment.academic_year + 1}`
          : 'N/A',
      },
      template: {
        id: feesPlan?.id || null,
        name: feesPlan?.name || 'Standard Fee Structure',
        quota_name: feesPlan?.quota?.name || enrollment?.quota?.name || 'General Quota',
        cohort_academic_year: lockedCohortYear,
        is_locked: isLocked,
        locked_at: lockedAt,
        locked_total_amount: lockedTotalFee,
      },
      financial_summary: {
        locked_total_fee: lockedTotalFee,
        concessions_discount: discountedAmount,
        net_payable: netPayable,
        paid_amount: paidAmount,
        outstanding_balance: outstandingBalance,
        status:
          feeMaster?.status ||
          (paidAmount >= netPayable && netPayable > 0
            ? 'Paid'
            : paidAmount > 0
              ? 'Partially Paid'
              : 'Pending'),
        payment_percentage:
          lockedTotalFee > 0
            ? Math.min(100, Math.round(((paidAmount + discountedAmount) / lockedTotalFee) * 100))
            : 0,
      },
      breakdown: breakdown,
      transactions: transactionHistory,
    }
  }

  /**
   * Financial Tracking & Reporting: Generate real-time, individual student statement
   * detailing the locked total fee, amounts paid to date, outstanding balance, and transaction history.
   */
  async generateStudentFinancialStatement(ctx: HttpContext) {
    let student_id = ctx.params.student_id
    let academic_year = ctx.request.input('academic_year') || ctx.request.input('academic_session') || ctx.request.input('academic_session_id')

    if (!student_id) {
      return ctx.response.status(400).json({ message: 'Student ID is required' })
    }

    const statementData = await this.getStudentFinancialStatementData(student_id, academic_year)
    if (!statementData) {
      return ctx.response.status(404).json({ message: 'Student not found' })
    }

    return ctx.response.json(statementData)
  }

  /**
   * Export individual student financial statement to Excel (.xlsx) and archive in DigitalOcean Spaces
   */
  async exportStudentFinancialStatementExcel(ctx: HttpContext) {
    const student_id = ctx.params.student_id
    const academic_year = ctx.request.input('academic_year') || ctx.request.input('academic_session')

    if (!student_id) {
      return ctx.response.status(400).json({ success: false, message: 'Student ID is required' })
    }

    const data = await this.getStudentFinancialStatementData(student_id, academic_year)
    if (!data) {
      return ctx.response.status(404).json({ success: false, message: 'Student financial data not found' })
    }

    const { student, template, financial_summary, breakdown, transactions } = data

    // Create Excel Workbook
    const wb = xlsx.utils.book_new()

    // ── Sheet 1: Financial Summary ───────────────────────────────────────────
    const summaryAoa: any[][] = [
      ['C. N. KOTHARI HOMOEOPATHIC MEDICAL COLLEGE & RESEARCH CENTRE, VYARA'],
      ['STUDENT FINANCIAL STATEMENT & AUDIT REPORT'],
      [],
      ['1. STUDENT PROFILE', ''],
      ['Student Name', student.full_name],
      ['GR Number', student.gr_no || 'N/A'],
      ['Enrollment Code', student.enrollment_code || 'N/A'],
      ['Class & Division', `${student.class_name} - ${student.division_name}`],
      ['Quota Category', student.quota_name || 'General Quota'],
      ['Academic Session', student.cohort_session || 'N/A'],
      [],
      ['2. FEE STRUCTURE & SETTLEMENT SUMMARY', ''],
      ['Fee Plan Template', template.name],
      ['Total Scheduled Fees (₹)', financial_summary.locked_total_fee],
      ['Concessions / Discounts (₹)', financial_summary.concessions_discount],
      ['Net Payable Fees (₹)', financial_summary.net_payable],
      ['Total Amount Paid to Date (₹)', financial_summary.paid_amount],
      ['Current Outstanding Balance (₹)', financial_summary.outstanding_balance],
      ['Settlement Status', financial_summary.status],
      ['Payment Progress (%)', `${financial_summary.payment_percentage}%`],
      [],
      ['Report Generated At', new Date().toLocaleString('en-IN')],
    ]

    const wsSummary = xlsx.utils.aoa_to_sheet(summaryAoa)
    wsSummary['!cols'] = [{ wch: 35 }, { wch: 45 }]
    xlsx.utils.book_append_sheet(wb, wsSummary, 'Summary')

    // ── Sheet 2: Installments & Due Dates ────────────────────────────────────
    const instHeaders = [
      'Fee Component',
      'Term / Installment',
      'Due Date',
      'Scheduled (₹)',
      'Paid (₹)',
      'Remaining (₹)',
      'Status',
      'Payment Date',
      'Receipt Reference',
    ]
    const instRows: any[][] = []
    for (const comp of breakdown) {
      for (const inst of comp.installments) {
        instRows.push([
          comp.fee_type_name,
          `Term #${inst.installment_no}`,
          inst.due_date ? String(inst.due_date).slice(0, 10) : 'N/A',
          inst.scheduled_amount,
          inst.paid_amount,
          inst.remaining_amount,
          inst.status,
          inst.payment_date ? String(inst.payment_date).slice(0, 10) : '-',
          inst.transaction_reference || '-',
        ])
      }
    }
    const wsInstallments = xlsx.utils.aoa_to_sheet([instHeaders, ...instRows])
    wsInstallments['!cols'] = [
      { wch: 25 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 22 },
    ]
    xlsx.utils.book_append_sheet(wb, wsInstallments, 'Installments')

    // ── Sheet 3: Transaction Ledger ──────────────────────────────────────────
    const txnHeaders = [
      'Receipt / UTR Reference',
      'Payment Date',
      'Payment Mode',
      'Amount Paid (₹)',
      'Payment Status',
      'Cashier Remarks',
    ]
    const txnRows: any[][] = (transactions || []).map((t: any) => [
      t.transaction_reference,
      t.payment_date ? String(t.payment_date).slice(0, 10) : 'N/A',
      t.payment_mode || 'Cash',
      t.amount,
      t.status || 'Success',
      t.remarks || '-',
    ])
    const wsTransactions = xlsx.utils.aoa_to_sheet([txnHeaders, ...txnRows])
    wsTransactions['!cols'] = [
      { wch: 25 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 35 },
    ]
    xlsx.utils.book_append_sheet(wb, wsTransactions, 'Transactions')

    // Generate Excel Buffer
    const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Generate identifiable file name:
    // Format: CNKHMC_FeeStatement_[GR_NO]_[STUDENT_NAME]_[ACADEMIC_YEAR]_[TIMESTAMP].xlsx
    const cleanGrNo = String(student.gr_no || 'NOGR').trim().replace(/[^a-zA-Z0-9]/g, '_')
    const cleanName = student.full_name.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    const cleanSession = String(student.cohort_session || 'SESSION').trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
    const now = new Date()
    const ymd = now.toISOString().slice(0, 10).replace(/-/g, '')
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const fileName = `CNKHMC_FeeStatement_${cleanGrNo}_${cleanName}_${cleanSession}_${ymd}_${hh}${mm}.xlsx`

    // Upload to DigitalOcean Spaces
    const uploadResult = await SpacesService.uploadExport(
      'fee-statements',
      fileName,
      Buffer.from(excelBuffer),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

    return ctx.response.json({
      success: true,
      message: 'Student fee statement exported successfully to DigitalOcean Spaces',
      file_name: fileName,
      file_url: uploadResult.url,
      is_cloud: uploadResult.isCloud,
      storage_key: uploadResult.key,
      student_name: student.full_name,
      gr_no: student.gr_no,
      summary: financial_summary,
    })
  }

  /**
   * Explicit administrative action to lock a specific fee template to a student
   * (establishing grandfathered cohort structure).
   */
  async lockStudentFeeTemplate(ctx: HttpContext) {
    if (!(await Access.allows(ctx.auth.user!, 'update', 'Fees', [1, 2, 3, 4, 5, 7, 8, 11]))) {
      return ctx.response.status(401).json({
        message: 'You are not authorized to perform this action!',
      })
    }

    const { student_id, fees_plan_id, academic_year } = ctx.request.only([
      'student_id',
      'fees_plan_id',
      'academic_year',
    ])

    if (!student_id || !fees_plan_id) {
      return ctx.response.status(400).json({ message: 'student_id and fees_plan_id are required' })
    }

    const plan = await FeesPlan.query().preload('quota').where('id', fees_plan_id).first()
    if (!plan) {
      return ctx.response.status(404).json({ message: 'Fee template not found' })
    }

    let feeMaster = await StudentFeesMaster.query().where('student_id', student_id).first()
    const targetYear = academic_year || plan.academic_year

    if (feeMaster) {
      await feeMaster
        .merge({
          fees_plan_id: plan.id,
          total_amount: Number(plan.total_amount),
          due_amount: Math.max(
            0,
            Number(plan.total_amount) - Number(feeMaster.paid_amount) - Number(feeMaster.discounted_amount)
          ),
          is_locked: true,
          locked_at: DateTime.now(),
          locked_amount: Number(plan.total_amount),
          locked_academic_year: targetYear,
        })
        .save()
    } else {
      feeMaster = await StudentFeesMaster.create({
        student_id: student_id,
        fees_plan_id: plan.id,
        academic_year: targetYear,
        total_amount: Number(plan.total_amount),
        paid_amount: 0,
        discounted_amount: 0,
        due_amount: Number(plan.total_amount),
        status: 'Pending',
        is_locked: true,
        locked_at: DateTime.now(),
        locked_amount: Number(plan.total_amount),
        locked_academic_year: targetYear,
      })
    }

    return ctx.response.json({
      message: 'Fee template successfully locked to student under cohort grandfathering rule.',
      student_fees_master: feeMaster,
    })
  }
}
