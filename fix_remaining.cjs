const fs = require('fs');

// 1. StudentManagementController.ts
const smcPath = 'e:/Internship/CNKHMC/cnkhmc-server/app/controllers/StudentManagementController.ts';
let smcContent = fs.readFileSync(smcPath, 'utf8');
smcContent = smcContent.replace(/\/\/ let schoolId =/g, 'let schoolId =');
smcContent = smcContent.replace(/\/\/ let school_id =/g, 'let school_id =');
fs.writeFileSync(smcPath, smcContent, 'utf8');

// 2. AcademicCalendarSettingsController.ts
const acscPath = 'e:/Internship/CNKHMC/cnkhmc-server/app/controllers/AcademicCalendarSettingsController.ts';
let acscContent = fs.readFileSync(acscPath, 'utf8');
acscContent = acscContent.replace(/sessionQuery\./g, "academic_year");
fs.writeFileSync(acscPath, acscContent, 'utf8');

// 3. certificate_templates_controller.ts
const ctcPath = 'e:/Internship/CNKHMC/cnkhmc-server/app/controllers/certificate_templates_controller.ts';
let ctcContent = fs.readFileSync(ctcPath, 'utf8');
ctcContent = ctcContent.replace(/session\./g, "academic_year");
fs.writeFileSync(ctcPath, ctcContent, 'utf8');

// 4. ClassesController.ts
const ccPath = 'e:/Internship/CNKHMC/cnkhmc-server/app/controllers/ClassesController.ts';
let ccContent = fs.readFileSync(ccPath, 'utf8');
ccContent = ccContent.replace(/academicSession\./g, "academic_year");
ccContent = ccContent.replace(/academic_Session/g, "academic_year");
fs.writeFileSync(ccPath, ccContent, 'utf8');

// 5. ClassSeatAvailabilitiesController.ts
const csacPath = 'e:/Internship/CNKHMC/cnkhmc-server/app/controllers/ClassSeatAvailabilitiesController.ts';
let csacContent = fs.readFileSync(csacPath, 'utf8');
csacContent = csacContent.replace(/academic_session\./g, "academic_year");
csacContent = csacContent.replace(/activeSession\./g, "academic_year");
fs.writeFileSync(csacPath, csacContent, 'utf8');

// 6. FeesController.ts
const feesPath = 'e:/Internship/CNKHMC/cnkhmc-server/app/controllers/FeesController.ts';
let feesContent = fs.readFileSync(feesPath, 'utf8');
feesContent = feesContent.replace(/let academic_year = await db\.from/g, "let dummy_academic_year = await db.from");
feesContent = feesContent.replace(/academicSession\.id/g, "academic_year");
fs.writeFileSync(feesPath, feesContent, 'utf8');

// 7. exam_schedules_controller.ts
const escPath = 'e:/Internship/CNKHMC/cnkhmc-server/app/controllers/exam_schedules_controller.ts';
let escContent = fs.readFileSync(escPath, 'utf8');
escContent = escContent.replace(/new Date\(examSchedule\.start_date\)/g, "new Date(examSchedule.start_date.toISODate())");
escContent = escContent.replace(/new Date\(examSchedule\.end_date\)/g, "new Date(examSchedule.end_date.toISODate())");
escContent = escContent.replace(/\.preload\(''\)/g, ""); // Remove empty preload
fs.writeFileSync(escPath, escContent, 'utf8');

console.log('All remaining controllers patched.');
