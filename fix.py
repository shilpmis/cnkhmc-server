import re

with open('app/controllers/StudentManagementController.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove import
content = re.sub(r"import AcademicSession from '#models/AcademicSession'\n", "", content)

# 2. indexStudentForManagement
index_replacement = """    let academic_year = ctx.request.qs().academic_session

    if (!academic_year) {
      return ctx.response.status(400).json({
        success: false,
        message: 'No active academic session found',
      })
    }

    console.log("division ", division, academic_year)

    let student = await StudentEnrollments
      .query()
      .where('division_id', division)
      .andWhere('academic_year', academic_year)"""

content = re.sub(r"""    let active_academic_session = await AcademicSession.query\(\)
      \.where\('is_active', true\)
      \.andWhere\('school_id', schoolId!\)
      \.first\(\)

    if \(!active_academic_session\) \{
      return ctx\.response\.status\(400\)\.json\(\{
        success: false,
        message: 'No active academic session found',
      \}\)
    \}

    console\.log\("division ", division, active_academic_session\.id\)

    let student = await StudentEnrollments
      \.query\(\)
      \.where\('division_id', division\)
      \.andWhere\('academic_session_id', active_academic_session\.id\)""", index_replacement, content)

# 3. Remove all check_academic_session blocks
content = re.sub(r"""    let check_academic_session = await AcademicSession\.query\(\)
      \.where\('id', student_enrollment\.academic_session_id as number\)
      \.andWhere\('school_id', school_id!\)
      \.first\(\)

    if \(!check_academic_session\) \{
      return ctx\.response\.status\(400\)\.json\(\{
        success: false,
        message: 'Academic session not found',
      \}\)
    \}\n+""", "", content)

content = re.sub(r"""        let check_academic_session = await AcademicSession\.query\(\)
      \.where\('id', student_enrollment\.academic_session_id as number\)
      \.andWhere\('school_id', school_id!\)
      \.first\(\)
    
    if \(!check_academic_session\) \{
      return ctx\.response\.status\(400\)\.json\(\{
        success: false,
        message: 'Academic session not found',
      \}\)
    \}\n+""", "", content)

# 4. updateEnrollmentStatusToMigrate create
content = content.replace("academic_session_id: student_enrollment.academic_session_id as number,", "academic_year: student_enrollment.academic_year as number,")

# 5. getStudentsForPromotion
content = re.sub(r"""      const session = await AcademicSession\.query\(\)
        \.where\('id', payload\.academic_session_id as number\)
        \.if\(school_id !== undefined, \(query\) => query\.andWhere\('school_id', school_id!\)\)
        \.first\(\)

      if \(!session\) \{
        return ctx\.response\.badRequest\(\{ success: false, message: 'Academic session not found' \}\)
      \}\n""", "", content)

content = content.replace(".where('academic_session_id', payload.academic_session_id)", ".where('academic_year', payload.academic_session_id)")

# 6. promote
promote_repl = """      const [sourceDivision, targetDivision] = await Promise.all([
        Division.query().where('id', payload.source_division_id).first(),
        Division.query().where('id', payload.target_division_id).first(),
      ])

      if (!sourceDivision) return response.badRequest({ message: 'Source division not found' })
      if (!targetDivision) return response.badRequest({ message: 'Target division not found' })"""

content = re.sub(r"""      const \[sourceSession, targetSession, sourceDivision, targetDivision\] = await Promise\.all\(\[
        AcademicSession\.query\(\)
          \.where\('id', payload\.source_academic_session_id\)
          \.if\(school_id !== undefined, \(query\) => query\.where\('school_id', school_id!\)\)
          \.first\(\),
        AcademicSession\.query\(\)
          \.where\('id', payload\.target_academic_session_id\)
          \.if\(school_id !== undefined, \(query\) => query\.where\('school_id', school_id!\)\)
          \.first\(\),
        Division\.query\(\)\.where\('id', payload\.source_division_id\)\.first\(\),
        Division\.query\(\)\.where\('id', payload\.target_division_id\)\.first\(\),
      \]\)

      if \(!sourceSession\) return response\.badRequest\(\{ message: 'Source session not found' \}\)
      if \(!targetSession\) return response\.badRequest\(\{ message: 'Target session not found' \}\)
      if \(!sourceDivision\) return response\.badRequest\(\{ message: 'Source division not found' \}\)
      if \(!targetDivision\) return response\.badRequest\(\{ message: 'Target division not found' \}\)""", promote_repl, content)

content = content.replace(".andWhere('academic_session_id', payload.source_academic_session_id)", ".andWhere('academic_year', payload.source_academic_session_id)")
content = content.replace(".andWhere('academic_session_id', payload.target_academic_session_id)", ".andWhere('academic_year', payload.target_academic_session_id)")
content = content.replace("academic_session_id: payload.target_academic_session_id,", "academic_year: payload.target_academic_session_id,")


# 7. bulkPromote
bulkpromote_repl = """      const targetDivision = await Division.find(payload.target_division_id)

      if (!targetDivision) {
        return response.badRequest({ message: 'Target division not found' })
      }"""

content = re.sub(r"""      const \[targetSession, targetDivision\] = await Promise\.all\(\[
        AcademicSession\.query\(\)
          \.where\('id', payload\.target_academic_session_id\)
          \.if\(school_id !== undefined, \(q\) => q\.where\('school_id', school_id as number\)\)
          \.first\(\),
        Division\.find\(payload\.target_division_id\),
      \]\)

      if \(!targetSession\) \{
        return response\.badRequest\(\{
          message: 'Target academic session not found or invalid for this school',
        \}\)
      \}

      if \(!targetDivision\) \{
        return response\.badRequest\(\{ message: 'Target division not found' \}\)
      \}""", bulkpromote_repl, content)

# 8. getPromotionHistory
content = content.replace("'academic_session_id',", "'academic_year',")
content = content.replace("query.where('academic_session_id', sessionId)", "query.where('academic_year', sessionId)")
content = content.replace("andWhere('academic_session_id',", "andWhere('academic_year',")
content = content.replace("where('academic_session_id',", "where('academic_year',")

# 9. holdBackStudent
holdback_repl = """      // Validate sessions (removed since AcademicSession is deprecated)"""

content = re.sub(r"""      // Validate sessions
      const \[sourceSession, targetSession\] = await Promise\.all\(\[
        AcademicSession\.query\(\)
          \.where\('id', payload\.source_academic_session_id\)
          \.if\(schoolId !== undefined, \(q\) => q\.where\('school_id', schoolId!\)\)
          \.first\(\),
        AcademicSession\.query\(\)
          \.where\('id', payload\.target_academic_session_id\)
          \.if\(schoolId !== undefined, \(q\) => q\.where\('school_id', schoolId!\)\)
          \.first\(\),
      \]\)

      if \(!sourceSession\) return response\.badRequest\(\{ message: 'Source session not found' \}\)
      if \(!targetSession\) return response\.badRequest\(\{ message: 'Target session not found' \}\)""", holdback_repl, content)

# 10. bulkHoldBackStudents
bulkhold_repl = """      // Validate target session (removed since AcademicSession is deprecated)"""

content = re.sub(r"""      // Validate target session
      const targetSession = await AcademicSession\.query\(\)
        \.where\('id', payload\.target_academic_session_id\)
        \.if\(schoolId !== undefined, \(q\) => q\.where\('school_id', schoolId!\)\)
        \.first\(\)

      if \(!targetSession\) \{
        return response\.badRequest\(\{ message: 'Target academic session not found' \}\)
      \}""", bulkhold_repl, content)


with open('app/controllers/StudentManagementController.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
