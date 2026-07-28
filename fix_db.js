import 'dotenv/config';
import mysql from 'mysql2/promise';

async function run() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 25060
  });
  
  try {
    await c.execute('ALTER TABLE lesson_plan_topics DROP COLUMN assigned_staff_id');
    console.log('dropped topics');
  } catch(e){ console.log(e.message) }
  
  try {
    await c.execute('ALTER TABLE lesson_plan_subtopics DROP COLUMN assigned_staff_id');
    console.log('dropped subtopics');
  } catch(e){ console.log(e.message) }
  
  try {
    await c.execute('DELETE FROM adonis_schema WHERE name = \'database/migrations/1784786590962_create_add_assigned_staff_id_to_lesson_plan_tables_table.ts\'');
    console.log('cleaned migration table');
  } catch(e){ console.log(e.message) }
  
  await c.end();
}
run().catch(console.error);
