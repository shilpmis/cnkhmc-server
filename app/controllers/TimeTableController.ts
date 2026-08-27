import ClassDayConfig from '#models/ClassDayConfig'
import Classes from '#models/Classes'
import Divisions from '#models/Divisions'
import LabConfig from '#models/LabConfig'
import PeriodsConfig from '#models/PeriodsConfig'
import SchoolTimeTableConfig from '#models/SchoolTimeTableConfig'
import { CreateValidatorForClassDayConfig, CreateValidatorForLabConfig, CreateValidatorForPeriodConfig, CreateValidatorForSchoolTimeTableConfig, UpdateValidatorForClassDayConfig, UpdateValidatorForLabConfig, UpdateValidatorForPeriodConfig, UpdateValidatorForSchoolTimeTableConfig, ValidatorForCheckPeriodConfig, UpdateValidatorForPeriodConfigWeek } from '#validators/TimeTable'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import SubjectDivisionMaster from '#models/SubjectDivisionMaster'
// @ts-ignore
import PdfPrinterPkg from 'pdfmake/js/Printer.js'
const PdfPrinter = PdfPrinterPkg.default || PdfPrinterPkg
import fs from 'node:fs'
import path from 'node:path'

const fonts = {
  Roboto: {
    normal: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Regular.ttf'),
    bold: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Medium.ttf'),
    italics: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Italic.ttf'),
    bolditalics: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-MediumItalic.ttf')
  }
}


interface TypeForPeriodsConfig {
  id?: number;
  class_day_config_id: number;
  division_id: number;
  period_order: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
  subjects_division_masters_id: number | null;
  staff_enrollment_id: number | null;
  lab_id: number | null;
  is_pt: boolean;
  is_free_period: boolean;
}


export default class TimeTableController {

  async getTeacherTimetable(ctx: HttpContext) {
    const user = ctx.auth.user!
    if (!user.staff_id) {
      return ctx.response.forbidden({ message: 'Only staff can access teacher timetable' })
    }

    const academic_session_id = ctx.request.input('academic_session_id')
    if (!academic_session_id) {
      return ctx.response.badRequest({ message: 'academic_session_id is required' })
    }

    // Find the staff enrollment for this session
    const staffEnrollment = await db.from('staff_enrollments')
      .where('staff_id', user.staff_id)
      // .where('academic_year', academic_session_id)
      .first()

    if (!staffEnrollment) {
      return ctx.response.notFound({ message: 'Staff enrollment not found for this session' })
    }

    // Fetch all periods assigned to this staff
    const periods = await PeriodsConfig.query()
      .where('staff_enrollment_id', staffEnrollment.id)
      .preload('lab')
      .preload('period_config_subject', (query) => {
        query.preload('subject')
      })
      .preload('period_config_class_day', (query) => {
        query.preload('class')
      })

    return ctx.response.json(periods)
  }

  async getTeacherAvailability(ctx: HttpContext) {
    const user = ctx.auth.user!
    if (!user.staff_id) {
      return ctx.response.forbidden({ message: 'Only staff can access teacher availability' })
    }

    const academic_session_id = ctx.request.input('academic_session_id')
    if (!academic_session_id) {
      return ctx.response.badRequest({ message: 'academic_session_id is required' })
    }

    // Return dummy projected availability for now to fix the frontend crashing
    return ctx.response.json({
      projectedAvailablePeriods: {},
      todayIsHoliday: false
    })
  }

  async getSchoolTimeTableConfig(ctx: HttpContext) {
    try {
      let academic_session_id =
        ctx.params.academic_year ||
        ctx.params.academic_session_id ||
        ctx.request.input('academic_year') ||
        ctx.request.input('academic_session_id');

      if (!academic_session_id) {
        return ctx.response.ok(null)
      }
      
      let school_timetable_config = await SchoolTimeTableConfig
        .query()
        .preload('lab_config')
        .preload('class_day_config', (query) => {
          query.preload('period_config')
        })
        .where('academic_year', Number(academic_session_id))
        .first()

      if (!school_timetable_config) {
        return ctx.response.ok(null)
      }

      return ctx.response.json(school_timetable_config)
    } catch (error) {
      console.error('Error fetching school timetable config:', error)
      return ctx.response.ok(null)
    }
  }

  async createSchoolTimeTableConfig(ctx: HttpContext) {

    let payload = await CreateValidatorForSchoolTimeTableConfig.validate(ctx.request.all())

    try {
      const { academic_session_id, ...restPayload } = payload
      
      const configData = {
        ...restPayload,
        academic_year: restPayload.academic_year || academic_session_id
      }
      
      let school_timetable_config = await SchoolTimeTableConfig.create(configData);
      return ctx.response.status(201).json(school_timetable_config)
    } catch (error) {
      console.log(error)
      return ctx.response.badRequest({ message: 'Error creating school time table config' })
    }

  }

  async updateSchoolTimeTableConfig(ctx: HttpContext) {
    const id = ctx.params.id;
    const { academic_session_id } = ctx.request.all();
    const payload = await UpdateValidatorForSchoolTimeTableConfig.validate(ctx.request.all());

    let school_timetable_config = null;
    if (id) {
      school_timetable_config = await SchoolTimeTableConfig.find(id);
    } else if (academic_session_id) {
      school_timetable_config = await SchoolTimeTableConfig
        .query()
        .where('academic_year', academic_session_id as number)
        .first();
    }

    if (!school_timetable_config) {
      return ctx.response.notFound({ message: 'School Time Table Config not found' });
    }

    // Check if any day configs exist for this timetable config
    const existingDayConfigs = await ClassDayConfig
      .query()
      .where('school_timetable_config_id', school_timetable_config.id);

    // Only check if field exists in payload and day configs exist
    if (
      payload.max_periods_per_day !== undefined &&
      existingDayConfigs.length > 0 &&
      payload.max_periods_per_day < school_timetable_config.max_periods_per_day
    ) {
      return ctx.response.badRequest({
        message: 'Cannot reduce max_periods_per_day because day configs exist. Please delete all day configs before making this change.'
      });
    }

    if (
      payload.allowed_period_durations !== undefined &&
      existingDayConfigs.length > 0
    ) {
      return ctx.response.badRequest({
        message: 'Cannot update allowed_period_durations because day configs exist. Please delete all day configs before making this change.'
      });
    }

    // We allow enabling labs even if day configs exist, 
    // as it doesn't necessarily break existing structures, just allows new slot types.
    // However, disabling it might be problematic if labs are already used in periods.
    if (
      payload.lab_enabled === false &&
      existingDayConfigs.length > 0
    ) {
      // Check if any periods are using labs
      const labPeriods = await db.from('periods_config')
        .whereIn('class_day_config_id', existingDayConfigs.map(c => c.id))
        .whereNotNull('lab_id')
        .first();

      if (labPeriods) {
        return ctx.response.badRequest({
          message: 'Cannot disable lab_enabled because there are periods already assigned to labs. Please remove those assignments first.'
        });
      }
    }

    if (
      payload.pt_enabled === false &&
      existingDayConfigs.length > 0
    ) {
       // Check if any periods are marked as PT
       const ptPeriods = await db.from('periods_config')
       .whereIn('class_day_config_id', existingDayConfigs.map(c => c.id))
       .where('is_pt', true)
       .first();

     if (ptPeriods) {
       return ctx.response.badRequest({
         message: 'Cannot disable pt_enabled because there are periods already marked as PT. Please remove those assignments first.'
       });
     }
    }

    if (
      payload.period_gap_duration !== undefined &&
      existingDayConfigs.length > 0
    ) {
      return ctx.response.badRequest({
        message: 'Cannot update period_gap_duration because day configs exist. Please delete all day configs before making this change.'
      });
    }

    // Update the config
    school_timetable_config.merge({ ...payload });
    await school_timetable_config.save();

    return ctx.response.ok(school_timetable_config);
  }


  async createLabConfig(ctx: HttpContext) {
    let { school_timetable_config_id, ...payload } = await CreateValidatorForLabConfig.validate(ctx.request.all())

    let school_timetable_config = await SchoolTimeTableConfig
      .query()
      .where('id', school_timetable_config_id)
      .first()

    if (!school_timetable_config) {
      return ctx.response.badRequest({ message: 'School Time Table Config not found' })
    }

    let trx = await db.transaction()
    try {
      let res: LabConfig[] = []
      for (let i = 0; i < payload.labs.length; i++) {
        let lab = payload.labs[i]
        let checl_lab_config = await LabConfig.query().where('school_timetable_config_id', school_timetable_config_id).andWhere('name', lab.name).first()
        if (checl_lab_config) {
          return ctx.response.badRequest({ message: `Lab with name ${lab.name} already exists` })
        }
        let lab_config = await LabConfig.create({ ...lab, school_timetable_config_id, type: 'other' }, { client: trx });
        res.push(lab_config)
      }
      await trx.commit()
      return ctx.response.status(201).json(res)
    } catch (error) {
      await trx.rollback()
      console.log(error)
      return ctx.response.badRequest({ message: 'Error creating lab config' })
    }

  }

  async updateLabConfig(ctx: HttpContext) {
    const { lab_id } = ctx.request.all();
    const payload = await UpdateValidatorForLabConfig.validate(ctx.request.all());

    if (!lab_id) {
      return ctx.response.badRequest({ message: 'lab_id is required' });
    }

    const labConfig = await LabConfig.query().where('id', lab_id).first();
    if (!labConfig) {
      return ctx.response.notFound({ message: 'Lab config not found' });
    }

    // If reducing max_capacity, check for conflicts
    if (
      payload.max_capacity &&
      payload.max_capacity < labConfig.max_capacity
    ) {
      // Find all periods for this lab, grouped by day and time slot
      const periods = await PeriodsConfig.query()
        .where('lab_id', lab_id)
        .select('class_day_config_id', 'start_time', 'end_time');

      // Group by day and time slot
      const slotMap: Record<string, number> = {};
      for (const period of periods) {
        const key = `${period.class_day_config_id}_${period.start_time}_${period.end_time}`;
        slotMap[key] = (slotMap[key] || 0) + 1;
      }

      // If any slot exceeds the new max_capacity, block update
      const exceeds = Object.values(slotMap).some((count) => count > payload.max_capacity!);
      if (exceeds) {
        return ctx.response.badRequest({
          message:
            'Cannot reduce max_capacity. There are already more periods scheduled concurrently than the new capacity allows. Please update or delete conflicting periods first.',
        });
      }
    }

    labConfig.merge(payload);
    await labConfig.save();

    return ctx.response.ok(labConfig);
  }

  async deleteLabConfig(ctx: HttpContext) {
    const { lab_id } = ctx.request.all();

    if (!lab_id) {
      return ctx.response.badRequest({ message: 'lab_id is required' });
    }

    const labConfig = await LabConfig.query().where('id', lab_id).first();
    if (!labConfig) {
      return ctx.response.notFound({ message: 'Lab config not found' });
    }

    // Check if there are any periods assigned to this lab
    const periods = await PeriodsConfig.query().where('lab_id', lab_id).first();
    if (periods) {
      return ctx.response.badRequest({ message: 'Cannot delete lab config. There are periods assigned to this lab.' });
    }

    await labConfig.delete();

    return ctx.response.ok({ message: 'Lab config deleted successfully' });
  }


  async createClassDayConfig(ctx: HttpContext) {
    let payload = await CreateValidatorForClassDayConfig.validate(ctx.request.all())

    let school_timetable_config = await SchoolTimeTableConfig
      .query()
      .where('id', payload.school_timetable_config_id)
      .first()

    if (!school_timetable_config) {
      return ctx.response.badRequest({ message: 'School Time Table Config not found' })
    }

    try {
      let class_day_config = await ClassDayConfig.create({
        ...payload
      })
      return ctx.response.status(201).json(class_day_config)
    } catch (error) {
      console.log(error)
      return ctx.response.badRequest({ message: 'Error creating class day config' })
    }
  }

   async updateClassDayConfig(ctx: HttpContext) {
    const { class_day_config_id } = ctx.params;
    try {
      const payload = await UpdateValidatorForClassDayConfig.validate(ctx.request.all());
      
      const classDayConfig = await ClassDayConfig.query().where('id', class_day_config_id).first();
      if (!classDayConfig) {
        return ctx.response.notFound({ message: 'Class Day Config not found' });
      }

      // Check if any periods exist for this class_day_config (i.e., timetable already created for any division)
      const existingPeriods = await PeriodsConfig.query()
        .where('class_day_config_id', class_day_config_id)
        .first();

      // If critical fields are being changed and periods exist, block update
      if (
        existingPeriods &&
        (
          payload.allowed_durations !== undefined ||
          payload.max_consecutive_periods !== undefined ||
          payload.day_start_time !== undefined ||
          payload.day_end_time !== undefined
        )
      ) {
        return ctx.response.badRequest({
          message: 'Cannot update allowed_durations, max_consecutive_periods, day_start_time, or day_end_time because timetable already exists for this day. Please delete all periods for this day before making this change.'
        });
      }

      // Update the config
      classDayConfig.merge({
        ...payload,
      });
      await classDayConfig.save();

      return ctx.response.ok(classDayConfig);
    } catch (error) {
      console.log('Error updating class day config:', error);
      if (error.messages) {
        console.log('Validation errors:', error.messages);
      }
      return ctx.response.badRequest({ 
        message: 'Error updating class day config', 
        errors: error.messages || error.message 
      });
    }
  }

  // async deleteClassConfigForWeek(ctx: HttpContext) {

  // }

  async fetchTimeTableForDivision(ctx: HttpContext) {
    let { division_id } = ctx.params
    let academic_session_id = ctx.request.input('academic_session') || ctx.request.input('academic_session_id') || ctx.params.academic_year || ctx.params.academic_session_id;
    console.log(`Fetching timetable for division: ${division_id}, session: ${academic_session_id}`);

    let division = await Divisions.query().where('id', division_id).first();
    if (!division) {
      return ctx.response.badRequest({ message: 'Division not found' })
    }

    let cls = await Classes.query().where('id', division.class_id).andWhere('school_id', ctx.auth.user!.school_id as number).first();

    if (!cls) {
      return ctx.response.badRequest({ message: 'Class not found for provided Division' })
    }
    console.log(`Found class: ${cls.id} for division: ${division_id}`);

    let school_timetable_config = await SchoolTimeTableConfig
      .query()
      .where('academic_year', Number(academic_session_id))
      .preload('lab_config')
      .preload('class_day_config', (class_query) => {
        class_query.preload('period_config', (query) => {
          query.where('division_id', division_id)
            .preload('period_config_subject', (sq) => sq.preload('subject'))
            .preload('period_config_class_day', (cq) => cq.preload('class'))
            .preload('staff_enrollment', (seq) => seq.preload('staff'))
        })
        class_query.where('class_id', cls.id)
      })
      .first()

    if (!school_timetable_config) {
      console.log(`SchoolTimeTableConfig NOT FOUND for session: ${academic_session_id}`);
      return ctx.response.notFound({ 
        message: `School Time Table Config not found for academic session ID: ${academic_session_id}`,
        session_id: academic_session_id 
      })
    }

    const configuredClasses = await db.from('class_day_config')
      .where('school_timetable_config_id', school_timetable_config.id)
      .distinct('class_id');
    
    console.log(`Found SchoolTimeTableConfig: ${school_timetable_config.id}, class_day_config count: ${school_timetable_config.class_day_config?.length || 0}`);
    console.log(`Requested Class ID: ${cls.id}, Configured Class IDs: ${configuredClasses.map(c => c.class_id).join(', ')}`);
    console.log(`Class Day Config details: ${JSON.stringify(school_timetable_config.class_day_config.map(c => ({ id: c.id, class_id: c.class_id, day: c.day } )))}`);

    return ctx.response.json(school_timetable_config)
  }

  async createTimeTableForDivisionForADay(ctx: HttpContext) {
    let { division_id, class_day_config_id, periods } = await CreateValidatorForPeriodConfig.validate(ctx.request.all());

    // check if class_day_config_id is valid
    let class_day_config = await ClassDayConfig
      .query()
      .where('id', class_day_config_id)
      .first()

    if (!class_day_config) {
      return ctx.response.badRequest({ message: 'Class Day Config not found' })
    }

    // check school_timetable_config_id 
    let school_timetable_config = await SchoolTimeTableConfig
      .query()
      .where('id', class_day_config.school_timetable_config_id)
      .first()

    if (!school_timetable_config) {
      return ctx.response.badRequest({ message: 'School Time Table Config not found' })
    }

    // check if division_id is valid
    let division = await Divisions.query().where('id', division_id).first();
    if (!division) {
      return ctx.response.badRequest({ message: 'Division not found' })
    }

    if (division.class_id != class_day_config.class_id) {
      return ctx.response.badRequest({ message: 'Class id in class day config does not match with division class id' })
    }

    let trx = await db.transaction()
    let res: PeriodsConfig[] = []
    try {
      let check_period_config = await PeriodsConfig
        .query()
        .where('class_day_config_id', class_day_config_id)
        .andWhere('division_id', division_id)
        .first()
      if (check_period_config) {
        return ctx.response.badRequest({ message: `Periods for day ${class_day_config.day} already exists configured` })
      }

      for (let i = 0; i < periods.length; i++) {
        let period = periods[i]

        let period_config = await PeriodsConfig.create({
          class_day_config_id: class_day_config_id,
          division_id: division_id,
          period_order: period.period_order,
          start_time: period.start_time,
          end_time: period.end_time,
          is_break: period.is_break,
          subjects_division_masters_id: period.subjects_division_masters_id,
          staff_enrollment_id: period.staff_enrollment_id,
          lab_id: period.lab_id,
          is_pt: period.is_pt,
          is_free_period: period.is_free_period
        }, { client: trx })
        res.push(period_config)
      }
      await trx.commit()
      return ctx.response.status(201).json(res)
    } catch (error) {
      await trx.rollback()
      console.log(error)
      return ctx.response.badRequest({ message: 'Error creating class day config' })
    }
  }

  async updateTimeTableForDivisionForADay(ctx: HttpContext) {
    let { division_id, class_day_config_id, periods } = await UpdateValidatorForPeriodConfig.validate(ctx.request.all());

    // check if class_day_config_id is valid
    let class_day_config = await ClassDayConfig
      .query()
      .where('id', class_day_config_id)
      .first()

    if (!class_day_config) {
      return ctx.response.badRequest({ message: 'Class Day Config not found' })
    }

    // check school_timetable_config_id 
    let school_timetable_config = await SchoolTimeTableConfig
      .query()
      .where('id', class_day_config.school_timetable_config_id)
      .first()

    if (!school_timetable_config) {
      return ctx.response.badRequest({ message: 'School Time Table Config not found' })
    }

    // check if division_id is valid
    let division = await Divisions.query().where('id', division_id).first();
    if (!division) {
      return ctx.response.badRequest({ message: 'Division not found' })
    }

    if (division.class_id != class_day_config.class_id) {
      return ctx.response.badRequest({ message: 'Class id in class day config does not match with division class id' })
    }

    let trx = await db.transaction()
    let res: PeriodsConfig[] = []
    try {
      for (let i = 0; i < periods.length; i++) {
        let period = periods[i]
        let check_period_config = null
        if (period.id) {
          check_period_config = await PeriodsConfig
            .query()
            .where('id', period.id)
            .andWhere('division_id', division_id)
            .andWhere('class_day_config_id', class_day_config_id)
            .useTransaction(trx)
            .first()
        } else {
          // If no ID, we check if there is an existing period with this order that HAS NO batch name?
          // Actually, if we are adding a batch, it won't have an ID.
          // Let's just create a new one.
          check_period_config = null
        }

        if (!check_period_config) {
          check_period_config = new PeriodsConfig()
          check_period_config.division_id = division_id
          check_period_config.class_day_config_id = class_day_config_id
          check_period_config.period_order = period.period_order
        }

        let payload_to_update: any = {
          period_order: period.period_order
        }


        if (period.start_time) {
          payload_to_update.start_time = period.start_time
          payload_to_update.end_time = period.end_time
        }

        // Handle null values correctly
        if (period.subjects_division_masters_id !== undefined) payload_to_update.subjects_division_masters_id = period.subjects_division_masters_id
        if (period.staff_enrollment_id !== undefined) payload_to_update.staff_enrollment_id = period.staff_enrollment_id
        if (period.lab_id !== undefined) payload_to_update.lab_id = period.lab_id
        if (period.is_pt !== undefined) payload_to_update.is_pt = period.is_pt
        if (period.is_free_period !== undefined) payload_to_update.is_free_period = period.is_free_period
        if (period.batch_name !== undefined) payload_to_update.batch_name = period.batch_name
        
        if (period.is_break !== undefined) {
          payload_to_update.is_break = period.is_break
          if (period.is_break) {
            payload_to_update.subjects_division_masters_id = null
            payload_to_update.staff_enrollment_id = null
            payload_to_update.lab_id = null
            payload_to_update.is_pt = false
            payload_to_update.is_free_period = false
            payload_to_update.batch_name = null
          }
        }

        // Merge to check availability before saving
        const mergedPeriod = { ...check_period_config.toJSON(), ...payload_to_update } as TypeForPeriodsConfig;

        // Validation checks
        if (!mergedPeriod.is_break && !mergedPeriod.is_pt && !mergedPeriod.is_free_period) {
          if (mergedPeriod.staff_enrollment_id) {
            const teacher_available = await this.checkTeacherAvailability(mergedPeriod, class_day_config, school_timetable_config)
            if (!teacher_available.result) {
              await trx.rollback()
              return ctx.response.badRequest({ message: `Period ${i+1}: ${teacher_available.message}` })
            }
          }

          if (mergedPeriod.lab_id) {
            const lab_available = await this.checklabAvailability(mergedPeriod, class_day_config, school_timetable_config)
            if (!lab_available.result) {
              await trx.rollback()
              return ctx.response.badRequest({ message: `Period ${i+1}: ${lab_available.message}` })
            }
          }
        }

        check_period_config.merge(payload_to_update);
        await check_period_config.useTransaction(trx).save()
        res.push(check_period_config)
      }
      await trx.commit()
      console.log('Update successful')
      return ctx.response.status(200).json(res)
    } catch (error) {
      await trx.rollback()
      console.error('Update error:', error)
      return ctx.response.badRequest({ message: 'Error updating timetable: ' + (error.message || 'Unknown error') })
    }


  }


  async updateTimeTableForDivisionForWeek(ctx: HttpContext) {
    let { division_id, days } = await UpdateValidatorForPeriodConfigWeek.validate(ctx.request.all());

    // Basic division validation
    let division = await Divisions.query().where('id', division_id).first();
    if (!division) {
      return ctx.response.badRequest({ message: 'Division not found' })
    }

    let trx = await db.transaction()
    let res: PeriodsConfig[] = []
    
    try {
      for (const day of days) {
        const { class_day_config_id, periods } = day;
        
        let class_day_config = await ClassDayConfig
          .query()
          .where('id', class_day_config_id)
          .useTransaction(trx)
          .first()

        if (!class_day_config) {
          await trx.rollback();
          return ctx.response.badRequest({ message: `Class Day Config ${class_day_config_id} not found` })
        }
        
        let school_timetable_config = await SchoolTimeTableConfig
          .query()
          .where('id', class_day_config.school_timetable_config_id)
          .useTransaction(trx)
          .first()
          
        if (!school_timetable_config) {
          await trx.rollback();
          return ctx.response.badRequest({ message: 'School Time Table Config not found' })
        }

        const incomingPeriodIds = periods.map(p => p.id).filter((id): id is number => id !== undefined);
        if (incomingPeriodIds.length > 0) {
            await PeriodsConfig.query()
              .where('division_id', division_id)
              .andWhere('class_day_config_id', class_day_config_id)
              .whereNotIn('id', incomingPeriodIds)
              .useTransaction(trx)
              .delete();
        } else {
             await PeriodsConfig.query()
              .where('division_id', division_id)
              .andWhere('class_day_config_id', class_day_config_id)
              .useTransaction(trx)
              .delete();
        }

        for (let i = 0; i < periods.length; i++) {
          let period = periods[i]
          let check_period_config = null
          if (period.id) {
            check_period_config = await PeriodsConfig
              .query()
              .where('id', period.id)
              .andWhere('division_id', division_id)
              .andWhere('class_day_config_id', class_day_config_id)
              .useTransaction(trx)
              .first()
          } else {
            check_period_config = null
          }

          if (!check_period_config) {
            check_period_config = new PeriodsConfig()
            check_period_config.division_id = division_id
            check_period_config.class_day_config_id = class_day_config_id
            check_period_config.period_order = period.period_order
          }

          let payload_to_update: any = {
            period_order: period.period_order
          }

          if (period.start_time) {
            payload_to_update.start_time = period.start_time
            payload_to_update.end_time = period.end_time
          }

          if (period.subjects_division_masters_id !== undefined) payload_to_update.subjects_division_masters_id = period.subjects_division_masters_id
          if (period.staff_enrollment_id !== undefined) payload_to_update.staff_enrollment_id = period.staff_enrollment_id
          if (period.lab_id !== undefined) payload_to_update.lab_id = period.lab_id
          if (period.is_pt !== undefined) payload_to_update.is_pt = period.is_pt
          if (period.is_free_period !== undefined) payload_to_update.is_free_period = period.is_free_period
          if (period.batch_name !== undefined) payload_to_update.batch_name = period.batch_name
          
          if (period.is_break !== undefined) {
            payload_to_update.is_break = period.is_break
            if (period.is_break) {
              payload_to_update.subjects_division_masters_id = null
              payload_to_update.staff_enrollment_id = null
              payload_to_update.lab_id = null
              payload_to_update.is_pt = false
              payload_to_update.is_free_period = false
              payload_to_update.batch_name = null
            }
          }

          const mergedPeriod = { ...check_period_config.toJSON(), ...payload_to_update } as TypeForPeriodsConfig;

          if (!mergedPeriod.is_break && !mergedPeriod.is_pt && !mergedPeriod.is_free_period) {
            if (mergedPeriod.staff_enrollment_id) {
              const teacher_available = await this.checkTeacherAvailability(mergedPeriod, class_day_config, school_timetable_config)
              if (!teacher_available.result) {
                await trx.rollback()
                return ctx.response.badRequest({ message: `Day ${class_day_config.day} Period ${i+1}: ${teacher_available.message}` })
              }
            }

            if (mergedPeriod.lab_id) {
              const lab_available = await this.checklabAvailability(mergedPeriod, class_day_config, school_timetable_config)
              if (!lab_available.result) {
                await trx.rollback()
                return ctx.response.badRequest({ message: `Day ${class_day_config.day} Period ${i+1}: ${lab_available.message}` })
              }
            }
          }

          check_period_config.merge(payload_to_update);
          await check_period_config.useTransaction(trx).save()
          res.push(check_period_config)
        }
      }
      
      await trx.commit()
      return ctx.response.status(200).json(res)
    } catch (error) {
      await trx.rollback()
      console.error('Update week timetable error:', error)
      return ctx.response.badRequest({ message: 'Error updating week timetable: ' + (error.message || 'Unknown error') })
    }
  }


  async deleteTimeTableForDivision(ctx: HttpContext) {
    let division_id = ctx.params.division_id;
    let school_timetable_config_id = ctx.params.school_timetable_config_id;
    
    console.log(`Deleting timetable for Division ID: ${division_id}, Config ID: ${school_timetable_config_id}`);

    let division = await Divisions.query()
      .where('id', division_id)
      .first()

    if (!division) {
      console.log('Division not found during deletion');
      return ctx.response.badRequest({ message: 'Division not found' })
    }

    let clas = await Classes
    .query()
    .where('id', division.class_id)
    .andWhere('school_id', ctx.auth.user!.school_id as number)
    .first();

    if(!clas){
      console.log('Class not found for this division during deletion');
      return ctx.response.badRequest({ message: 'Class not found for this division' })
    }

    let class_day_configs = await ClassDayConfig
      .query()
      .where('class_id', division.class_id)
      .andWhere('school_timetable_config_id', school_timetable_config_id);

    console.log(`Found ${class_day_configs.length} class day configs to clear periods for`);

    let remove_periods = 0;
    if (class_day_configs.length > 0) {
      const result = await PeriodsConfig.query()
        .where('division_id', division_id)
        .whereIn('class_day_config_id', class_day_configs.map(c => c.id))
        .delete();
      remove_periods = Number(result[0] || result || 0);
    }

    console.log(`Removed ${remove_periods} periods`);

    return ctx.response.status(200).json({
      message: 'Time table for division deleted successfully',
      removed_periods: remove_periods
    })
  }

  async deleteAllPeriodsForClassDayConfig(ctx: HttpContext) {
    const { class_day_config_id } = ctx.params;
    
    const classDayConfig = await ClassDayConfig.query().where('id', class_day_config_id).first();
    if (!classDayConfig) {
      return ctx.response.notFound({ message: 'Class Day Config not found' });
    }

    // Security check: Ensure the config belongs to the user's school
    const schoolConfig = await SchoolTimeTableConfig.query()
      .where('id', classDayConfig.school_timetable_config_id)
      .first();
    
    if (!schoolConfig) {
       return ctx.response.notFound({ message: 'School Time Table Config not found' });
    }

    const removedCount = await PeriodsConfig.query()
      .where('class_day_config_id', class_day_config_id)
      .delete();

    return ctx.response.ok({
      message: 'All periods for this day have been deleted across all divisions',
      removed_count: removedCount
    });
  }

  async deleteClassDayConfig(ctx: HttpContext) {
    const id = ctx.params.id;
    const config = await ClassDayConfig.query()
      .where('id', id)
      .first();

    if (!config) {
      return ctx.response.notFound({ message: 'Configuration not found' });
    }

    // Delete associated periods first to be safe (though cascade should handle it if set up)
    await PeriodsConfig.query().where('class_day_config_id', id).delete();
    
    await config.delete();

    return ctx.response.status(200).json({
      message: 'Class day configuration deleted successfully'
    });
  }

  async checkAvailabilityForConfiguredPeriod(ctx: HttpContext) {
    /**
     * 
     * we need to check for , 
     * 1 . avability of teacher for perticular time  (Check),
     * 2 . Constant occurance of same subject in a week , and per day 
     * 3 . lab availability (Check)
     * 4 . if the period is free , validate , can not have more then 2 free periods in a day
     * 5 . if the period is break , validate , can not have more then 2 breaks in a day
     * 6 . if the period is pt , validate , can not have more then 2 pt in a day
     * 7.  validation for teacher , techer should not have more then 5 periods in a
     *  day , and should not hae more then 16 periods in a week
     *  
     * 
     *  */

    let payload = await ValidatorForCheckPeriodConfig.validate(ctx.request.all());

    // check if class_day_config_id is valid
    let class_day_config = await ClassDayConfig
      .query()
      .where('id', payload.class_day_config_id)
      .first()
    if (!class_day_config) {
      return ctx.response.badRequest({ message: 'Class Day Config not found' })
    }
    // check school_timetable_config_id
    let school_timetable_config = await SchoolTimeTableConfig
      .query()
      .where('id', class_day_config.school_timetable_config_id)
      .first()
    if (!school_timetable_config) {
      return ctx.response.badRequest({ message: 'School Time Table Config not found' })
    }

    // Now check if the teacher is available for this period
    let result = await this.checkTeacherAvailability(payload, class_day_config, school_timetable_config)
    if (result.result === false) {
      return ctx.response.badRequest({
        code: result.status,
        message: result.message
      })
    }
    // 2 . Constant occurance of same subject in a week , and per day

    // 3 . lab availability
    if (payload.lab_id) {
      let lab_result = await this.checklabAvailability(payload, class_day_config, school_timetable_config)
      if (lab_result.result === false) {
        return ctx.response.badRequest({
          code: lab_result.status,
          message: lab_result.message
        })
      }
    }

    return ctx.response.status(200).json({ message: 'Teacher is available for this period' })

  }

  /*
   * check whether the teacher is already assigned to another period in the same time slot.
     check total number of periods assigned to the teacher in a day and week. 
   * 
   */
  private async checkTeacherAvailability(
    period_config: TypeForPeriodsConfig,
    class_day_config: ClassDayConfig,
    school_timetable_config: SchoolTimeTableConfig,
    cachedSameDayConfigIds?: number[],
    cachedWeekConfigIds?: number[],
    cachedAllWeekPeriods?: PeriodsConfig[],
  ): Promise<{ result: boolean, status: string, message: string }> {
    if (period_config.staff_enrollment_id === null || period_config.staff_enrollment_id === undefined) {
      return {
        result: true,
        status: 'TEACHER_AVAILABLE',
        message: 'No teacher assigned to this period.'
      };
    }

    // Fetch all periods for this teacher on the same day

    let sameDayConfigIds = cachedSameDayConfigIds;
    if (!sameDayConfigIds) {
      let check_class_day_config = await ClassDayConfig.query()
        .where('id', period_config.class_day_config_id)
        .first();

      let fetch_day_config_for_same_day = await ClassDayConfig.query()
        .where('school_timetable_config_id', class_day_config.school_timetable_config_id)
        .andWhere('day', check_class_day_config!.day);
      
      sameDayConfigIds = fetch_day_config_for_same_day.map((c) => c.id);
    }

    const periods = cachedAllWeekPeriods
      ? cachedAllWeekPeriods.filter(p => 
          p.staff_enrollment_id === period_config.staff_enrollment_id &&
          sameDayConfigIds!.includes(p.class_day_config_id) &&
          p.start_time !== null &&
          p.end_time !== null &&
          (!period_config.id || p.id !== period_config.id)
        )
      : await PeriodsConfig.query()
          .where('staff_enrollment_id', period_config.staff_enrollment_id!)
          .whereIn('class_day_config_id', sameDayConfigIds)
          .whereNotNull('start_time')
          .whereNotNull('end_time')
          .if(period_config.id, (query) => query.whereNot('id', period_config.id!));

    // 1. Check for time overlap
    const newStart = this.timeToMinutes(period_config.start_time);
    const newEnd = this.timeToMinutes(period_config.end_time);
    for (const period of periods) {
      const existingStart = this.timeToMinutes(period.start_time);
      const existingEnd = this.timeToMinutes(period.end_time);
      
      if (newStart < existingEnd && newEnd > existingStart) {
        return {
          result: false,
          status: 'TEACHER_NOT_AVAILABLE',
          message: `Teacher is already assigned to another period (${period.start_time} - ${period.end_time}) at this time.`
        }
      }
    }

    // 2. Check for max periods per day
    const maxPerDay = school_timetable_config.teacher_max_periods_per_day || 5;
    if (periods.length >= maxPerDay) {
      return {
        result: false,
        status: 'PERIODS_LIMIT_FOR_TEACHER_EXCEEDED_FOR_DAY',
        message: `Teacher cannot have more than ${maxPerDay} periods in a day.`
      }
    }

    // 3. Check for max periods per week
    let weekConfigIds = cachedWeekConfigIds;
    if (!weekConfigIds) {
      const allClassDayConfigs = await ClassDayConfig.query()
        .where('school_timetable_config_id', class_day_config.school_timetable_config_id)
        .andWhere('class_id', class_day_config.class_id)
        .select('id');
      weekConfigIds = allClassDayConfigs.map(c => c.id);
    }

    const periodsForWeekCount = cachedAllWeekPeriods
      ? cachedAllWeekPeriods.filter(p =>
          p.staff_enrollment_id === period_config.staff_enrollment_id &&
          weekConfigIds!.includes(p.class_day_config_id)
        ).length
      : Number((await PeriodsConfig.query()
          .where('staff_enrollment_id', period_config.staff_enrollment_id!)
          .whereIn('class_day_config_id', weekConfigIds)
          .count('* as total'))[0].$extras.total);

    const maxPerWeek = school_timetable_config.teacher_max_periods_per_week || 16;
    if (periodsForWeekCount >= maxPerWeek) {
      return {
        result: false,
        status: 'PERIODS_LIMIT_FOR_TEACHER_EXCEEDED_FOR_WEEK',
        message: `Teacher cannot have more than ${maxPerWeek} periods in a week.`
      }
    }

    return {
      result: true,
      status: 'TEACHER_AVAILABLE',
      message: 'Teacher is available for this period.'
    };
  }

  private async checklabAvailability(
    period_config: TypeForPeriodsConfig,
    class_day_config: ClassDayConfig,
    school_timetable_config: SchoolTimeTableConfig,
    cachedSameDayConfigIds?: number[],
    cachedLabConfig?: LabConfig,
    cachedAllWeekPeriods?: PeriodsConfig[],
  ): Promise<{ result: boolean, status: string, message: string }> {

    let lab_config: LabConfig | null | undefined = cachedLabConfig;
    if (!lab_config) {
      lab_config = await LabConfig.query()
        .where('id', period_config.lab_id!)
        .andWhere('school_timetable_config_id', class_day_config.school_timetable_config_id)
        .first();
    }

    if (!lab_config) {
      return {
        result: false,
        status: 'LAB_NOT_AVAILABLE',
        message: 'Lab not found for this period.'
      }
    }

    let sameDayConfigIds = cachedSameDayConfigIds;
    if (!sameDayConfigIds) {
      let check_class_day_config = await ClassDayConfig.query()
        .where('id', period_config.class_day_config_id)
        .first();

      let fetch_day_config_for_same_day = await ClassDayConfig.query()
        .where('school_timetable_config_id', school_timetable_config.id)
        .andWhere('day', check_class_day_config!.day);
      
      sameDayConfigIds = fetch_day_config_for_same_day.map((c) => c.id);
    }

    const periods = cachedAllWeekPeriods
      ? cachedAllWeekPeriods.filter(p =>
          p.lab_id === period_config.lab_id &&
          sameDayConfigIds!.includes(p.class_day_config_id) &&
          p.start_time !== null &&
          p.end_time !== null &&
          (!period_config.id || p.id !== period_config.id)
        )
      : await PeriodsConfig.query()
          .where('lab_id', period_config.lab_id!)
          .whereIn('class_day_config_id', sameDayConfigIds)
          .whereNotNull('start_time')
          .whereNotNull('end_time')
          .if(period_config.id, (query) => query.whereNot('id', period_config.id!));

    // 1. Check for time overlap and capacity
    const newStart = this.timeToMinutes(period_config.start_time);
    const newEnd = this.timeToMinutes(period_config.end_time);

    let concurrent_usage = 0;
    for (const period of periods) {
      const existingStart = this.timeToMinutes(period.start_time);
      const existingEnd = this.timeToMinutes(period.end_time);
      if (newStart < existingEnd && newEnd > existingStart) {
        concurrent_usage += 1;
      }
    }

    if (lab_config.max_capacity !== null && (concurrent_usage + 1) > lab_config.max_capacity) {
      return {
        result: false,
        status: 'LAB_NOT_AVAILABLE',
        message: `Lab capacity exceeded. Max classes allowed: ${lab_config.max_capacity}. Currently in use by ${concurrent_usage} other classes.`
      }
    }

    if (lab_config.availability_per_day !== null && (periods.length + 1) > lab_config.availability_per_day) {
      return {
        result: false,
        status: 'LAB_NOT_AVAILABLE',
        message: `Lab daily availability exceeded. Max periods allowed per day: ${lab_config.availability_per_day}.`
      }
    }

    return {
      result: true,
      status: 'LAB_AVAILABLE',
      message: 'Lab is available for this period.'
    }

  }

  // Helper to convert HH:mm string to minutes
  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  /**
   * Auto-generate a weekly timetable for a class/division.
   * Returns periods config for each day, according to all configs and constraints.
   * Input: ctx, class_id, division_id, academic_session_id
   */
  async generateWeeklyTimeTableForClass(ctx: HttpContext) {
    const division_id = ctx.params.division_id;
    const academic_session_id = ctx.request.input('academic_session');
    const {
      free_periods_count = 2,
      include_pt_periods = false,
      selected_labs = [],
      subject_preferences = [],
      max_periods_per_day,
      default_period_duration,
      lab_enabled,
      pt_enabled,
      breaks = [] // Array of { period_order: number, duration: number }
    } = ctx.request.body();

    console.log("ctx.request.body()" ,ctx.request.body())

    // 1. Validate division, class, user
    const division = await Divisions.query().where('id', division_id).first();
    if (!division) {
      return ctx.response.badRequest({ message: 'Division not found' });
    }
    let clas = await Classes.query()
      .where('id', division.class_id)
      .andWhere('school_id', ctx.auth.user!.school_id as number)
      .first();

    if (!clas) {
      return ctx.response.badRequest({ message: 'Class not found for provided Division' });
    }

    if (division.class_id !== clas?.id) {
      return ctx.response.badRequest({ message: 'Division does not belong to class' });
    }

    // 2. Fetch configs
    const school_timetable_config = await SchoolTimeTableConfig.query()
      .preload('lab_config')
      .preload('class_day_config', (query) => {
        query.where('class_id', clas.id);
      })
      .where('academic_year', academic_session_id as number)
      .first();
    if (!school_timetable_config) {
      return ctx.response.badRequest({ message: 'School Time Table Config not found' });
    }
    const class_day_configs = school_timetable_config.class_day_config;
    if (!class_day_configs || class_day_configs.length === 0) {
      return ctx.response.badRequest({
        message: 'No day configuration found for this class. Please configure working days and periods first.'
      });
    }

    let lab_configs : LabConfig[] = school_timetable_config.lab_config;

    // Only use labs selected by user
    if (selected_labs && selected_labs.length > 0) {
      lab_configs = lab_configs.filter(lab => selected_labs.includes(lab.id));
    }

    // 2.1. Fetch subject-division mappings and staff assignments
    const subjectDivisionMasters = await SubjectDivisionMaster.query()
      .preload('subject_staff_divisioin_master')
      .preload('subject')
      .where('division_id', division_id)
      .andWhere('academic_year', academic_session_id as number)
      .andWhere('status', 'Active');

    if (!subjectDivisionMasters || subjectDivisionMasters.length === 0) {
      return ctx.response.badRequest({
        message: 'No active subjects are assigned to this division. Please assign subjects to the division first.'
      });
    }

    // Build a map: subjectDivisionId -> { subject, teachers: [staffEnrollmentId, ...] }
    const subjectTeacherMap: Record<number, { subject: any, teachers: (number | null)[] }> = {};
    for (const sdm of subjectDivisionMasters) {
      const activeTeachers = sdm.subject_staff_divisioin_master
        .filter((ssm) => ssm.status === 'Active')
        .map((ssm) => ssm.staff_enrollment_id);

      subjectTeacherMap[sdm.id] = {
        subject: sdm.subject,
        teachers: activeTeachers.length > 0 ? activeTeachers : [null],
      };
    }

    // Build subject preference map: subject_id -> { periods_per_week, priority }
    const subjectPrefMap: Record<number, { periods_per_week: number, priority: number }> = {};
    for (const pref of subject_preferences) {
      subjectPrefMap[pref.subject_id] = { periods_per_week: pref.periods_per_week, priority: pref.priority };
    }

    // Sort subjectDivisionIds by user priority (higher priority first)
    let subjectDivisionIds = Object.keys(subjectTeacherMap).map(Number);
    subjectDivisionIds.sort((a, b) => {
      const aPriority = subjectPrefMap[subjectTeacherMap[a].subject.id]?.priority ?? 0;
      const bPriority = subjectPrefMap[subjectTeacherMap[b].subject.id]?.priority ?? 0;
      return bPriority - aPriority;
    });

    // Track subject assignment count for the whole week
    let subjectWeekCount: Record<number, number> = {};
    subjectDivisionIds.forEach(id => subjectWeekCount[id] = 0);

    // Pre-cache ClassDayConfigs for the week and day-level mapping to optimize query performance (3x query reduction)
    const allClassDayConfigs = await ClassDayConfig.query()
      .where('school_timetable_config_id', school_timetable_config.id)
      .andWhere('class_id', clas.id)
      .select('id');
    const cachedWeekConfigIds = allClassDayConfigs.map(c => c.id);

    const schoolClassDayConfigs = await ClassDayConfig.query()
      .where('school_timetable_config_id', school_timetable_config.id);

    const sameDayConfigIdsMap: Record<string, number[]> = {};
    for (const c of schoolClassDayConfigs) {
      if (!sameDayConfigIdsMap[c.day]) {
        sameDayConfigIdsMap[c.day] = [];
      }
      sameDayConfigIdsMap[c.day].push(c.id);
    }

    const sameDayConfigIdsAllDays = Array.from(new Set(Object.values(sameDayConfigIdsMap).flat()));
    const cachedAllWeekPeriods = await PeriodsConfig.query()
      .whereIn('class_day_config_id', sameDayConfigIdsAllDays);

    // 3. For each day, generate periods
    let week_timetable: Array<{ class_day_config_id: number, periods: TypeForPeriodsConfig[] }> = [];
    let totalFreePeriods = 0;
    let labDays: number[] = [];
    let ptPeriodsAssigned = 0;

    for (const dayConfig of class_day_configs) {
      let periods: TypeForPeriodsConfig[] = [];
      // let allowedDurations = Array.isArray(dayConfig.allowed_durations)
      //   ? dayConfig.allowed_durations
      //   : JSON.parse(dayConfig.allowed_durations || '[]');
      let numPeriods = max_periods_per_day || school_timetable_config.max_periods_per_day;
      let startTime = dayConfig.day_start_time || '08:00';
      let endTime = dayConfig.day_end_time || '16:00';
      let startMins = this.timeToMinutes(startTime);
      let endMins = this.timeToMinutes(endTime);
      let totalDayMins = endMins - startMins;
      if (totalDayMins <= 0) {
        totalDayMins += 24 * 60;
      }

      let totalBreakDuration = breaks.reduce((sum: number, b: any) => sum + (b.duration || 15), 0);
      let remainingMins = totalDayMins - totalBreakDuration;
      let periodDuration = default_period_duration || school_timetable_config.default_period_duration;
      let remainder = 0;
      if (remainingMins > 0 && numPeriods > 0) {
        let calculatedDuration = Math.floor(remainingMins / numPeriods);
        // Ensure the calculated duration is reasonable (at least 15 minutes)
        if (calculatedDuration >= 15) {
          periodDuration = calculatedDuration;
          remainder = remainingMins % numPeriods;
        }
      }

      let currentTime = startTime;
      // let usedSubjects: Record<number, number> = {};
      let usedPeriods: Record<number, number> = {}; // subjectDivisionId -> count per day
      let consecutiveSubject: { id: number | null, count: number } = { id: null, count: 0 };
      let teacherPeriodsCount: Record<number, number> = {}; // staff_id -> count per day

      // Decide if this day will have a lab block (2 consecutive periods)
      let assignLabToday = false;
      if (
        lab_enabled &&
        lab_configs.length > 0 &&
        labDays.length < 3 &&
        (labDays.length < 2 || Math.random() < 0.5)
      ) {
        assignLabToday = true;
        labDays.push(dayConfig.id);
      }

      let i = 0;
      let period_order = 1;
      while (i < numPeriods) {
        let assigned = false;
        let attempt = 0;

        // BREAK INJECTION CHECK
        let breakAtThisSlot = breaks.find((b: any) => b.period_order === period_order);
        if (breakAtThisSlot) {
          let periodStart = currentTime;
          let breakDuration = breakAtThisSlot.duration || 15;
          let periodEndMinutes = this.timeToMinutes(periodStart) + breakDuration;
          let periodEnd = `${String(Math.floor(periodEndMinutes / 60)).padStart(2, '0')}:${String(periodEndMinutes % 60).padStart(2, '0')}`;
          
          periods.push({
            class_day_config_id: dayConfig.id,
            division_id: division_id,
            period_order: period_order,
            start_time: periodStart,
            end_time: periodEnd,
            is_break: true,
            subjects_division_masters_id: null,
            staff_enrollment_id: null,
            lab_id: null,
            is_pt: false,
            is_free_period: false,
          });
          
          currentTime = periodEnd;
          period_order++;
          continue;
        }

        // PT Period
        if (pt_enabled && include_pt_periods && ptPeriodsAssigned < 2 && Math.random() < 0.15) {
          let periodStart = currentTime;
          let currentPeriodDuration = periodDuration;
          if (remainder > 0) {
            currentPeriodDuration += 1;
            remainder--;
          }
          let periodEndMinutes = this.timeToMinutes(periodStart) + currentPeriodDuration;
          let periodEnd = `${String(Math.floor(periodEndMinutes / 60)).padStart(2, '0')}:${String(periodEndMinutes % 60).padStart(2, '0')}`;
          periods.push({
            class_day_config_id: dayConfig.id,
            division_id: division_id,
            period_order: period_order,
            start_time: periodStart,
            end_time: periodEnd,
            is_break: false,
            subjects_division_masters_id: null,
            staff_enrollment_id: null,
            lab_id: null,
            is_pt: true,
            is_free_period: false,
          });
          currentTime = periodEnd;
          ptPeriodsAssigned++;
          period_order++;
          i++;
          continue;
        }

        // LAB BLOCK: assign 2 consecutive periods if needed
        let labSubjectDivisionIds = subjectDivisionIds;
        if (assignLabToday && i <= numPeriods - 2 && labSubjectDivisionIds.length > 0) {
          let lab = lab_configs[Math.floor(Math.random() * lab_configs.length)];
          let randomSubjectDivisionId = labSubjectDivisionIds[Math.floor(Math.random() * labSubjectDivisionIds.length)];
          let subjectEntry = subjectTeacherMap[randomSubjectDivisionId];
          if (subjectEntry && subjectEntry.teachers && subjectEntry.teachers.length > 0) {
            let teacherList = subjectEntry.teachers;
            let randomTeacherId = teacherList[0];
            let periodStart = currentTime;
            let currentPeriodDuration = periodDuration;
            if (remainder > 0) {
              currentPeriodDuration += 1;
              remainder--;
            }
            let periodEndMinutes = this.timeToMinutes(periodStart) + currentPeriodDuration;
            let periodEnd = `${String(Math.floor(periodEndMinutes / 60)).padStart(2, '0')}:${String(periodEndMinutes % 60).padStart(2, '0')}`;
            let periodConfig: TypeForPeriodsConfig = {
              class_day_config_id: dayConfig.id,
              division_id: division_id,
              period_order: period_order,
              start_time: periodStart,
              end_time: periodEnd,
              is_break: false,
              subjects_division_masters_id: randomSubjectDivisionId,
              staff_enrollment_id: randomTeacherId,
              lab_id: lab.id,
              is_pt: false,
              is_free_period: false,
            };
            let teacherAvailable = await this.checkTeacherAvailability(
              periodConfig,
              dayConfig,
              school_timetable_config,
              sameDayConfigIdsMap[dayConfig.day] || [],
              cachedWeekConfigIds,
              cachedAllWeekPeriods
            );
            let labAvailable = await this.checklabAvailability(
              periodConfig,
              dayConfig,
              school_timetable_config,
              sameDayConfigIdsMap[dayConfig.day] || [],
              lab,
              cachedAllWeekPeriods
            );
            if (
              teacherAvailable.result &&
              labAvailable.result &&
              (usedPeriods[randomSubjectDivisionId] || 0) < 4 &&
              (randomTeacherId === null || (teacherPeriodsCount[randomTeacherId] || 0) < 6)
            ) {
              // Assign two consecutive lab periods
              periods.push(periodConfig);
              // Second period
              let nextPeriodStart = periodEnd;
              let currentPeriodDuration2 = periodDuration;
              if (remainder > 0) {
                currentPeriodDuration2 += 1;
                remainder--;
              }
              let nextPeriodEndMinutes = this.timeToMinutes(nextPeriodStart) + currentPeriodDuration2;
              let nextPeriodEnd = `${String(Math.floor(nextPeriodEndMinutes / 60)).padStart(2, '0')}:${String(nextPeriodEndMinutes % 60).padStart(2, '0')}`;
              let periodConfig2: TypeForPeriodsConfig = {
                ...periodConfig,
                period_order: period_order + 1,
                start_time: nextPeriodStart,
                end_time: nextPeriodEnd,
              };
              periods.push(periodConfig2);
              currentTime = nextPeriodEnd;
              usedPeriods[randomSubjectDivisionId] = (usedPeriods[randomSubjectDivisionId] || 0) + 2;
              if (randomTeacherId !== null) {
                teacherPeriodsCount[randomTeacherId] = (teacherPeriodsCount[randomTeacherId] || 0) + 2;
              }
              consecutiveSubject = {
                id: randomSubjectDivisionId,
                count: 2,
              };
              period_order += 2;
              i += 2;
              continue;
            }
          }
          // If lab assignment fails, fallback to normal assignment below
        }

        // NORMAL PERIOD ASSIGNMENT
        while (!assigned && attempt < 3 && subjectDivisionIds.length > 0) {
          let randomSubjectDivisionId = subjectDivisionIds[Math.floor(Math.random() * subjectDivisionIds.length)];
          let subjectEntry = subjectTeacherMap[randomSubjectDivisionId];
          
          if (subjectEntry && subjectEntry.teachers && subjectEntry.teachers.length > 0) {
            let teacherList = subjectEntry.teachers;
            let randomTeacherId = teacherList[0];
            let periodStart = currentTime;
            let currentPeriodDuration = periodDuration;
            if (remainder > 0) {
              currentPeriodDuration += 1;
              remainder--;
            }
            let periodEndMinutes = this.timeToMinutes(periodStart) + currentPeriodDuration;
            let periodEnd = `${String(Math.floor(periodEndMinutes / 60)).padStart(2, '0')}:${String(periodEndMinutes % 60).padStart(2, '0')}`;
            let periodConfig: TypeForPeriodsConfig = {
              class_day_config_id: dayConfig.id,
              division_id: division_id,
              period_order: period_order,
              start_time: periodStart,
              end_time: periodEnd,
              is_break: false,
              subjects_division_masters_id: randomSubjectDivisionId,
              staff_enrollment_id: randomTeacherId,
              lab_id: null,
              is_pt: false,
              is_free_period: false,
            };
            let teacherAvailable = await this.checkTeacherAvailability(
              periodConfig,
              dayConfig,
              school_timetable_config,
              sameDayConfigIdsMap[dayConfig.day] || [],
              cachedWeekConfigIds,
              cachedAllWeekPeriods
            );
            // When assigning a subject, add this check:
            if (
              subjectPrefMap[subjectEntry.subject.id]?.periods_per_week !== undefined &&
              subjectWeekCount[randomSubjectDivisionId] >= subjectPrefMap[subjectEntry.subject.id].periods_per_week
            ) {
              attempt++;
              continue;
            }
            if (teacherAvailable.result) {
              assigned = true;
              periods.push(periodConfig);
              currentTime = periodEnd;
              usedPeriods[randomSubjectDivisionId] = (usedPeriods[randomSubjectDivisionId] || 0) + 1;
              if (randomTeacherId !== null) {
                teacherPeriodsCount[randomTeacherId] = (teacherPeriodsCount[randomTeacherId] || 0) + 1;
              }
              subjectWeekCount[randomSubjectDivisionId] = (subjectWeekCount[randomSubjectDivisionId] || 0) + 1;
              if (consecutiveSubject.id === randomSubjectDivisionId) {
                consecutiveSubject.count += 1;
              } else {
                consecutiveSubject = { id: randomSubjectDivisionId, count: 1 };
              }
              period_order++;
              i++;
            } else {
              attempt++;
            }
          } else {
            attempt++;
          }
        }
        if (!assigned) {
          // Only up to free_periods_count free periods allowed for the week
          if (totalFreePeriods < free_periods_count) {
            let periodStart = currentTime;
            let currentPeriodDuration = periodDuration;
            if (remainder > 0) {
              currentPeriodDuration += 1;
              remainder--;
            }
            let periodEndMinutes = this.timeToMinutes(periodStart) + currentPeriodDuration;
            let periodEnd = `${String(Math.floor(periodEndMinutes / 60)).padStart(2, '0')}:${String(periodEndMinutes % 60).padStart(2, '0')}`;
            periods.push({
              class_day_config_id: dayConfig.id,
              division_id: division_id,
              period_order: period_order,
              start_time: periodStart,
              end_time: periodEnd,
              is_break: false,
              subjects_division_masters_id: null,
              staff_enrollment_id: null,
              lab_id: null,
              is_pt: false,
              is_free_period: true,
            });
            currentTime = periodEnd;
            totalFreePeriods++;
            consecutiveSubject = { id: null, count: 0 };
            period_order++;
            i++;
          } else {
            // If free period limit reached, assign a random valid subject/teacher ignoring constraints
            let randomSubjectDivisionId = subjectDivisionIds[Math.floor(Math.random() * subjectDivisionIds.length)];
            let subjectEntry = subjectTeacherMap[randomSubjectDivisionId];
            let teacherList = subjectEntry.teachers;
            let randomTeacherId = teacherList[0];
            let periodStart = currentTime;
            let currentPeriodDuration = periodDuration;
            if (remainder > 0) {
              currentPeriodDuration += 1;
              remainder--;
            }
            let periodEndMinutes = this.timeToMinutes(periodStart) + currentPeriodDuration;
            let periodEnd = `${String(Math.floor(periodEndMinutes / 60)).padStart(2, '0')}:${String(periodEndMinutes % 60).padStart(2, '0')}`;
            periods.push({
              class_day_config_id: dayConfig.id,
              division_id: division_id,
              period_order: period_order,
              start_time: periodStart,
              end_time: periodEnd,
              is_break: false,
              subjects_division_masters_id: randomSubjectDivisionId,
              staff_enrollment_id: randomTeacherId,
              lab_id: null,
              is_pt: false,
              is_free_period: false,
            });
            currentTime = periodEnd;
            consecutiveSubject = { id: randomSubjectDivisionId, count: 1 };
            period_order++;
            i++;
          }
        }
      }
      week_timetable.push({ class_day_config_id: dayConfig.id, periods });
    }
    return ctx.response.status(200).json({
      message: 'Weekly timetable generated successfully',
      timetable: week_timetable
    });
  }

  async exportTimeTablePDF(ctx: HttpContext) {
    const { response } = ctx
    const { division_id } = ctx.params
    let academic_session_id = ctx.request.input('academic_session') || ctx.request.input('academic_session_id')

    if (!ctx.auth.user?.school_id) {
      return ctx.response.badRequest({ message: 'School reference missing' })
    }

    const schoolId = ctx.auth.user.school_id

    // If academic_session_id is not provided, return error
    if (!academic_session_id) {
      return ctx.response.badRequest({ message: 'academic_session is required' })
    }

    // Load division
    const division = await db.from('divisions').where('id', division_id).first()
    if (!division) {
      return ctx.response.notFound({ message: 'Division not found' })
    }

    // Load class
    const classRow = await db.from('classes').where('id', division.class_id).first()
    if (!classRow) {
      return ctx.response.notFound({ message: 'Class not found' })
    }


    // Load School Details
    const school = await db.from('schools').where('id', schoolId).first()

    // Load logo image similar to lesson plan export
    let logoImage: string | null = null
    try {
      const logoPath = path.resolve(process.cwd(), 'resources/logo.jpg')
      if (fs.existsSync(logoPath)) {
        const logoData = fs.readFileSync(logoPath)
        logoImage = `data:image/jpeg;base64,${logoData.toString('base64')}`
      }
    } catch (err) {
      console.error('Error loading logo:', err)
    }

    // Load timetable config with class day and period configs preloaded
    const school_timetable_config = await SchoolTimeTableConfig
      .query()
      .where('academic_year', Number(academic_session_id))
      .preload('lab_config')
      .preload('class_day_config', (class_query) => {
        class_query.preload('period_config', (query) => {
          query.where('division_id', division_id)
            .preload('period_config_subject', (sq) => sq.preload('subject'))
            .preload('period_config_class_day', (cq) => cq.preload('class'))
            .preload('staff_enrollment', (seq) => seq.preload('staff'))
        })
        class_query.where('class_id', division.class_id)
      })
      .first()

    if (!school_timetable_config) {
      return ctx.response.notFound({ message: 'No timetable configuration found for this class and division.' })
    }

    const hasPeriodConfig = school_timetable_config.class_day_config?.some(
      (dayConfig) => dayConfig.period_config && dayConfig.period_config.length > 0
    )
    if (!hasPeriodConfig) {
      return ctx.response.notFound({ message: 'No timetable configuration found for this class and division.' })
    }

    // Sort days chronologically
    const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    const dayConfigs = school_timetable_config.class_day_config.slice().sort((a, b) => {
      return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
    })

    const dayMap: Record<string, string> = {
      mon: 'Monday',
      tue: 'Tuesday',
      wed: 'Wednesday',
      thu: 'Thursday',
      fri: 'Friday',
      sat: 'Saturday',
      sun: 'Sunday'
    }

    // Calculate max periods in a day
    let maxPeriods = 0
    dayConfigs.forEach((dayConfig) => {
      if (dayConfig.period_config) {
        maxPeriods = Math.max(maxPeriods, dayConfig.period_config.length)
      }
    })

    // Construct headers
    const gridHeader = [
      { text: 'Day', style: 'tableHeader', alignment: 'center' }
    ]
    for (let i = 1; i <= maxPeriods; i++) {
      gridHeader.push({ text: `Period ${i}`, style: 'tableHeader', alignment: 'center' })
    }

    const gridBody: any[] = [gridHeader]
    dayConfigs.forEach((dayConfig) => {
      const dayLabel = dayMap[dayConfig.day] || dayConfig.day.toUpperCase()
      const row: any[] = [
        { text: dayLabel, style: 'dayHeader', alignment: 'center', bold: true }
      ]

      const periods = dayConfig.period_config.slice().sort((a, b) => a.period_order - b.period_order)

      for (let i = 1; i <= maxPeriods; i++) {
        const period = periods.find(p => p.period_order === i)
        if (!period) {
          row.push({ text: '-', alignment: 'center', fontSize: 8, margin: [0, 10, 0, 10] })
          continue
        }

        const timeStr = `${period.start_time} - ${period.end_time}`
        let cellContent: any[] = [
          { text: timeStr, fontSize: 7, color: '#475569', alignment: 'center', margin: [0, 0, 0, 4] }
        ]

        if (period.is_break) {
          cellContent.push({ text: 'BREAK', style: 'breakText', alignment: 'center', bold: true })
        } else if (period.is_pt) {
          cellContent.push({ text: 'PT', style: 'ptText', alignment: 'center', bold: true })
        } else if (period.is_free_period) {
          cellContent.push({ text: 'FREE', style: 'freeText', alignment: 'center', bold: true })
        } else {
          const subject = period.period_config_subject?.subject
          const subjectName = subject ? subject.name : 'Unknown'
          const subjectCode = period.period_config_subject?.code_for_division || subject?.code || ''
          const subjectDisplay = subjectCode ? `${subjectName}\n(${subjectCode})` : subjectName

          cellContent.push({ text: subjectDisplay, style: 'subjectText', alignment: 'center', bold: true })

          const staff = period.staff_enrollment?.staff
          if (staff) {
            const teacherName = `${staff.first_name || ''} ${staff.last_name ? staff.last_name.charAt(0).toUpperCase() + '.' : ''}`.trim()
            cellContent.push({ text: teacherName, style: 'teacherText', alignment: 'center', margin: [0, 2, 0, 0] })
          }

          if (period.lab_id) {
            const lab = school_timetable_config.lab_config?.find(l => l.id === period.lab_id)
            if (lab) {
              cellContent.push({ text: `Lab: ${lab.name}`, style: 'labText', alignment: 'center', margin: [0, 2, 0, 0] })
            }
          }
        }

        // Determine background colors to fit premium design
        let fillColor = '#f8fafc'
        if (period.is_break) fillColor = '#fef3c7'
        else if (period.is_pt) fillColor = '#f3e8ff'
        else if (period.is_free_period) fillColor = '#f1f5f9'
        else if (period.lab_id) fillColor = '#dbeafe'
        else fillColor = '#dcfce7'

        row.push({
          stack: cellContent,
          fillColor,
          margin: [2, 6, 2, 6]
        })
      }
      gridBody.push(row)
    })

    const schoolName = school?.name || 'C. N. Kothari Homoeopathic Medical College & Research Centre - VYARA'

    // Separate by ampersand if default logo text to match the LP styling
    let schoolTitleContent: any[] = []
    if (schoolName.includes('&')) {
      const parts = schoolName.split('&')
      schoolTitleContent.push({ text: parts[0].trim(), style: 'collegeTitle', alignment: 'center' })
      schoolTitleContent.push({ text: '&', style: 'collegeAmpersand', alignment: 'center' })
      schoolTitleContent.push({ text: parts[1].trim(), style: 'collegeTitle', alignment: 'center' })
    } else if (schoolName === 'C. N. Kothari Homoeopathic Medical College & Research Centre - VYARA') {
      schoolTitleContent.push({ text: 'C. N. Kothari Homoeopathic Medical College', style: 'collegeTitle', alignment: 'center' })
      schoolTitleContent.push({ text: '&', style: 'collegeAmpersand', alignment: 'center' })
      schoolTitleContent.push({ text: 'Research Centre - VYARA', style: 'collegeTitle', alignment: 'center' })
    } else {
      schoolTitleContent.push({ text: schoolName, style: 'collegeTitle', alignment: 'center' })
    }

    const docDefinition: any = {
      pageOrientation: 'landscape',
      pageMargins: [30, 30, 30, 30],
      content: [
        // 1. Header: logo + college name
        {
          columns: [
            {
              width: 70,
              stack: [logoImage ? { image: logoImage, width: 60, height: 60, alignment: 'center' } : {
                canvas: [
                  { type: 'circle', x: 35, y: 30, r: 28, lineWidth: 1.5, lineColor: '#1e293b' },
                  { type: 'circle', x: 35, y: 30, r: 24, lineWidth: 0.8, lineColor: '#1e293b' },
                  { type: 'line', x1: 35, y1: 16, x2: 35, y2: 44, lineWidth: 2, lineColor: '#1e293b' },
                  { type: 'line', x1: 21, y1: 30, x2: 49, y2: 30, lineWidth: 2, lineColor: '#1e293b' }
                ],
                width: 70,
                height: 62
              }]
            },
            {
              width: '*',
              stack: schoolTitleContent,
              margin: [-30, 10, 0, 0]
            }
          ],
          margin: [0, 0, 0, 4]
        },
        // Divider
        {
          canvas: [
            { type: 'rect', x: 0, y: 0, w: 781, h: 1.5, color: '#1e293b' },
            { type: 'rect', x: 0, y: 4, w: 781, h: 0.5, color: '#1e293b' }
          ],
          margin: [0, 4, 0, 8]
        },
        // 2. Class details section
        {
          table: {
            widths: ['100%'],
            body: [[{
              stack: [
                { text: 'WEEKLY CLASS TIMETABLE', style: 'detailsSubject', alignment: 'center' },
                {
                  text: [
                    { text: 'Class: ', bold: true },
                    { text: `Class ${classRow?.class || ''}` },
                    { text: '   |   ', color: '#cbd5e1' },
                    { text: 'Division: ', bold: true },
                    { text: `${division?.division || ''} ${division?.aliases ? `(${division.aliases})` : ''}` },
                    { text: '   |   ', color: '#cbd5e1' },
                    { text: 'Academic Year: ', bold: true },
                    { text: `${academic_session_id || ''}` }
                  ],
                  alignment: 'center', margin: [0, 2, 0, 2], fontSize: 9
                }
              ],
              margin: [8, 4, 8, 4]
            }]]
          },
          layout: {
            hLineWidth: () => 1, vLineWidth: () => 1,
            hLineColor: () => '#94a3b8', vLineColor: () => '#94a3b8'
          },
          margin: [0, 0, 0, 10]
        },
        // 3. Grid table
        {
          table: {
            headerRows: 1,
            widths: ['8%', ...Array(maxPeriods).fill('*')],
            body: gridBody
          },
          layout: {
            hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
            vLineWidth: (i: number, node: any) => (i === 0 || i === node.table.widths.length) ? 1 : 0.5,
            hLineColor: () => '#475569',
            vLineColor: () => '#475569',
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 4,
            paddingBottom: () => 4
          },
          margin: [0, 0, 0, 8]
        }
      ],
      styles: {
        collegeTitle:    { fontSize: 13, bold: true, color: '#1e293b' },
        collegeAmpersand:{ fontSize: 11, bold: true, color: '#1e293b' },
        detailsSubject:  { fontSize: 11, bold: true, color: '#1e293b' },
        tableHeader:     { bold: true, fontSize: 8, color: '#0f172a', fillColor: '#f1f5f9' },
        dayHeader:       { fontSize: 8, color: '#1e293b' },
        breakText:       { fontSize: 8, color: '#b45309' },
        ptText:          { fontSize: 8, color: '#6b21a8' },
        freeText:        { fontSize: 8, color: '#475569' },
        subjectText:     { fontSize: 8, color: '#0f172a' },
        teacherText:     { fontSize: 7, color: '#334155' },
        labText:         { fontSize: 7, color: '#1e3a8a' }
      },
      defaultStyle: { font: 'Roboto', fontSize: 8 }
    }

    const printer = new PdfPrinter(fonts, fs as any, { resolve: () => { }, resolved: () => Promise.resolve() })
    const pdfDoc = await (printer as any).createPdfKitDocument(docDefinition)
    pdfDoc.end()

    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', `attachment; filename="Timetable-Class_${classRow?.class || ''}-${division?.division || ''}.pdf"`)
    return response.stream(pdfDoc)
  }
}


