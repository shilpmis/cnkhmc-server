import Students from '#models/Students'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const students: any[] = [
      {
        id: 1, school_id: 1,
        first_name: "Sneha", middle_name: "Vikas", last_name: "Trivedi",
        first_name_in_guj: "સ્નેહા", middle_name_in_guj: "વિકાસ", last_name_in_guj: "ત્રિવેદી",
        gender: "Female", birth_date: new Date("2013-08-12"), gr_no: 5004,
        primary_mobile: 9876543213, father_name: "Vikas Trivedi",
        father_name_in_guj: "વિકાસ ત્રિવેદી", mother_name: "Kavita Trivedi",
        mother_name_in_guj: "કવિતા ત્રિવેદી", first_year_roll_number: 20,
        aadhar_no: 123456789125, is_active: true, enrollment_code: "HSS23S1"
      },
      {
        id: 2, school_id: 1,
        first_name: "Rohan", middle_name: "Jitendra", last_name: "Desai",
        first_name_in_guj: "રોહન", middle_name_in_guj: "જિતેન્દ્ર", last_name_in_guj: "દેસાઈ",
        gender: "Male", birth_date: new Date("2011-01-22"), gr_no: 5005,
        primary_mobile: 9876543214, father_name: "Jitendra Desai",
        father_name_in_guj: "જિતેન્દ્ર દેસાઈ", mother_name: "Meena Desai",
        mother_name_in_guj: "મીના દેસાઈ", first_year_roll_number: 10,
        aadhar_no: 123456789126, is_active: true, enrollment_code: "HSS23S2"
      },
      {
        id: 3, school_id: 1,
        first_name: "Deepika", middle_name: "Mahesh", last_name: "Joshi",
        first_name_in_guj: "દીપિકા", middle_name_in_guj: "મહેશ", last_name_in_guj: "જોશી",
        gender: "Female", birth_date: new Date("2010-11-30"), gr_no: 5006,
        primary_mobile: 9876543215, father_name: "Mahesh Joshi",
        father_name_in_guj: "મહેશ જોશી", mother_name: "Lata Joshi",
        mother_name_in_guj: "લતા જોશી", first_year_roll_number: 8,
        aadhar_no: 123456789127, is_active: true, enrollment_code: "HSS23S3"
      },
      {
        id: 4, school_id: 1,
        first_name: "Varun", middle_name: "Harish", last_name: "Kapadia",
        first_name_in_guj: "વરુણ", middle_name_in_guj: "હરીશ", last_name_in_guj: "કાપડિયા",
        gender: "Male", birth_date: new Date("2012-02-18"), gr_no: 5010,
        primary_mobile: 9876543234, father_name: "Harish Kapadia",
        father_name_in_guj: "હરીશ કાપડિયા", mother_name: "Seema Kapadia",
        mother_name_in_guj: "સીમા કાપડિયા", first_year_roll_number: 5,
        aadhar_no: 123456789134, is_active: true, enrollment_code: "HSS23S4"
      },
    ]

    for (const student of students) {
      await Students.updateOrCreate({ id: student.id }, student)
    }
  }
}
