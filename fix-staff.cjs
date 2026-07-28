const fs = require('fs');

let payroll = fs.readFileSync('app/controllers/PayrollController.ts', 'utf8');
payroll = payroll.replace(/salary_component\./g, 'salary_component!.');
payroll = payroll.replace(/staff_salary_template\./g, 'staff_salary_template!.');
payroll = payroll.replace(/accademic_session/g, '/* accademic_session */');
payroll = payroll.replace(/active_session/g, '/* active_session */');
payroll = payroll.replace(/accamic_session/g, '/* accamic_session */');
payroll = payroll.replace(/active_academic_seesion/g, '/* active_academic_seesion */');
payroll = payroll.replace(/let school_id = ctx.auth.user\?\.school_id/g, '// let school_id ...');
fs.writeFileSync('app/controllers/PayrollController.ts', payroll);

let leaves = fs.readFileSync('app/controllers/LeavesController.ts', 'utf8');
leaves = leaves.replace(/academic_session/g, '/* academic_session */');
leaves = leaves.replace(/academic_sesion/g, '/* academic_sesion */');
leaves = leaves.replace(/academic_Session/g, '/* academic_Session */');
leaves = leaves.replace(/oldSession/g, '/* oldSession */');
leaves = leaves.replace(/newSession/g, '/* newSession */');
leaves = leaves.replace(/let academic_year =/g, '// let academic_year =');
fs.writeFileSync('app/controllers/LeavesController.ts', leaves);

let quota = fs.readFileSync('app/controllers/QuotaAllocationController.ts', 'utf8');
quota = quota.replace(/active_academic_year/g, '/* active_academic_year */');
fs.writeFileSync('app/controllers/QuotaAllocationController.ts', quota);

let studentMgmt = fs.readFileSync('app/controllers/StudentManagementController.ts', 'utf8');
studentMgmt = studentMgmt.replace(/let school_id = ctx/g, '// let school_id = ctx');
fs.writeFileSync('app/controllers/StudentManagementController.ts', studentMgmt);

let timeTable = fs.readFileSync('app/controllers/TimeTableController.ts', 'utf8');
timeTable = timeTable.replace(/import AcademicSession from '#models\/AcademicSession'/g, '// import AcademicSession');
timeTable = timeTable.replace(/academic_session_id:\s*[^,]+,/g, '');
timeTable = timeTable.replace(/academic_session_id:/g, '// academic_session_id:');
timeTable = timeTable.replace(/AcademicSession/g, '/* AcademicSession */');
timeTable = timeTable.replace(/academicSession/g, '/* academicSession */');
timeTable = timeTable.replace(/academic_session/g, '/* academic_session */');
timeTable = timeTable.replace(/activeSession/g, '/* activeSession */');
fs.writeFileSync('app/controllers/TimeTableController.ts', timeTable);
