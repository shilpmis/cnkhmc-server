import OtherStaff from '#models/OtherStaff';
import StaffMaster from '#models/StaffMaster';
import { CreateValidatorForOtherStaff, UpdateValidatorForOtherStaff } from '#validators/OtherStaff';
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db';
import path from 'path';
import { parseAndReturnJSON } from '../../utility/parseCsv.js';
import app from '@adonisjs/core/services/app';
import { CreateValidatorForBulkUpload } from '#validators/Teachers';

export default class OtherStaffsController {

    async indexOtherStaffForSchool(ctx: HttpContext) {

        let school_id = ctx.params.school_id;
        let page = ctx.request.input('page', 1);

        const other_staff = await OtherStaff.query()
            .preload('role_type')
            .where('school_id', school_id as number)
            .paginate(page, 6);
        return ctx.response.status(200).json(other_staff);

    }

    async createOtherStaff(ctx: HttpContext) {

        let school_id = ctx.params.school_id;
        let role_id = ctx.auth.user!.role_id

        let res_array: any = []
        const trx = await db.transaction();

        if (ctx.auth.user!.school_id == school_id && (role_id !== 3 && role_id !== 5)) {
            let payload = await CreateValidatorForOtherStaff.validate(ctx.request.body());

            for (let i = 0; i < payload.length; i++) {


                let role = await StaffMaster.query({ client: trx })
                    .where('school_id', school_id as number)
                    .andWhere('id', payload[i].staff_role_id)
                    .andWhere('is_teaching_role', false)

                if (role) {
                    let other_staff = await OtherStaff.create({ ...payload[i], school_id: school_id as number }, { client: trx });
                    res_array.push(other_staff);
                } else {
                    return ctx.response.status(404).
                        json({ message: "This role is not available for your school !" });
                }

            }

            //  Commit the transaction if both inserts succeed
            await trx.commit();

            return ctx.response.status(201).json(res_array);

        } else {
            return ctx.response.status(403).json({ message: "You are not authorized to create a staff" });
        }
    }

    async updateOtherStaff(ctx: HttpContext) {

        let role_id = ctx.auth.user!.role_id;
        let school_id = ctx.params.school_id;
        let other_staff_id = ctx.params.other_staff_id;

        const trx = await db.transaction();

        if (school_id !== ctx.auth.user!.school_id && (role_id !== 3 && role_id !== 5)) {
            let payload = await UpdateValidatorForOtherStaff.validate(ctx.request.body());
            let other_staff = (await OtherStaff.findOrFail(other_staff_id)).useTransaction(trx);
            if (other_staff) {
                if (payload.staff_role_id && payload.staff_role_id !== other_staff.staff_role_id) {
                    let role = await StaffMaster.query({ client: trx })
                        .where('school_id', school_id as number)
                        .andWhere('id', payload.staff_role_id)
                        .andWhere('is_teaching_role', true)

                    if (!role) {
                        return ctx.response.status(404).
                            json({ message: "This role is not available for your school !" });
                    }
                }
                (await other_staff.merge(payload).save()).useTransaction(trx);

                await trx.commit()
                return ctx.response.status(200).json(other_staff);
            } else {
                await trx.rollback()
                return ctx.response.status(404).json({ message: "Teacher not found" });
            }
        } else {
            await trx.rollback()
            return ctx.response.status(403).json({ message: "You are not authorized to create a Staff" });
        }
    }

    async bulkUploadOtherStaff(ctx: HttpContext) {
        const school_id = ctx.params.school_id;
        const role_id = ctx.auth.user!.role_id;
        if (school_id !== ctx.auth.user!.school_id && (role_id === 3 || role_id === 5)) {
            return ctx.response.status(403).json({ message: "You are not authorized to create teachers." });
        }

        try {
            // Ensure a file is uploaded
            const csvFile = ctx.request.file('file', {
                extnames: ['csv'],
                size: '2mb',
            });

            if (!csvFile) {
                return ctx.response.badRequest({ message: 'CSV file is required.' });
            }

            // Move file to temp storage
            const uploadDir = path.join(app.tmpPath(), 'uploads');
            await csvFile.move(uploadDir);

            if (!csvFile.isValid) {
                return ctx.response.badRequest({ message: csvFile.errors });
            }

            // Construct file path
            const filePath = path.join(uploadDir, csvFile.clientName);

            // Parse CSV file into JSON
            const jsonData = await parseAndReturnJSON(filePath);

            if (!jsonData.length) {
                return ctx.response.badRequest({ message: 'CSV file is empty or improperly formatted.' });
            }

            // Start a database transaction
            const trx = await db.transaction();

            try {
                let validatedData = [];

                for (const data of jsonData) {
                    // Validate each object separately

                    // Check if the staff role exists in the school and is a teaching role
                    const role = await StaffMaster.query({ client: trx })
                        .where('school_id', school_id as number)
                        .andWhere('role', data.role.trim())
                        .first();

                    if (!role) {
                        await trx.rollback();
                        return ctx.response.status(404).json({
                            message: `Role ${data.role} is not available for your school.`,
                        });
                    }

                    const validatedTeacher = await CreateValidatorForBulkUpload.validate(data);
                    validatedData.push({ ...validatedTeacher, school_id , staff_role_id: role.id });
                }

                console.log("validatedData", validatedData);
                // Insert only if all records are valid
                const teachers = await OtherStaff.createMany(validatedData, { client: trx });

                // Commit the transaction
                await trx.commit();

                return ctx.response.status(201).json({
                    message: 'Bulk upload successful',
                    totalInserted: teachers.length,
                    data: teachers,
                });
            } catch (validationError) {
                console.log("validationError", validationError);
                await trx.rollback();
                return ctx.response.status(400).json({
                    message: 'Validation failed',
                    errors: validationError.messages,
                });
            }
        } catch (error) {
            return ctx.response.internalServerError({
                message: 'An error occurred while processing the bulk upload.',
                error: error.message,
            });
        }
    }
}