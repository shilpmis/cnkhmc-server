const fs = require('fs');

let file = 'app/controllers/StudentManagementController.ts';
let content = fs.readFileSync(file, 'utf8');

// The payload actually has source_academic_session_id and target_academic_session_id
// So we should replace payload.source_academic_year -> payload.source_academic_session_id
content = content.replace(/payload\.source_academic_year/g, 'payload.source_academic_session_id');
content = content.replace(/payload\.target_academic_year/g, 'payload.target_academic_session_id');

// But actually, looking at the TS error: 
// Property 'source_academic_year' does not exist on type '{ student_id: number; source_academic_session_id: number; ... }'
// This confirms we should use payload.source_academic_session_id

// And for StudentEnrollments, it uses academic_year, not academic_session_id
// Let's replace student_enrollment.academic_session_id -> student_enrollment.academic_year
content = content.replace(/\.academic_session_id/g, '.academic_year');

// But wait, the validator schema uses 'source_academic_session_id'.
// Since we did `.academic_session_id -> .academic_year`, payload.source_academic_session_id will become payload.source_academic_year!
// So let's do this in the right order:
// First, replace `.academic_session_id` with `.academic_year`
// This makes student_enrollment.academic_year, and also payload.source_academic_year.
// Wait! If we change payload.source_academic_session_id to payload.source_academic_year in the controller, it will STILL conflict with the validator unless we also change the validator!
// Let's check if the validator is used in StudentManagementController.ts
