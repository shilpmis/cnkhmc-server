/**
 * The final heads of the student sheet, in sheet order. They are the only heads used for the student
 * import, the student export and the manual student entry. Keep cnkhmc-client/src/utils/studentColumns.ts
 * in step with this list.
 *
 * table: where the value is stored.
 *   students  -> students table
 *   meta      -> students_meta table
 *   derived   -> not stored on its own (export only, ignored on import)
 */
export type StudentColumnKind = 'text' | 'int' | 'float' | 'date' | 'bool' | 'gender' | 'category' | 'blood' | 'aadhar'

export interface StudentColumn {
  key: string
  header: string
  table: 'students' | 'meta' | 'derived'
  kind: StudentColumnKind
}

const c = (
  key: string,
  header: string,
  table: StudentColumn['table'],
  kind: StudentColumnKind = 'text'
): StudentColumn => ({ key, header, table, kind })

export const STUDENT_COLUMNS: StudentColumn[] = [
  c('admission_number', 'AdmissionID', 'students'),
  c('enrollment_code', 'Enrollment number', 'students'),
  c('full_name', 'FULL NAME', 'derived'),
  c('first_name', 'FIRST_NAME', 'students'),
  c('middle_name', 'MIDDLE_NAME', 'students'),
  c('last_name', 'LAST_NAME', 'students'),
  c('name_as_per_aadhar', 'Name as Per Aadhar', 'meta'),
  c('gender', 'GENDER', 'students', 'gender'),
  c('birth_date', 'DATE_OF_BIRTH', 'students', 'date'),
  c('class', 'CLASS', 'derived'),
  c('practical_batch', 'BATCH', 'students'),
  c('primary_mobile', 'MOBILE_NO1', 'students', 'int'),
  c('address', 'CORRESPONDENCE ADDRESS', 'meta'),
  c('postal_code', 'CORRESPONDENCE PIN_CODE', 'meta'),
  c('permanent_address', 'PERMANENT ADDRESS', 'meta'),
  c('permanent_pincode', 'Permanent PIN_CODE', 'meta'),
  c('country_code', 'COUNTRY_CODE', 'meta'),
  c('nationality', 'NATIONALITY', 'meta'),
  c('university_spid_no', 'UNIVERSITY SPID NUMBER', 'meta'),
  c('admission_year', 'Admission Year', 'meta'),
  c('admission_date', 'ADMISSION_DATE', 'meta', 'date'),
  c('admission_quota', 'ADMISSION_QUOTA', 'meta'),
  c('admission_category', 'ADMISSION CATEGORY', 'meta'),
  c('tuition_fees', 'TUTION FEES', 'meta'),
  c('first_year_roll_number', 'ROLL_NO 1st BHMS', 'students', 'int'),
  c('second_year_roll_number', 'ROLL_NO 2nd BHMS', 'students', 'int'),
  c('third_year_roll_number', 'ROLL_NO 3rd BHMS', 'students', 'int'),
  c('fourth_year_roll_number', 'ROLL_NO 4th BHMS', 'students', 'int'),
  c('roll_no_internship', 'ROLL_NO Internship', 'meta'),
  c('secondary_mobile', 'MOBILE_NO2', 'meta', 'int'),
  c('religion', 'RELIGION', 'meta'),
  c('caste', 'CASTE', 'meta'),
  c('category', 'CATEGORY', 'meta', 'category'),
  c('blood_group', 'BLOOD_GROUP', 'meta', 'blood'),
  c('birth_place', 'BIRTH PLACE', 'meta'),
  c('student_leaving_reason', 'STUDENT_LEAVING_REASON', 'meta'),
  c('student_lc_date', 'STUDENT_LC_DATE', 'meta', 'date'),
  c('student_lc_no', 'STUDENT_LC_NO', 'meta'),
  c('privious_school', 'PREVIOUS_SCHOOL_NAME', 'meta'),
  c('aadhar_no', 'STUDENT_AADHAAR_CARDNO', 'students', 'aadhar'),
  c('aadhar_dise_no', 'STUDENT_U_DIESNO', 'meta'), // 18 digits: kept as text, a number would round it
  c('bank_name', 'Bank_Name', 'meta'),
  c('bank_branch_name', 'Bank_Branch_Name', 'meta'),
  c('account_no', 'Bank_Account_Number', 'meta', 'int'),
  c('IFSC_code', 'IFSC_Code', 'meta'),
  c('bank_branch_pincode', 'Branch Pin Code', 'meta'),
  c('email_id', 'EMAIL_ID', 'meta'),
  c('father_name', 'FATHER_NAME', 'students'),
  c('father_occupation', 'FATHER_OCCUPATION', 'meta'),
  c('father_mobile', 'FATHER_MOBILENO', 'meta'),
  c('mother_name', 'MOTHER_NAME', 'students'),
  c('mother_occupation', 'MOTHER_OCCUPATION', 'meta'),
  c('mother_mobile', 'MOTHER_MOBILENO', 'meta'),
  c('guardian_name', 'GUARDIAN_NAME', 'meta'),
  c('guardian_occupation', 'GUARDIAN_OCCUPATION', 'meta'),
  c('guardian_mobile', 'GUARDIAN_MOBILENO', 'meta'),
  c('guardian_relation', 'Relation with Guardian', 'meta'),
  c('ssc_passing_year', 'S.S.C. Passing Year', 'meta'),
  c('hsc_passing_year', 'H.S.C. Passing Year', 'meta'),
  c('hsc_attempts', 'H.S.C Number of Attempt', 'meta', 'int'),
  c('hsc_obtained_marks', 'H.S.C. Obtained Marks', 'meta', 'float'),
  c('hsc_pcb_marks_with_practical', 'H.S.C. PCB Marks (T+P)', 'meta', 'float'),
  c('neet_score', 'NEET score', 'meta', 'float'),
  c('neet_roll_no', 'NEET Roll No.', 'meta'),
  c('neet_application_number', 'NEET Application Number', 'meta'),
  c('neet_all_india_rank', 'NEET All India Rank', 'meta', 'int'),
  c('neet_percentile', 'NEET Percentile (%)', 'meta'),
  c('general_merit', 'General Merit', 'meta', 'int'),
  c('category_merit', 'Category Merit', 'meta', 'int'),
  c('internship_provisional_number', 'Internship Provisional Number', 'meta'),
  c('internship_provisional_date', 'Internship Provisional Date', 'meta', 'date'),
  c('internship_starting_date', 'Internship Starting Date', 'meta', 'date'),
  c('internship_completion_date', 'Internship Completion Date', 'meta', 'date'),
  c('first_year_attempt', '1st year Attempt', 'meta', 'int'),
  c('second_year_attempt', '2nd Year Attempt', 'meta', 'int'),
  c('third_year_attempt', '3rd Year Attempt', 'meta', 'int'),
  c('fourth_year_attempt', '4th year Attempt', 'meta', 'int'),
  c('final_bhms_passing_date', 'Final BHMS Date of Passing', 'meta', 'date'),
  c('ayush_id', 'Ayush ID', 'meta'),
  c('abc_id', 'ABC ID', 'meta'),
  c('admission_cancel', 'Admission Cancel', 'meta', 'bool'),
  c('admission_cancel_year', 'Admission Cancel Year', 'meta'),
  c('admission_cancel_date', 'Admission Cancel Date', 'meta', 'date'),
  c('admission_transfer', 'Admission Transfer', 'meta', 'bool'),
  c('admission_transfer_date', 'Admission Transfer Date', 'meta', 'date'),
  c('admission_transfer_to_college', 'Admission transfer to College', 'meta'),
  c('admission_transfer_from_college', 'Admission Transfer From College', 'meta'),
  c('school_udise_no', 'School UDISE No.', 'meta'),
]

/** Lower-case letters and digits only, so "MOBILE NO1", "Mobile_No1" and "mobile_no1" read the same. */
export const normalizeHead = (value: unknown): string =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

const KEY_BY_HEAD = new Map(STUDENT_COLUMNS.map((col) => [normalizeHead(col.header), col]))

/** The sheet row's values by column key; heads that are not in the final sheet are left out. */
export function readSheetRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [head, value] of Object.entries(row)) {
    const col = KEY_BY_HEAD.get(normalizeHead(head))
    if (col) out[col.key] = value
  }
  return out
}

/** Keys that can be asked for when exporting */
export const EXPORTABLE_KEYS = new Set(STUDENT_COLUMNS.map((col) => col.key))
