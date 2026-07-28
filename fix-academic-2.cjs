const fs = require('fs');

const files = [
  'app/controllers/TimeTableController.ts',
  'app/controllers/LeavesController.ts',
  'app/controllers/PayrollController.ts',
  'app/controllers/QuotaAllocationController.ts',
  'app/controllers/SchoolsController.ts',
  'app/controllers/StudentManagementController.ts',
  'app/controllers/FeesController.ts',
  'app/controllers/InquiriesController.ts'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let c = fs.readFileSync(file, 'utf8');
  
  c = c.replace(/import AcademicSession from '#models\/AcademicSession';?\r?\n/g, '');
  c = c.replace(/academic_session_id:\s*\w+,?\r?\n/g, '');
  
  // Replace the queries
  c = c.replace(/(?:let|const)\s+[a-zA-Z0-9_]+\s*=\s*await\s+AcademicSession(?:\.query\(\)[\s\S]*?first\(\)|\.find\([^\)]+\);?)\r?\n?/g, '');
  
  // Replace the queries in TimeTableController (some just have `await AcademicSession`)
  c = c.replace(/(?:let|const)\s+[a-zA-Z0-9_]+\s*=\s*await\s+AcademicSession\r?\n?/g, '');

  // Remove check blocks
  c = c.replace(/if\s*\(![a-zA-Z0-9_]*?sess?ion\)\s*\{[^}]+\}\r?\n?/gi, '');
  
  if (file.includes('PayrollController.ts')) {
    c = c.replace(/salary_component\./g, 'salary_component!.');
    c = c.replace(/staff_salary_template\./g, 'staff_salary_template!.');
  }

  // Remove unused school_id in StudentManagementController
  if (file.includes('StudentManagementController.ts')) {
    c = c.replace(/let school_id = ctx\.auth\.user!\.school_id/g, '// unused school_id');
  }

  // Remove unused school_id in PayrollController
  if (file.includes('PayrollController.ts')) {
    c = c.replace(/let school_id = ctx\.auth\.user\?\.school_id/g, '// unused school_id');
  }

  fs.writeFileSync(file, c);
}
