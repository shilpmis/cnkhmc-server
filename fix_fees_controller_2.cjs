const fs = require('fs');

const feesPath = 'e:/Internship/CNKHMC/cnkhmc-server/app/controllers/FeesController.ts';
let content = fs.readFileSync(feesPath, 'utf8');

// Replace all remaining `academic_session_id:` object keys with `academic_year:`
content = content.replace(/academic_session_id:/g, "academic_year:");

// Replace all remaining `academic_session_id` property accesses (e.g. obj.academic_session_id) with `academic_year`
content = content.replace(/\.academic_session_id/g, ".academic_year");

// Fix TS2304 "Cannot find name 'academic_session_id'" (variables we failed to rename)
content = content.replace(/let academic_session_id = ctx\.request\.input/g, "let academic_year = ctx.request.input");
content = content.replace(/\(academic_session_id\)/g, "(academic_year)");
content = content.replace(/academic_session_id\s*==/g, "academic_year ==");
content = content.replace(/academic_session_id\s*===/g, "academic_year ===");
content = content.replace(/if\s*\(\!academic_session_id\)/g, "if (!academic_year)");
content = content.replace(/where\('academic_session_id',\s*academic_session_id\s*as\s*number\)/g, "where('academic_year', academic_year as number)");
content = content.replace(/andWhere\('academic_session_id',\s*academic_session_id\s*as\s*number\)/g, "andWhere('academic_year', academic_year as number)");

// Specifically, some remaining usages of academic_session_id variable as just `academic_session_id` inside functions
// The problem is that if we blind-replace `academic_session_id`, it will fix TS2304 but might miss strings.
// Let's replace the exact word `academic_session_id` with `academic_year` everywhere except inside string quotes.
// To be safe, we just regex replace the standalone word.
content = content.replace(/\bacademic_session_id\b/g, "academic_year");

fs.writeFileSync(feesPath, content, 'utf8');
console.log('FeesController patched for remaining academic_session_id errors');
