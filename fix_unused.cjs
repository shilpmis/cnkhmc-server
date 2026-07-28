const fs = require('fs');

// StudentManagementController
const smcPath = 'e:/Internship/CNKHMC/cnkhmc-server/app/controllers/StudentManagementController.ts';
let smcContent = fs.readFileSync(smcPath, 'utf8');
smcContent = smcContent.replace(/let schoolId =/g, '// let schoolId =');
smcContent = smcContent.replace(/let school_id =/g, '// let school_id =');
fs.writeFileSync(smcPath, smcContent, 'utf8');

// LeavesController
const leavesPath = 'e:/Internship/CNKHMC/cnkhmc-server/app/controllers/LeavesController.ts';
let leavesContent = fs.readFileSync(leavesPath, 'utf8');
leavesContent = leavesContent.replace(/let currentYear =/g, '// let currentYear =');
fs.writeFileSync(leavesPath, leavesContent, 'utf8');

console.log('Unused variables commented out');
