import 'dotenv/config';
import mysql from 'mysql2/promise';

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 25060,
  });

  const [sessions] = await connection.execute('SELECT * FROM academic_sessions');
  console.log('Sessions:', sessions);
  const [enrollments] = await connection.execute('SELECT * FROM staff_enrollments WHERE staff_id IN (9, 10)');
  console.log('Enrollments:', enrollments);
  
  await connection.end();
}

check().catch(console.error);
