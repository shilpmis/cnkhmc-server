import db from '@adonisjs/lucid/services/db'
import Subjects from '#models/Subjects'

async function checkSubject() {
  const subjects = await Subjects.query().where('name', 'like', '%Materia Medica%')
  console.log(JSON.stringify(subjects, null, 2))
}

checkSubject().then(() => process.exit()).catch(console.error)
