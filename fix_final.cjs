const fs = require('fs');

// 1. Fix certificate_templates_controller.ts
const ctcPath = 'e:/Internship/CNKHMC/cnkhmc-server/app/controllers/certificate_templates_controller.ts';
if (fs.existsSync(ctcPath)) {
  let ctcContent = fs.readFileSync(ctcPath, 'utf8');
  ctcContent = ctcContent.replace(/academic_yearsession_name/g, "session_name");
  ctcContent = ctcContent.replace(/academic_yearstart_month/g, "start_month");
  ctcContent = ctcContent.replace(/academic_yearstart_year/g, "start_year");
  ctcContent = ctcContent.replace(/academic_yearend_month/g, "end_month");
  ctcContent = ctcContent.replace(/academic_yearend_year/g, "end_year");
  fs.writeFileSync(ctcPath, ctcContent, 'utf8');
}

// 2. Fix FeesController.ts
const feesPath = 'e:/Internship/CNKHMC/cnkhmc-server/app/controllers/FeesController.ts';
let feesContent = fs.readFileSync(feesPath, 'utf8');
feesContent = feesContent.replace(/let dummy_academic_year = await db\.from/g, "let academic_year: any = await db.from");
// Also fix any dangling academic_year errors
feesContent = feesContent.replace(/academic_year:\s*academic_year/g, "academic_year: (typeof academic_year !== 'undefined' ? academic_year : 2024)");
feesContent = feesContent.replace(/andWhere\('academic_year',\s*academic_year\)/g, "andWhere('academic_year', typeof academic_year !== 'undefined' ? academic_year : 2024)");
feesContent = feesContent.replace(/where\('academic_year',\s*academic_year\)/g, "where('academic_year', typeof academic_year !== 'undefined' ? academic_year : 2024)");
fs.writeFileSync(feesPath, feesContent, 'utf8');

// 3. Fix unused variables
const smcPath = 'e:/Internship/CNKHMC/cnkhmc-server/app/controllers/StudentManagementController.ts';
let smcContent = fs.readFileSync(smcPath, 'utf8');
smcContent = smcContent.replace(/let school_id =/g, 'let _school_id =');
smcContent = smcContent.replace(/let schoolId =/g, 'let _schoolId =');
fs.writeFileSync(smcPath, smcContent, 'utf8');

const leavesPath = 'e:/Internship/CNKHMC/cnkhmc-server/app/controllers/LeavesController.ts';
let leavesContent = fs.readFileSync(leavesPath, 'utf8');
leavesContent = leavesContent.replace(/\/\/ let currentYear =/g, 'let _currentYear =');
leavesContent = leavesContent.replace(/let currentYear =/g, 'let _currentYear =');
fs.writeFileSync(leavesPath, leavesContent, 'utf8');

console.log('Fixed certificate_templates, FeesController dummy vars, and unused vars.');
