const fs = require('fs');
const files = [
  'app/controllers/TimeTableController.ts',
  'app/controllers/LeavesController.ts',
  'app/controllers/PayrollController.ts',
  'app/controllers/QuotaAllocationController.ts',
  'app/controllers/SchoolsController.ts'
];
files.forEach(file => {
  if (fs.existsSync(file)) {
    let c = fs.readFileSync(file, 'utf8');
    c = c.replace(/import AcademicSession from '#models\/AcademicSession'/g, '// import AcademicSession from "#models/AcademicSession"');
    c = c.replace(/academic_session_id:\s*\w+,?/g, '');
    c = c.replace(/let \w+\s*=\s*await AcademicSession\.query\(\)[\s\S]*?first\(\)/g, '// removed session fetch');
    c = c.replace(/const \w+\s*=\s*await AcademicSession\.query\(\)[\s\S]*?first\(\)/g, '// removed session fetch');
    c = c.replace(/if\s*\(\!\w+\)\s*\{\s*return ctx\.response\.status\(404\)\.json\(\{.*?\}\)\s*\}/g, '// removed session check');
    fs.writeFileSync(file, c);
  }
});
