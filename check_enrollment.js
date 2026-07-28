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

  const [enrollments] = await connection.execute('SELECT * FROM staff_enrollments LIMIT 1');
  console.log('Enrollments:', enrollments);
  
  // Create enrollments for staff 9 and 10 if none exist
  if (enrollments.length > 0) {
    const year = enrollments[0].academic_year;
    console.log('Using academic year:', year);
    await connection.execute(`INSERT INTO staff_enrollments (academic_year, staff_id, school_id, status) VALUES (?, 9, 1, 'Retained')`, [year]);
    await connection.execute(`INSERT INTO staff_enrollments (academic_year, staff_id, school_id, status) VALUES (?, 10, 1, 'Retained')`, [year]);
    console.log('Inserted enrollments for staff 9 and 10');
  }

  await connection.end();
}

check().catch(console.error);
