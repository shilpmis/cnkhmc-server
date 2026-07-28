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
  const [rows] = await c.execute('SELECT id, academic_year FROM school_timetable_config LIMIT 5');
  console.log('Timetable Config:', rows);
  await c.end();
}
run().catch(console.error);
