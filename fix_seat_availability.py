import re

with open('app/controllers/ClassSeatAvailabilitiesController.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove import AcademicSession
content = content.replace("import AcademicSession from '#models/AcademicSession'\n", "")

# 2. addSeatAvailability
content = content.replace(
"""    const { class_id, total_seats, academic_session_id } = ctx.request.only([
      'class_id',
      'total_seats',
      'academic_session_id',
    ])""",
"""    const { class_id, total_seats, academic_year, academic_session_id } = ctx.request.only([
      'class_id',
      'total_seats',
      'academic_year',
      'academic_session_id',
    ])
    const year = Number(academic_year || academic_session_id)"""
)

content = content.replace(".where('academic_session_id', academic_session_id as number)", ".where('academic_year', year)")
content = content.replace("academic_session_id: academic_session_id as number,", "academic_year: year,")

# 3. getAllClassesSeatAvailability
old_get_all = """    let acadamic_session_id = ctx.request.input('acadamic_session')
    if (!acadamic_session_id) {
      return ctx.response.badRequest({
        error: 'Academic session ID is required',
      })
    }
    let academic_session = await AcademicSession.query()
      .where('id', acadamic_session_id)
      .andWhere('school_id', ctx.auth.user!.school_id as number)
      .first()

    if (!academic_session) {
      return ctx.response.notFound({ error: 'No active academic session found' })
    }

    const classSeatAvailabilities = await ClassSeatAvailability.query()
      .preload('class')
      .preload('quota_allocation', (query) => {
        query.preload('quota', (query) => {
          query.where('academic_session_id', academic_session.id)
        })
        query.where('academic_session_id', academic_session.id)
      })
      .where('academic_session_id', academic_session.id)"""

new_get_all = """    let academic_year = ctx.request.input('academic_year') || ctx.request.input('acadamic_session') || ctx.request.input('academic_session_id')
    if (!academic_year) {
      return ctx.response.badRequest({
        error: 'Academic year is required',
      })
    }

    const classSeatAvailabilities = await ClassSeatAvailability.query()
      .preload('class')
      .preload('quota_allocation', (query) => {
        query.preload('quota', (q) => {
          q.where('academic_year', Number(academic_year))
        })
        query.where('academic_year', Number(academic_year))
      })
      .where('academic_year', Number(academic_year))"""

content = content.replace(old_get_all, new_get_all)

# 4. getSeatAvailability
old_get_seat = """    let activeSession = ctx.params.academic_session_id || ctx.request.input('academic_session_id')
    if (!activeSession) {
      activeSession = await AcademicSession.query()
        .where('is_active', true)
        .andWhere('school_id', ctx.auth.user!.school_id as number)
        .first()
    }
    if (!activeSession) {
      return ctx.response.notFound({
        error: 'No active academic session found',
      })
    }
    // Fetch seat availability for the class

    const availability = await ClassSeatAvailability.query()
      .preload('class')
      .preload('quota_allocation')
      .where('class_id', ctx.params.class_id)
      .andWhere('academic_session_id', activeSession.id)
      .first()"""

new_get_seat = """    let activeYear = ctx.params.academic_year || ctx.params.academic_session_id || ctx.request.input('academic_year') || ctx.request.input('academic_session_id')
    if (!activeYear) {
      return ctx.response.badRequest({
        error: 'Academic year is required',
      })
    }

    const availability = await ClassSeatAvailability.query()
      .preload('class')
      .preload('quota_allocation')
      .where('class_id', ctx.params.class_id)
      .andWhere('academic_year', Number(activeYear))
      .first()"""

content = content.replace(old_get_seat, new_get_seat)

# 5. updateSeatAvailability
old_update = """      // Get current active academic session for school
      const activeSession = await AcademicSession.query()
        .where('is_active', true)
        .andWhere('school_id', auth.user!.school_id as number)
        .first()

      if (!activeSession) {
        return response.notFound({ message: 'No active academic session found for this school' })
      }

      const academic_session_id = activeSession.id

      let seatAvailability = await ClassSeatAvailability.query()
        .where('class_id', class_id)
        .where('academic_session_id', academic_session_id as number)
        .first()"""

new_update = """      let academic_year = Number(request.input('academic_year') || request.input('academic_session_id'))
      if (!academic_year) {
        return response.badRequest({ message: 'Academic year is required' })
      }

      let seatAvailability = await ClassSeatAvailability.query()
        .where('class_id', class_id)
        .where('academic_year', academic_year)
        .first()"""

content = content.replace(old_update, new_update)

content = content.replace(".andWhere('academic_session_id', academic_session_id as number)", ".andWhere('academic_year', academic_year)")

with open('app/controllers/ClassSeatAvailabilitiesController.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("ClassSeatAvailabilitiesController fixed successfully")
