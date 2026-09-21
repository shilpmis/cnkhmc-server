import StaffMaster from '#models/StaffMaster';
import Staff from '#models/Staff';
import LeavePolicies from '#models/LeavePolicies';
import { CreateValidatorForStaffRole, UpdateValidatorForStaffRole } from '#validators/StaffMaster';
import type { HttpContext } from '@adonisjs/core/http'
// import db from '@adonisjs/lucid/services/db';

export default class StaffMasterController {

    async indexStaffMasterForSchool(ctx: HttpContext) {
        // let school_id = ctx.auth.user?.school_id;

        let role = ctx.request.input('role', 'all');
        let staffs: StaffMaster[] = []
        if (ctx.params.school_id == ctx.auth.user?.school_id) {
            if (role == 'teacher') {
                staffs = await StaffMaster
                    .query()
                    .where('school_id', ctx.params.school_id)
                    .andWhere('is_teaching_role', true);
            } else if (role == 'other') {
                staffs = await StaffMaster
                    .query()
                    .where('school_id', ctx.params.school_id)
                    .andWhere('is_teaching_role', false);
            } else {
                staffs = await StaffMaster
                    .query()
                    .where('school_id', ctx.params.school_id)
            }
            return ctx.response.json(staffs);
        } else {
            return ctx.response.status(404).json({ message: 'Please provide valid School ID.' });
        }
    }

    async createStaffRole(ctx: HttpContext) {

        let school_id = ctx.auth.user!.school_id;
        const academic_year = ctx.request.input('academic_session');

        if (!academic_year) {
            return ctx.response.status(400).json({ message: 'Please provide academic session id.' });
        }

        // Session check removed

        if (![1, 8].includes(ctx.auth.user?.role_id as number)) {
            return ctx.response.status(403).json({ message: 'You are not allocated to manage this functions.' });
        }
        const payload = await CreateValidatorForStaffRole.validate(ctx.request.body());
        const created_class = await StaffMaster.create({ 
            ...payload, 
            school_id: school_id as number,
            permissions: {},
            academic_year: academic_year as number
         });
        return ctx.response.json(created_class.serialize());
    }

    async updateStaffRole(ctx: HttpContext) {
        // let school_id = ctx.auth.user?.school_id
        if (![1, 8].includes(ctx.auth.user?.role_id as number)) {
            return ctx.response.status(403).json({ message: 'You are not allocated to manage this functions.' });
        }
        const payload = await UpdateValidatorForStaffRole.validate(ctx.request.body());
        const updated_class = await StaffMaster.findOrFail(ctx.params.id);
        updated_class.merge(payload);
        await updated_class.save();
        return ctx.response.json(updated_class.serialize());
    }

    async deleteStaffRole(ctx: HttpContext) {
        const school_id = ctx.auth.user?.school_id
        if (![1, 8].includes(ctx.auth.user?.role_id as number)) {
            return ctx.response.status(403).json({ message: 'You are not authorized to manage staff roles.' });
        }
        const staff_to_delete = await StaffMaster.find(ctx.params.id);
        if (!staff_to_delete || staff_to_delete.school_id !== school_id) {
            return ctx.response.status(404).json({ message: 'Role not found.' });
        }

        // 1. Check if assigned to any staff member in unified Staff table
        const associatedStaff = await Staff
            .query()
            .where('school_id', school_id as number)
            .andWhere('staff_role_id', staff_to_delete.id)
            .first();

        if (associatedStaff) {
            return ctx.response.status(400).json({ 
                message: `This role is currently assigned to staff member ${associatedStaff.first_name} ${associatedStaff.last_name}. You cannot delete this role.` 
            });
        }

        // 2. Check if linked to any leave policies
        const associatedPolicy = await LeavePolicies
            .query()
            .where('school_id', school_id as number)
            .andWhere('staff_role_id', staff_to_delete.id)
            .first();

        if (associatedPolicy) {
            return ctx.response.status(400).json({ 
                message: 'This role is currently linked to an active leave policy. You cannot delete this role.' 
            });
        }

        await staff_to_delete.delete();
        return ctx.response.status(200).json({ message: 'Role has been successfully deleted.' });
    }
}