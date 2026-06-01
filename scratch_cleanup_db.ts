import db from '@adonisjs/lucid/services/db'

async function run() {
  console.log('Cleaning up database...')
  
  try {
    // Drop tables if they exist
    await db.rawQuery('DROP TABLE IF EXISTS lesson_plan_topics')
    await db.rawQuery('DROP TABLE IF EXISTS lesson_plans')
    await db.rawQuery('DROP TABLE IF EXISTS daily_diaries')
    
    // Remove entries from adonis_schema for these tables to avoid "corrupt" errors
    // We look for filenames containing these patterns
    await db.rawQuery("DELETE FROM adonis_schema WHERE name LIKE '%lesson_plans%'")
    await db.rawQuery("DELETE FROM adonis_schema WHERE name LIKE '%lesson_plan_topics%'")
    await db.rawQuery("DELETE FROM adonis_schema WHERE name LIKE '%daily_diaries%'")
    
    console.log('Cleanup successful!')
  } catch (error) {
    console.error('Cleanup failed:', error)
  }
}

run()
