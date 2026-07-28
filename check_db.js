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

  const [rows] = await connection.execute('SELECT id, first_name, is_teaching_role, employment_status, resignation_date, retirement_date, staff_role_id FROM staff WHERE id IN (9, 10)');
  console.log('Staff 9 and 10:', rows);

  const [enrollments] = await connection.execute('SELECT * FROM staff_enrollments WHERE staff_id IN (9, 10)');
  console.log('Enrollments:', enrollments);
  
  const [roles] = await connection.execute('SELECT * FROM staff_role_master WHERE id IN (SELECT staff_role_id FROM staff WHERE id IN (9, 10))');
  console.log('Roles:', roles);

  await connection.end();
}

check().catch(console.error);
