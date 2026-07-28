import SalaryComponents from '#models/SalaryComponents'
import SalaryTemplates from '#models/SalaryTemplates'
import SatffPayrunComponents from '#models/SatffPayrunComponents'
import SatffPayrunTemplates from '#models/SatffPayrunTemplates'
import StaffEnrollment from '#models/StaffEnrollment'
import StaffSalaryTemplates from '#models/StaffSalaryTemplates'
import StaffTemplateComponents from '#models/StaffTemplateComponents'
import TemplateComponents from '#models/TemplateComponents'
import {
  CreatePayRunTemplateValidator,
  CreateValidatorForSalaryComponent,
  CreateValidatorForSalaryTemplates,
  CreateValidatorForStaffSalaryTemplates,
  UpdateValidatorForSalaryComponent,
  UpdateValidatorForSalaryTemplates,
  UpdateValidatorForStaffSalaryTemplates,
} from '#validators/Payroll'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class PayrollController {
  async setupBasicPayrollStructreForSchool(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id
    const academic_year = ctx.request.input('academic_session')

    const predefined_components = await SalaryComponents.query()
      .where('school_id', school_id as number)
      .andWhere('academic_year', academic_year as number)

    if (predefined_components.length == 0) {
      try {
        await SalaryComponents.createMany([
          {
            school_id: school_id as number,
            academic_year: academic_year as number,
            component_name: 'Basic Salary',
            component_code: 'BASIC',
            component_type: 'earning',
            description: 'Basic Salary',
            calculation_method: 'percentage',
            amount: null,
            percentage: 40.2,
            is_based_on_annual_ctc: true,
            name_in_payslip: 'Basic Salary',
            is_taxable: true,
            pro_rata_calculation: true,
            consider_for_epf: true,
            consider_for_esi: true,
            consider_for_esic: true,
            is_mandatory: true,
            is_mandatory_for_all_templates: true,
            is_active: true,
            deduction_frequency: null,
            deduction_type: null,
            benefit_frequency: null,
            benefit_type: null,
          },
          // Add other components here as needed
        ])
      } catch (error) {
        return ctx.response
          .status(500)
          .json({ message: 'Error creating default salary components' })
      }
    }
    return ctx.response
      .status(200)
      .json({ message: 'Default salary components created successfully' })
  }

  async indexSalaryComponents(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id
    const academic_year = ctx.request.input('academic_session')
    const fetch_all = ctx.request.input('all', false)

    // const salary_components : SalaryComponents[] = []
    if (!fetch_all) {
      let salary_components = await SalaryComponents.query()
        .where('school_id', school_id as number)
        .andWhere('academic_year', academic_year as number)
        .paginate(ctx.request.input('page', 1), 10)
      return ctx.response.status(200).json(salary_components)
    } else {
      let salary_components = await SalaryComponents.query()
        .where('school_id', school_id as number)
        .andWhere('academic_year', academic_year as number)
      // .paginate(ctx.request.input('page', 1), 10)
      return ctx.response.status(200).json(salary_components)
    }
  }

  async createSalaryComponent(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id
    const role_id = ctx.auth.user!.role_id

    let accamic_session = await db.from('users') /* Dummy replacement for AcademicSession */
      .where('school_id', school_id as number)
      .andWhere('is_active', true)
      .first()

    if (!accamic_session) {
      return ctx.response.status(422).json({ message: 'Academic session is not active' })
    }

    const payload = await CreateValidatorForSalaryComponent.validate(ctx.request.body())

    if (role_id == 1 || role_id == 2) {
      if (payload.component_type == 'deduction') {
        if (payload.deduction_frequency == null) {
          return ctx.response.status(422).json({ message: 'Deduction frequency is required' })
        }
        if (payload.deduction_frequency === 'recurring' && payload.deduction_type == null) {
          return ctx.response.status(422).json({ message: 'Deduction type is required' })
        }

        if (payload.deduction_frequency === 'once' && payload.deduction_type != null) {
          return ctx.response.status(422).json({
            message: 'Deduction type should be null if deduction frequency is once',
          })
        }

        if (payload.benefit_type || payload.benefit_frequency) {
          return ctx.response.status(422).json({
            message: 'Benefit type and frequency shoould be null if component is of type Deduction',
          })
        }
        if (payload.consider_for_epf || payload.consider_for_esi || payload.consider_for_esic) {
          return ctx.response.status(422).json({
            message: 'EPF, ESI and ESIC should be false if component is of type Deduction',
          })
        }
        if (payload.is_based_on_annual_ctc) {
          return ctx.response
            .status(422)
            .json({ message: 'Annual CTC should be false if component is of type Deduction' })
        }
        if (payload.amount || payload.percentage) {
          return ctx.response.status(422).json({
            message:
              'Amount and percentage should be null while creating component of type Deduction',
          })
        }
      } else if (payload.component_type == 'benefits') {
        if (payload.benefit_frequency == null) {
          return ctx.response
            .status(422)
            .json({ message: 'Benefit type should be null if deduction frequency is once' })
        }
        if (payload.benefit_frequency == 'once' && payload.benefit_type !== null) {
          return ctx.response.status(422).json({ message: 'Benefit type should ne null' })
        }

        if (payload.benefit_frequency === 'recurring' && payload.benefit_type == null) {
          return ctx.response.status(422).json({ message: 'Benefit type is required' })
        }

        if (payload.deduction_type || payload.deduction_frequency) {
          return ctx.response.status(422).json({
            message: 'Deduction type and frequency should be null if component is of type Benefits',
          })
        }

        if (payload.consider_for_epf || payload.consider_for_esi || payload.consider_for_esic) {
          return ctx.response.status(422).json({
            message: 'EPF, ESI and ESIC should be false if component is of type Benefits',
          })
        }
        if (payload.is_based_on_annual_ctc) {
          return ctx.response
            .status(422)
            .json({ message: 'Annual CTC should be false if component is of type Benefits' })
        }
        if (payload.amount || payload.percentage) {
          return ctx.response.status(422).json({
            message:
              'Amount and percentage should be null while creating component of type benefits',
          })
        }
      } else {
        if (payload.deduction_frequency || payload.deduction_type) {
          return ctx.response.status(422).json({
            message: 'Deduction type and frequency should be null if component is of type Earning',
          })
        }
        if (payload.benefit_frequency || payload.benefit_type) {
          return ctx.response.status(422).json({
            message: 'Benefit type and frequency should be null if component is of type Earning',
          })
        }
      }

      const salary_component = await SalaryComponents.create({
        ...payload,
        school_id: school_id as number,
        academic_year: accamic_session.id,
      })
      return ctx.response.status(201).json(salary_component)
    } else {
      return ctx.response
        .status(403)
        .json({ message: 'You are not authorized to perform this action' })
    }
  }

  async updateSalaryComponent(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id
    const role_id = ctx.auth.user!.role_id
    const salary_component_id = ctx.params.component_id

    if (role_id == 1 || role_id == 2) {
      const payload = await UpdateValidatorForSalaryComponent.validate(ctx.request.body())

      let salary_component = await SalaryComponents.query()
        .where('school_id', school_id as number)
        .andWhere('id', salary_component_id as number)
        .first()

      if (!salary_component) {
        return ctx.response.status(404).json({ message: 'Salary component not found' })
      }

      if (
        salary_component.component_type === 'deduction' ||
        salary_component.component_type === 'benefits'
      ) {
        if (payload.amount || payload.percentage) {
          return ctx.response.status(422).json({
            message:
              'Amount and percentage should be null if component is of type Deduction or Benefits',
          })
        }
      } else {
        if (
          (!payload.amount || payload.percentage) &&
          salary_component.calculation_method === 'amount'
        ) {
          return ctx.response.status(422).json({
            message:
              'Amount is required as calculation method is Flat amount , and percentage should be null',
          })
        }

        if (
          (!payload.percentage || payload.amount) &&
          salary_component.calculation_method === 'percentage'
        ) {
          return ctx.response.status(422).json({
            message:
              'Percentage is required as calculation method is percentage based and amount should be null',
          })
        }
      }

      await salary_component.merge(payload).save()
      return ctx.response.status(200).json(salary_component)
    } else {
      return ctx.response
        .status(403)
        .json({ message: 'You are not authorized to perform this action' })
    }
  }

  async deleteSalaryComponent(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id
    const role_id = ctx.auth.user!.role_id
    const salary_component_id = ctx.params.component_id

    if (role_id == 1 || role_id == 2) {
      let salary_component = await SalaryComponents.query()
        .where('school_id', school_id as number)
        .andWhere('id', salary_component_id as number)
        .first()

      if (!salary_component) {
        return ctx.response.status(404).json({ message: 'Salary component not found' })
      }

      /**
       * Chcek whether this component is used in any template or not
       */
      let template_component = await TemplateComponents.query()
        .where('salary_components_id', salary_component.id)
        // .andWhere('salary_templates_id', salary_component.salary_templates_id)
        .first()

      if (template_component) {
        return ctx.response.status(422).json({
          message: 'Salary component is used in template, cannot be deleted',
        })
      }

      await salary_component.delete()
      return ctx.response.status(200).json({ message: 'Salary component deleted successfully' })
    } else {
      return ctx.response
        .status(403)
        .json({ message: 'You are not authorized to perform this action' })
    }
  }

  async indexSalaryTemplates(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id
    const academic_year = ctx.request.input('academic_session')
    const fetch_all = ctx.request.input('all', false)
    if (!fetch_all) {
      const salary_templates = await SalaryTemplates.query()
        .preload('template_components')
        .where('school_id', school_id as number)
        .andWhere('academic_year', academic_year as number)
        .paginate(ctx.request.input('page', 1), 10)
      return ctx.response.status(200).json(salary_templates)
    } else {
      const salary_templates = await SalaryTemplates.query()
        .preload('template_components')
        .where('school_id', school_id as number)
        .andWhere('academic_year', academic_year as number)
      // .paginate(ctx.request.input('page', 1), 10)
      return ctx.response.status(200).json(salary_templates)
    }
  }

  async fetchSingleSalaryTemplate(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id
    const template_id = ctx.params.template_id

    const salary_template = await SalaryTemplates.query()
      .preload('template_components')
      .where('school_id', school_id as number)
      .andWhere('id', template_id as number)
      .first()

    if (!salary_template) {
      return ctx.response.status(404).json({ message: 'Salary Template not found' })
    }

    return ctx.response.status(200).json(salary_template)
  }

  async createSalaryTemplate(ctx: HttpContext) {
    let school_id = ctx.auth.user!.school_id
    let role_id = ctx.auth.user!.role_id

    let accamic_session = await db.from('users') /* Dummy replacement for AcademicSession */
      .where('school_id', school_id as number)
      .andWhere('is_active', true)
      .first()

    if (!accamic_session) {
      return ctx.response.status(422).json({ message: 'Academic session is not active' })
    }

    let { template_components, ...payload_without_salary_components } =
      await CreateValidatorForSalaryTemplates.validate(ctx.request.body())

    /**
     * Need to add validatioin for duplicate entry for same
     *  */

    if (role_id == 1 || role_id == 2) {
      let trx = await db.transaction()
      try {
        let salary_template = await SalaryTemplates.create(
          {
            school_id: school_id as number,
            academic_year: accamic_session.id,
            ...payload_without_salary_components,
          },
          { client: trx }
        )
        let components_for_tmplates: TemplateComponents[] = []
        for (let i = 0; i < template_components.length; i++) {
          let salary_component = await SalaryComponents.query()
            .where('school_id', school_id as number)
            .andWhere('academic_year', accamic_session.id)
            .andWhere('id', template_components[i].salary_components_id)
            .first()

          if (!salary_component) {
            return ctx.response.status(404).json({ message: 'Salary component not found' })
          }

          if (
            salary_component.calculation_method === 'percentage' &&
            (template_components[i].amount || !template_components[i].percentage)
          ) {
            return ctx.response.status(422).json({
              comonent_id: salary_component.id,
              message:
                'Salary component has calculation method percentage, amount should be null and percentage should have valid value.',
            })
          }

          if (
            salary_component.calculation_method === 'amount' &&
            (!template_components[i].amount || template_components[i].percentage)
          ) {
            return ctx.response.status(422).json({
              comonent_id: salary_component.id,
              message:
                'Salary component has calculation method fixedd value, amount should be valid value and percentage should be null.',
            })
          }

          let tmplate = await TemplateComponents.create(
            {
              salary_templates_id: salary_template.id,
              salary_components_id: salary_component.id,
              amount: template_components[i].amount,
              percentage: template_components[i].percentage,
              is_based_on_annual_ctc: template_components[i].is_based_on_annual_ctc,
              is_mandatory: template_components[i].is_mandatory,
            },
            { client: trx }
          )

          components_for_tmplates.push(tmplate)
        }

        salary_template.serialize().template_components = components_for_tmplates

        await trx.commit()
        return ctx.response
          .status(201)
          .json({ ...salary_template.serialize(), template_components: components_for_tmplates })
      } catch (error) {
        await trx.rollback()
        return ctx.response.status(500).json({ message: error })
      }
    } else {
      return ctx.response
        .status(403)
        .json({ message: 'You are not authorized to perform this action' })
    }
  }

  async updateSalaryTemplate(ctx: HttpContext) {
    let school_id = ctx.auth.user!.school_id
    let template_id = ctx.params.template_id

    let salary_template = await SalaryTemplates.query()
      .preload('template_components')
      .where('id', template_id as number)
      .andWhere('school_id', school_id as number)
      .first()

    if (!salary_template) {
      return ctx.response.status(404).json({ message: 'Salary Template not found' })
    }

    /**
     * Add code here to check wether this template is been assigned to anyone or not
     *  */

    let {
      existing_salary_components,
      new_salary_components,
      remove_salary_components,
      ...payload
    } = await UpdateValidatorForSalaryTemplates.validate(ctx.request.body())

    let trx = await db.transaction()

    try {
      if (Object.keys(payload).length > 0) {
        // return ctx.response.status(422).json({ message: 'No data to update' })
        await salary_template.merge(payload).useTransaction(trx).save()
      }

      if (existing_salary_components && existing_salary_components.length > 0) {
        for (let i = 0; i < existing_salary_components.length; i++) {
          // let temp_component = await TemplateComponents.query()
          //   .where('salary_templates_id', salary_template.id)
          //   .andWhere('salary_components_id', existing_salary_components[i].salary_components_id)
          //   .first()

          let temp_component = salary_template.template_components.find(
            (component) =>
              component.salary_components_id === existing_salary_components[i].salary_components_id
          )

          if (!temp_component) {
            return ctx.response.status(404).json({
              components_id: existing_salary_components[i].salary_components_id,
              message: 'Template Component not found',
            })
          }

          if (
            temp_component.amount &&
            existing_salary_components[i].amount &&
            (existing_salary_components[i].percentage || !existing_salary_components[i].amount)
          ) {
            return ctx.response.status(422).json({
              comonent_id: existing_salary_components[i].salary_components_id,
              message:
                'Salary component has calculation method percentage, amount should be null and percentage should have valid value.',
            })
          }

          if (
            temp_component.percentage &&
            existing_salary_components[i].percentage &&
            (!existing_salary_components[i].percentage || existing_salary_components[i].amount)
          ) {
            return ctx.response.status(422).json({
              comonent_id: existing_salary_components[i].salary_components_id,
              message:
                'Salary component has calculation method fixedd value, amount should be valid value and percentage should be null.',
            })
          }

          await temp_component.merge(existing_salary_components[i]).useTransaction(trx).save()
        }
      }

      if (new_salary_components && new_salary_components.length > 0) {
        for (let i = 0; i < new_salary_components.length; i++) {
          let temp_component = salary_template.template_components.find(
            (component) =>
              component.salary_components_id === new_salary_components[i].salary_components_id
          )

          if (temp_component) {
            return ctx.response.status(422).json({
              comonent_id: new_salary_components[i].salary_components_id,
              message: 'Salary component already exists in template',
            })
          }

          let salary_component = await SalaryComponents.query()
            .where('school_id', school_id as number)
            .andWhere('id', new_salary_components[i].salary_components_id)
            .first()

          if (!salary_component) {
            return ctx.response.status(404).json({ message: 'Salary component not found' })
          }

          if (
            salary_component.calculation_method === 'percentage' &&
            (new_salary_components[i].amount || !new_salary_components[i].percentage)
          ) {
            return ctx.response.status(422).json({
              comonent_id: salary_component.id,
              message:
                'Salary component has calculation method percentage, amount should be null and percentage should have valid value.',
            })
          }

          if (
            salary_component.calculation_method === 'amount' &&
            (!new_salary_components[i].amount || new_salary_components[i].percentage)
          ) {
            return ctx.response.status(422).json({
              comonent_id: salary_component.id,
              message:
                'Salary component has calculation method fixedd value, amount should be valid value and percentage should be null.',
            })
          }

          await TemplateComponents.create(
            {
              salary_templates_id: salary_template.id,
              salary_components_id: salary_component.id,
              amount: new_salary_components[i].amount,
              percentage: new_salary_components[i].percentage,
              is_based_on_annual_ctc: new_salary_components[i].is_based_on_annual_ctc,
              is_mandatory: new_salary_components[i].is_mandatory,
            },
            { client: trx }
          )
        }
      }

      if (remove_salary_components && remove_salary_components.length > 0) {
        for (let i = 0; i < remove_salary_components.length; i++) {
          // let temp = await TemplateComponents.query()
          //   .where('salary_templates_id', salary_template.id)
          //   .andWhere('salary_components_id', remove_salary_components[i].salary_components_id)
          //   .first()

          let temp_component = salary_template.template_components.find(
            (component) =>
              component.salary_components_id === remove_salary_components[i].salary_components_id
          )

          if (!temp_component) {
            return ctx.response
              .status(404)
              .json({ message: 'Salary component not found for delete !' })
          }
          await temp_component.useTransaction(trx).delete()
        }
      }

      await trx.commit()
      return ctx.response.status(201).json({ ...salary_template.serialize() })
    } catch (error) {
      await trx.rollback()
      return ctx.response.status(500).json({ message: error })
    }
  }

  async fetchSalaryTemplateForSingleStaff(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id
    const staff_id = ctx.params.staff_id

    let active_academic_seesion = await db.from('users') /* Dummy replacement for AcademicSession */
      .where('school_id', school_id as number)
      .andWhere('is_active', true)
      .first()

    if (!active_academic_seesion) {
      return ctx.response.status(422).json({ message: 'Academic session is not active' })
    }

    let staff_enrollment = await StaffEnrollment.query()
      .where('staff_id', staff_id as number)
      .andWhere('academic_year', active_academic_seesion!.id)
      .first()

    if (!staff_enrollment) {
      return ctx.response.status(404).json({ message: 'Staff enrollment not found' })
    }

    let salary_template = await StaffSalaryTemplates.query()
      .preload('template_components')
      .preload('base_template', (query) => {
        query.preload('template_components')
      })
      // .where('school_id', school_id as number)
      .where('staff_enrollments_id', staff_enrollment.id)
      .first()

    if (!salary_template) {
      return ctx.response.status(404).json({ message: 'Salary Template not found' })
    }

    return ctx.response.status(200).json(salary_template)
  }

  async createStaffSalaryTemplate(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id
    const role_id = ctx.auth.user!.role_id

    let accademic_session = await db.from('users') /* Dummy replacement for AcademicSession */
      .where('school_id', school_id as number)
      .andWhere('is_active', true)
      .first()

    if (!accademic_session) {
      return ctx.response.status(422).json({ message: 'Academic session is not active' })
    }

    const { template_components, ...payload } =
      await CreateValidatorForStaffSalaryTemplates.validate(ctx.request.body())

    if (role_id == 1 || role_id == 2) {
      let staff_enrollment = await StaffEnrollment.query()
        .preload('staff')
        .where('academic_year', accademic_session.id)
        .andWhere('staff_id', payload.staff_id)
        .first()

      if (!staff_enrollment) {
        return ctx.response.status(422).json({ message: 'Staff enrollment not found' })
      }

      let base_template = await SalaryTemplates.query()
        .preload('template_components')
        .where('school_id', school_id as number)
        .andWhere('id', payload.base_template_id)
        .first()

      if (!base_template) {
        return ctx.response.status(422).json({ message: 'Base template not found' })
      }

      let trx = await db.transaction()

      try {
        let salary_template = await StaffSalaryTemplates.create(
          {
            base_template_id: payload.base_template_id,
            staff_enrollments_id: staff_enrollment.id,
            template_name: payload.template_name,
            template_code: payload.template_code,
            description: payload.description,
            annual_ctc: payload.annual_ctc,
          },
          { client: trx }
        )

        let components_for_tmplates: StaffTemplateComponents[] = []
        for (let i = 0; i < template_components.length; i++) {
          // let temp_component: TemplateComponents | null =
          //   base_template.template_components.find(
          //     (component) =>
          //       component.salary_components_id === template_components[i].salary_components_id
          //   ) ?? null

          // if (!temp_component) {
          //   return ctx.response.status(404).json({
          //     components_id: template_components[i].salary_components_id,
          //     message: 'Salary component is not in Template Component not found',
          //   })
          // }

          let salary_component = await SalaryComponents.query()
            .where('school_id', school_id as number)
            .andWhere('id', template_components[i].salary_components_id)
            .first()

          if (!salary_component) {
            return ctx.response.status(404).json({ message: 'Salary component not found' })
          }

          if (
            salary_component.calculation_method === 'percentage' &&
            (template_components[i].amount || !template_components[i].percentage)
          ) {
            return ctx.response.status(422).json({
              comonent_id: salary_component.id,
              message:
                'Salary component has calculation method percentage, amount should be null and percentage should have valid value.',
            })
          }

          if (
            salary_component.calculation_method === 'amount' &&
            (!template_components[i].amount || template_components[i].percentage)
          ) {
            return ctx.response.status(422).json({
              comonent_id: salary_component.id,
              message:
                'Salary component has calculation method fixedd value, amount should be valid value and percentage should be null.',
            })
          }

          if (
            salary_component.component_type === 'earning' &&
            (template_components[i].recovering_end_month ||
              template_components[i].total_recovering_amount)
          ) {
            return ctx.response.status(422).json({
              comonent_id: salary_component.id,
              message:
                'Salary component is type of Earning , recovering_end_month and total_recovering_amount should be null.',
            })
          }

          let tmplate = await StaffTemplateComponents.create(
            {
              staff_salary_templates_id: salary_template.id,
              salary_components_id: salary_component.id,
              amount: template_components[i].amount,
              percentage: template_components[i].percentage,
              is_mandatory: salary_component.is_mandatory,
              total_recovered_amount: template_components[i].total_recovered_amount,
              total_recovering_amount: template_components[i].total_recovering_amount,
              recovering_end_month: template_components[i].recovering_end_month,
            },
            { client: trx }
          )

          components_for_tmplates.push(tmplate)
        }

        salary_template.serialize().template_components = components_for_tmplates

        await trx.commit()
        return ctx.response
          .status(201)
          .json({ ...salary_template.serialize(), template_components: components_for_tmplates })
      } catch (error) {}
    } else {
      return ctx.response
        .status(403)
        .json({ message: 'You are not authorized to perform this action' })
    }
  }

  async updateStaffSalaryTemplate(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id
    const role_id = ctx.auth.user!.role_id
    const staff_id = ctx.params.staff_id
    const template_id = ctx.params.template_id

    let accademic_session = await db.from('users') /* Dummy replacement for AcademicSession */
      .where('school_id', school_id as number)
      .andWhere('is_active', true)
      .first()

    if (!accademic_session) {
      return ctx.response.status(422).json({ message: 'Academic session is not active' })
    }

    let staff_enrollment = await StaffEnrollment.query()
      .preload('staff')
      .where('academic_year', accademic_session.id)
      .andWhere('staff_id', staff_id)
      .first()

    if (!staff_enrollment) {
      return ctx.response.status(422).json({ message: 'Staff enrollment not found' })
    }

    let staff_salary_template = await StaffSalaryTemplates.query()
      .preload('template_components')
      .where('staff_enrollments_id', staff_enrollment.id)
      .andWhere('id', template_id as number)
      .first()

    if (!staff_salary_template) {
      return ctx.response.status(404).json({ message: 'Staff Salary Template not found' })
    }

    if (role_id == 1 || role_id == 2) {
      let {
        existing_salary_components,
        new_salary_components,
        remove_salary_components,
        ...payload
      } = await UpdateValidatorForStaffSalaryTemplates.validate(ctx.request.body())

      let trx = await db.transaction()

      try {
        if (Object.keys(payload).length > 0) {
          await staff_salary_template.merge(payload).useTransaction(trx).save()
        }

        if (existing_salary_components && existing_salary_components.length > 0) {
          for (let i = 0; i < existing_salary_components.length; i++) {
            let temp_component = staff_salary_template.template_components.find(
              (component) =>
                component.salary_components_id ===
                existing_salary_components[i].salary_components_id
            )

            if (!temp_component) {
              return ctx.response.status(404).json({
                components_id: existing_salary_components[i].salary_components_id,
                message: 'Salary component not found',
              })
            }

            if (
              temp_component.amount &&
              existing_salary_components[i].amount &&
              (existing_salary_components[i].percentage || !existing_salary_components[i].amount)
            ) {
              return ctx.response.status(422).json({
                comonent_id: existing_salary_components[i].salary_components_id,
                message:
                  'Salary component has calculation method percentage, amount should be null and percentage should have valid value.',
              })
            }

            if (
              temp_component.percentage &&
              existing_salary_components[i].percentage &&
              (!existing_salary_components[i].percentage || existing_salary_components[i].amount)
            ) {
              return ctx.response.status(422).json({
                comonent_id: existing_salary_components[i].salary_components_id,
                message:
                  'Salary component has calculation method fixedd value, amount should be valid value and percentage should be null.',
              })
            }

            await temp_component.merge(existing_salary_components[i]).useTransaction(trx).save()
          }
        }

        if (new_salary_components && new_salary_components.length > 0) {
          for (let i = 0; i < new_salary_components.length; i++) {
            let temp_component = staff_salary_template.template_components.find(
              (component) =>
                component.salary_components_id === new_salary_components[i].salary_components_id
            )

            if (temp_component) {
              return ctx.response.status(422).json({
                comonent_id: new_salary_components[i].salary_components_id,
                message: 'Salary component already exists in template',
              })
            }

            let salary_component = await SalaryComponents.query()
              .where('school_id', school_id as number)
              .andWhere('id', new_salary_components[i].salary_components_id)
              .first()

            if (!salary_component) {
              return ctx.response.status(404).json({ message: 'Salary component not found' })
            }

            if (
              salary_component.calculation_method === 'percentage' &&
              (new_salary_components[i].amount || !new_salary_components[i].percentage)
            ) {
              return ctx.response.status(422).json({
                comonent_id: salary_component.id,
                message:
                  'Salary component has calculation method percentage, amount should be null and percentage should have valid value.',
              })
            }

            if (
              salary_component.calculation_method === 'amount' &&
              (!new_salary_components[i].amount || new_salary_components[i].percentage)
            ) {
              return ctx.response.status(422).json({
                comonent_id: salary_component.id,
                message:
                  'Salary component has calculation method fixedd value, amount should be valid value and percentage should be null.',
              })
            }

            await StaffTemplateComponents.create(
              {
                staff_salary_templates_id: staff_salary_template.id,
                salary_components_id: salary_component.id,
                amount: new_salary_components[i].amount,
                percentage: new_salary_components[i].percentage,
                is_mandatory: salary_component.is_mandatory,
                total_recovered_amount: new_salary_components[i].total_recovered_amount,
                total_recovering_amount: new_salary_components[i].total_recovering_amount,
                recovering_end_month: new_salary_components[i].recovering_end_month,
              },
              { client: trx }
            )
          }
        }

        if (remove_salary_components && remove_salary_components.length > 0) {
          for (let i = 0; i < remove_salary_components.length; i++) {
            let temp_component = staff_salary_template.template_components.find(
              (component) =>
                component.salary_components_id === remove_salary_components[i].salary_components_id
            )

            if (!temp_component) {
              return ctx.response
                .status(404)
                .json({ message: 'Salary component not found for delete !' })
            }
            await temp_component.useTransaction(trx).delete()
          }
        }

        await trx.commit()
        return ctx.response.status(201).json({ ...staff_salary_template.serialize() })
      } catch (error) {
        await trx.rollback()
        return ctx.response.status(500).json({ message: error })
      }
    } else {
      return ctx.response
        .status(403)
        .json({ message: 'You are not authorized to perform this action' })
    }
  }

  // Pay run y

  /**
   * Listing of all employees
   * need a view pannel for view salary details and edit if
   * wehen make it pay it will irreversible
   */

  async fetchStaffWithSalaryTemplates(ctx: HttpContext) {
    let school_id = ctx.auth.user!.school_id

    // let period=2025-5
    let period = ctx.request.input('period')

    // Validate the period format
    const periodRegex = /^\d{4}-(0[1-9]|1[0-2])$/ // Matches YYYY-MM format
    if (!periodRegex.test(period)) {
      return ctx.response
        .status(422)
        .json({ message: 'Invalid period format. Expected format: YYYY-MM' })
    }

    const [year, month] = period.split('-')

    let accademic_session = await db.from('users') /* Dummy replacement for AcademicSession */
      .where('school_id', school_id as number)
      .andWhere('is_active', true)
      .first()

    if (!accademic_session) {
      return ctx.response.status(422).json({ message: 'Academic session is not active' })
    }

    let staff_with_salary_templates = await StaffEnrollment.query()
      .preload('staff', (query) => {
        query.select('id', 'staff_role_id', 'first_name', 'last_name', 'email')
        query.preload('role_type')
      })
      .preload('pay_runs', (query) => {
        query.where('payroll_period', `${year}-${month}`)
      })
      .preload('staff_salary_templates')
      .where('academic_year', accademic_session.id)
      .andWhereNot('status', 'Resigned')
      .paginate(ctx.request.input('page', 1), 10)

    return ctx.response.status(201).json(staff_with_salary_templates)
  }

  async createPayRunForStaff(ctx: HttpContext) {
    let { payroll_components, ...other_paylaod } = await CreatePayRunTemplateValidator.validate(
      ctx.request.all()
    )

    let active_session = await db.from('users') /* Dummy replacement for AcademicSession */
      .where('school_id', ctx.auth.user!.school_id as number)
      .andWhere('is_active', true)
      .first()

    if (!active_session) {
      return ctx.response.status(422).json({ message: 'Academic session is not active' })
    }

    let satff_enrollment = await StaffEnrollment.query()
      .preload('staff_salary_templates', (query) => {
        query.preload('template_components', (query) => {
          query.preload('salary_component')
        })
      })
      .where('id', other_paylaod.staff_enrollments_id)
      .andWhere('academic_year', active_session.id)
      .first()

    if (!satff_enrollment) {
      return ctx.response.status(422).json({ message: 'No Staff Found.' })
    }

    let trx = await db.transaction()
    try {
      let added_payroll_components: SatffPayrunComponents[] = []

      // let total_payroll = 0
      // let anuaual_ctc = other_paylaod.based_anual_ctc
      // let basic_pay_component = satff_enrollment.staff_salary_templates.template_components.find(
      //   (temp_component) => temp_component.salary_component.is_based_on_annual_ctc
      // )
      // if (!basic_pay_component) {
      //   return ctx.response.status(422).json({ message: 'Basic pay component not found' })
      // }

      // let basic_pay = basic_pay_component.percentage
      //   ? other_paylaod.based_anual_ctc * (basic_pay_component.percentage / 100)
      //   : basic_pay_component.amount;

      //   total_payroll =

      let pay_run_tmp = await SatffPayrunTemplates.create(
        {
          base_template_id: other_paylaod.base_template_id,
          staff_enrollments_id: other_paylaod.staff_enrollments_id,
          payroll_period: `${other_paylaod.payroll_year}-${other_paylaod.payroll_month}`,
          template_name: other_paylaod.template_name,
          template_code: other_paylaod.template_code,
          based_anual_ctc: other_paylaod.based_anual_ctc,
          total_payroll: other_paylaod.total_payroll,
          notes: other_paylaod.notes,
          status: 'draft',
        },
        { client: trx }
      )

      console.log('payroll_components', payroll_components)
      for (let i = 0; i < payroll_components.length; i++) {
        let temp_component = satff_enrollment.staff_salary_templates.template_components.find(
          (component) =>
            component.salary_components_id === payroll_components[i].salary_components_id
        )
        if (!temp_component) {
          return ctx.response.status(404).json({
            components_id: payroll_components[i].salary_components_id,
            message: 'Salary component not found in template',
          })
        }

        if (
          temp_component.amount &&
          (!payroll_components[i].amount || payroll_components[i].percentage)
        ) {
          return ctx.response.status(422).json({
            comonent_id: payroll_components[i].salary_components_id,
            message:
              'Salary component has calculation method percentage, amount should be null and percentage should have valid value.',
          })
        }

        if (
          temp_component.percentage &&
          (!payroll_components[i].percentage || payroll_components[i].amount)
        ) {
          return ctx.response.status(422).json({
            comonent_id: payroll_components[i].salary_components_id,
            message:
              'Salary component has calculation method fixedd value, amount should be valid value and percentage should be null.',
          })
        }

        let payrun_comp = await SatffPayrunComponents.create(
          {
            ...payroll_components[i],
            satff_payrun_templates_id: pay_run_tmp.id,
          },
          { client: trx }
        )
        added_payroll_components.push(payrun_comp)
      }

      await trx.commit()
      return ctx.response.status(201).json({ ...pay_run_tmp.serialize(), payroll_components })
    } catch (error) {
      await trx.rollback()
      return ctx.response.status(500).json({ error: error })
    }
  }

  async udpdatePayRunTemplate(ctx: HttpContext) {
    const school_id = ctx.auth.user!.school_id
    // const role_id = ctx.auth.user!.role_id
    const staff_id = ctx.params.staff_id
    const payrun_template_id = ctx.params.payrun_template_id

    try {
      let active_session = await db.from('users') /* Dummy replacement for AcademicSession */
        .where('school_id', school_id as number)
        .andWhere('is_active', true)
        .first()

      if (!active_session) {
        return ctx.response.status(422).json({ message: 'Academic session is not active' })
      }

      let staff_enrollment = await StaffEnrollment.query()
        .where('staff_id', staff_id as number)
        .andWhere('academic_year', active_session!.id)
        .first()

      if (!staff_enrollment) {
        return ctx.response.status(422).json({ message: 'Staff enrollment not found' })
      }

      let pay_run_tmp = await SatffPayrunTemplates.query()
        .where('staff_enrollments_id', staff_enrollment.id)
        .andWhere('id', payrun_template_id)
        .first()

      if (!pay_run_tmp) {
        return ctx.response.status(422).json({ message: 'Pay run template not found' })
      }

      await pay_run_tmp.merge(ctx.request.body()).save()
      return ctx.response.status(200).json(pay_run_tmp)
    } catch (error) {
      return ctx.response.status(500).json({ message: error })
    }
  }
}
