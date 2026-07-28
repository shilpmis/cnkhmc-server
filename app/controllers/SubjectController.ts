import Divisions from '#models/Divisions';
import StaffEnrollment from '#models/StaffEnrollment';
import SubjectDivisionMaster from '#models/SubjectDivisionMaster';
import SubjectDivisionStaffMaster from '#models/SubjectDivisionStaffMaster';
import Subjects from '#models/Subjects';
import { CreateValidatorForAssignSubject, CreateValidatorForAssignSubjectToStaff, CreateValidatorForSubject } from '#validators/Subject'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db';


export default class SubjectController {

  async indexSubjects(ctx: HttpContext) {
    try {
      let subjects = await Subjects.query().orderBy('id', 'desc')
      return ctx.response.status(200).json(subjects)
    } catch (error: any) {
      console.error('Error in indexSubjects:', error)
      return ctx.response.status(500).json({ message: 'Failed to fetch subjects', error: error?.message })
    }
  }

  async indexSubjectsForDivision(ctx: HttpContext) {
    let acadaemic_seesion_id = ctx.request.input('academic_session');
    let division_id = ctx.params.division_id;
//     let acadaemic_seesion = await AcademicSession
//       .query()
//       .where('id', acadaemic_seesion_id)
//       .andWhere('school_id', ctx.auth.user!.school_id as number)
//       .first();
    // Academic session check removed
    let division = await Divisions
      .query()
      .where('id', division_id)
      // .andWhere('academic_year', acadaemic_seesion_id)
      .first();
    if (!division) {
      return ctx.response.status(404).json({
        message: 'Division not found',
      });
    }
    let subjects = await SubjectDivisionMaster
      .query()
      .preload('subject_staff_divisioin_master', (staffQuery) => {
        staffQuery.preload('staff_enrollment', (staffQuery) => {
          staffQuery.preload('staff', (staffQuery) => {
            staffQuery.select('id', 'first_name', 'last_name', 'email', 'employee_code')
          })
        })
      })
      .preload('subject')
      .where('academic_year', acadaemic_seesion_id)
      .andWhere('division_id', division_id)
      .orderBy('id', 'desc');

    return ctx.response.status(200).json(subjects);
  }

  async createSubject(ctx: HttpContext) {

    let payload = await CreateValidatorForSubject.validate(ctx.request.body());

    // validate the payload

//     let acadaemic_seesion = await AcademicSession
//       .query()
//       .where('id', payload.academic_year as number)
//       .andWhere('school_id', ctx.auth.user!.school_id as number)
//       .first();

    // Academic session check removed

    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const academicYear = payload.academic_year || payload.academic_session_id || 0;

    let subject = await Subjects.create({ 
      name: payload.name,
      description: payload.description || null,
      academic_year: academicYear,
      year: payload.year || null,
      code: `SUB${randomDigits}` 
    });

    return ctx.response.status(201).json(subject);
  }

  async assignSubjectToDivision(ctx: HttpContext) {
    let payload = await CreateValidatorForAssignSubject.validate(ctx.request.body());
    
    const academicYear = payload.academic_year || payload.academic_session_id || 0;

//     let acadaemic_seesion = await AcademicSession
//       .query()
//       .where('id', academicYear)
//       .andWhere('school_id', ctx.auth.user!.school_id as number)
//       .first();

    // Academic session check removed

    let division = await Divisions
      .query()
      .where('id', payload.division_id)
      // .andWhere('academic_year', academicYear)
      .first();

    if (!division) {
      return ctx.response.status(404).json({
        message: 'Division not found',
      });
    }

    let res: SubjectDivisionMaster[] = [];

    for (const subject of payload.subjects) {
      let validate_sub = await Subjects
        .query()
        .where('id', subject.subject_id)
        .first();

      if (!validate_sub) {
        return ctx.response.status(404).json({
          message: 'Subject not found',
        });
      }

      let assign_subject = await SubjectDivisionMaster.create({
        subject_id: subject.subject_id,
        division_id: payload.division_id,
        description: subject.description,
        code_for_division: subject.code_for_division,
        academic_year: academicYear,
        status: 'Active',
      });
      res.push(assign_subject);
    }
    return ctx.response.status(201).json(res);
  }

  async assignStaffToSubject(ctx: HttpContext) {

    let { staff_enrollment_ids, ...payload } = await CreateValidatorForAssignSubjectToStaff.validate(ctx.request.body());

    let subj_validation = await SubjectDivisionMaster.query()
      .where('id', payload.subjects_division_id)
      .andWhere('status', 'Active')
      .first();

    if (!subj_validation) {
      return ctx.response.status(404).json({
        message: 'Subject not found',
      })
    }

    let res: SubjectDivisionStaffMaster[] = []
    let trx = await db.transaction()
    try {
      for (const staff_enrollment_id of staff_enrollment_ids) {
        let staff_enrollment = await StaffEnrollment.query()
          .where('id', staff_enrollment_id)
          .first();

        if (!staff_enrollment) {
          return ctx.response.status(404).json({
            message: 'Staff not found',
          })
        }

        let assign_subj_to_staff = await SubjectDivisionStaffMaster.create({
          staff_enrollment_id: staff_enrollment_id,
          subjects_division_id: payload.subjects_division_id,
          notes: payload.notes ?? null,
          status: "Active"
        }, { client: trx })

        res.push(assign_subj_to_staff)
      }
      await trx.commit()
      return ctx.response.status(201).json(res);
    } catch (error) {
      await trx.rollback()
      console.log(error);
      return ctx.response.status(500).json({
        message: 'Internal server error',
        error: error,
      })
    }
  }

  async unassignStaffFromSubject(ctx: HttpContext) {
    const id = Number(ctx.params.id);
    
    try {
      const assignedStaff = await SubjectDivisionStaffMaster.find(id);
      
      if (!assignedStaff) {
        return ctx.response.status(404).json({
          message: 'Staff assignment not found',
        });
      }
      
      await assignedStaff.delete();
      
      return ctx.response.status(200).json({
        message: 'Staff successfully unassigned from subject',
      });
    } catch (error) {
      console.error("Error unassigning staff:", error);
      return ctx.response.status(500).json({
        message: 'Internal server error',
        error: error,
      });
    }
  }

  async updateSubject(ctx: HttpContext) {
    const subjectId = Number(ctx.params.subject_id);
    let payload = await CreateValidatorForSubject.validate(ctx.request.body());

//     let acadaemic_seesion = await AcademicSession
//       .query()
//       .where('id', payload.academic_year as number)
//       .andWhere('school_id', ctx.auth.user!.school_id as number)
//       .first();

    // Academic session check removed

    let subject = await Subjects.query()
      .where('id', subjectId)
      .andWhere('academic_year', payload.academic_year as number)
      .first();

    if (!subject) {
      return ctx.response.status(404).json({
        message: 'Subject not found',
      });
    }

    subject.merge(payload);
    await subject.save();

    return ctx.response.status(200).json(subject);
  }

  async destroySubject(ctx: HttpContext) {
    const subjectId = Number(ctx.params.subject_id);

    const isAssigned = await SubjectDivisionMaster.query()
      .where('subject_id', subjectId)
      .first();

    if (isAssigned) {
      return ctx.response.status(400).json({
        message: 'Subject is assigned to a division and cannot be deleted',
      });
    }

    const subject = await Subjects.find(subjectId);

    if (!subject) {
      return ctx.response.status(404).json({
        message: 'Subject not found',
      });
    }

    await subject.delete();

    return ctx.response.status(200).json({
      message: 'Subject deleted successfully',
    });
  }

}



