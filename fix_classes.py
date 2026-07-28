import re

with open('app/controllers/ClassesController.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove AcademicSession import
content = content.replace("import AcademicSession from '#models/AcademicSession'\n", "")

# 2. Remove academicSession check in indexClassesForSchool
index_check = """    let academicSession = await AcademicSession.query()
      .where('is_active', 1)
      .andWhere('school_id', ctx.auth.user!.school_id!)
      .first()

    if (!academicSession) {
      return ctx.response.status(404).json({
        message: 'No active academic year found for this school',
      })
    }\n\n"""

content = content.replace(index_check, "")

# 3. Unused school_id in createClass
content = content.replace("    let school_id = ctx.auth.user?.school_id\n", "")

# 4. academic_session_id -> academic_year in createClass
content = content.replace("academic_session_id: payload.academic_session_id as number as number,", "academic_year: payload.academic_year as number,")

# 5. academic_session_id -> academic_year in createMultipleClasses
content = content.replace("academic_session_id: item.academic_session_id as number,", "academic_year: item.academic_year as number,")

# 6. Remove AcademicSession check in createDivision
create_div_check = """    let academic_Session = await AcademicSession.query()
      .where('is_active', 1)
      .andWhere('school_id', school_id as number)
      .first()

    if (!academic_Session) {
      return ctx.response.status(404).json({
        message: 'No active academic year found for this school',
      })
    }

    if (academic_Session.id !== payload.academic_session_id) {
      return ctx.response
        .status(404)
        .json({ message: 'Please provide a valid academic session id' })
    }\n\n"""

content = content.replace(create_div_check, "")

with open('app/controllers/ClassesController.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("ClassesController fixed successfully")
