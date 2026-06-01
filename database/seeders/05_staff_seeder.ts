import Staff from '#models/Staff'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const staffList = [
      {
        id: 1, school_id: 1, staff_role_id: 2,
        first_name: "Rita", middle_name: "Hitesh", last_name: "Patel",
        first_name_in_guj: "રિતા", middle_name_in_guj: "હિતેશ", last_name_in_guj: "પટેલ",
        gender: "Female", birth_date: new Date('1988-03-14'),
        mobile_number: 9876543210, email: "rita.patel@example.com",
        qualification: "B.Ed", subject_specialization: "Physics",
        joining_date: new Date('2015-06-15'), employment_status: "Permanent",
        aadhar_no: 567890123456, religion: "Hindu", religion_in_guj: "હિન્દુ",
        caste: "Patel", caste_in_guj: "પટેલ", category: "OPEN",
        address: "12 Green Park", district: "Ahmedabad", city: "Ahmedabad",
        state: "Gujarat", postal_code: 380015, bank_name: "Bank of Baroda",
        account_no: 567890123456, IFSC_code: "BARB0AHMEDB",
        is_teching_staff: true, employee_code: "22"
      },
      {
        id: 2, school_id: 1, staff_role_id: 3,
        first_name: "Kiran", middle_name: "Mahesh", last_name: "Trivedi",
        first_name_in_guj: "કિરણ", middle_name_in_guj: "મહેશ", last_name_in_guj: "ત્રિવેદી",
        gender: "Male", birth_date: new Date('1985-05-27'),
        mobile_number: 9123456780, email: "kiran.trivedi@example.com",
        qualification: "MBA", subject_specialization: "Others",
        joining_date: new Date('2017-09-12'), employment_status: "Permanent",
        aadhar_no: 678901234567, religion: "Hindu", religion_in_guj: "હિન્દુ",
        caste: "Brahmin", caste_in_guj: "બ્રાહ્મણ", category: "OPEN",
        address: "34 Sunrise Apartments", district: "Surat", city: "Surat",
        state: "Gujarat", postal_code: 395007, bank_name: "HDFC Bank",
        account_no: 678901234567, IFSC_code: "HDFC0001234",
        is_teching_staff: true, employee_code: "24"
      },
      {
        id: 3, school_id: 1, staff_role_id: 3,
        first_name: "Nita", middle_name: "Jignesh", last_name: "Gandhi",
        first_name_in_guj: "નીતા", middle_name_in_guj: "જિગ્નેશ", last_name_in_guj: "ગાંધિ",
        gender: "Female", birth_date: new Date('1992-08-16'),
        mobile_number: 9988776654, email: "nita.gandhi@example.com",
        qualification: "B.Com", subject_specialization: "Physics",
        joining_date: new Date('2019-11-20'), employment_status: "Trial_Period",
        aadhar_no: 789012345678, religion: "Hindu", religion_in_guj: "હિન્દુ",
        caste: "Vaishnav", caste_in_guj: "વૈષ્ણવ", category: "OPEN",
        address: "78 Lakeview Society", district: "Vadodara", city: "Vadodara",
        state: "Gujarat", postal_code: 390002, bank_name: "ICICI Bank",
        account_no: 789012345678, IFSC_code: "ICIC0007890",
        is_teching_staff: true, employee_code: "23"
      },
      {
        id: 4, school_id: 1, staff_role_id: 3,
        first_name: "Rajesh", middle_name: "Manoj", last_name: "Chauhan",
        first_name_in_guj: "રાજેશ", middle_name_in_guj: "મનોજ", last_name_in_guj: "ચૌહાણ",
        gender: "Male", birth_date: new Date('1980-01-25'),
        mobile_number: 9090909090, email: "rajesh.chauhan@example.com",
        qualification: "B.Com", subject_specialization: "Physics",
        joining_date: new Date('2013-02-01'), employment_status: "Permanent",
        aadhar_no: 890123456789, religion: "Hindu", religion_in_guj: "હિન્દુ",
        caste: "Chauhan", caste_in_guj: "ચૌહાણ", category: "OBC",
        address: "56 Hill View Complex", district: "Rajkot", city: "Rajkot",
        state: "Gujarat", postal_code: 360002, bank_name: "Axis Bank",
        account_no: 890123456789, IFSC_code: "UTIB0008901",
        is_teching_staff: true, employee_code: "2341"
      },
      {
        id: 5, school_id: 1, staff_role_id: 4,
        first_name: "Nilesh", middle_name: "Kumar", last_name: "Patel",
        first_name_in_guj: "નિલેશ", middle_name_in_guj: "કુમાર", last_name_in_guj: "પટેલ",
        gender: "Male", birth_date: new Date("1985-03-15"),
        mobile_number: 9123456780, email: "nilesh.patel@example.com",
        joining_date: new Date("2015-06-20"), employment_status: "Permanent",
        aadhar_no: 123456789012, religion: "Hindu", religion_in_guj: "હિંદુ",
        caste: "Patel", caste_in_guj: "પટેલ", category: "OPEN",
        address: "123 Main Street", district: "Ahmedabad", city: "Ahmedabad",
        state: "Gujarat", postal_code: 380001, bank_name: "State Bank of India",
        account_no: 1234567890, IFSC_code: "SBIN0001234",
        is_teching_staff: false, employee_code: "342"
      },
      {
        id: 6, school_id: 1, staff_role_id: 4,
        first_name: "Rita", middle_name: "Kiran", last_name: "Desai",
        first_name_in_guj: "રીતા", middle_name_in_guj: "કિરણ", last_name_in_guj: "દેસાઈ",
        gender: "Female", birth_date: new Date("1992-05-10"),
        mobile_number: 9898981234, email: "rita.desai@example.com",
        joining_date: new Date("2019-09-15"), employment_status: "Trial_Period",
        aadhar_no: 234567890123, religion: "Jain", religion_in_guj: "જૈન",
        caste: "Desai", caste_in_guj: "દેસાઈ", category: "OPEN",
        address: "456 Park Lane", district: "Surat", city: "Surat",
        state: "Gujarat", postal_code: 395003, bank_name: "HDFC Bank",
        account_no: 2345678901, IFSC_code: "HDFC0002345",
        is_teching_staff: false, qualification: null, employee_code: "1556"
      },
      {
        id: 7, school_id: 1, staff_role_id: 5,
        first_name: "Manoj", middle_name: "Ramesh", last_name: "Sharma",
        first_name_in_guj: "મનોજ", middle_name_in_guj: "રમેશ", last_name_in_guj: "શર્મા",
        gender: "Male", birth_date: new Date("1988-08-22"),
        mobile_number: 9876543210, email: "manoj.sharma@example.com",
        joining_date: new Date("2017-02-11"), employment_status: "Contract_Based",
        aadhar_no: 345678901234, religion: "Hindu", religion_in_guj: "હિંદુ",
        caste: "Sharma", caste_in_guj: "શર્મા", category: "OPEN",
        address: "789 Market Road", district: "Vadodara", city: "Vadodara",
        state: "Gujarat", postal_code: 390001, bank_name: "ICICI Bank",
        account_no: 3456789012, IFSC_code: "ICIC0003456",
        is_teching_staff: false, qualification: null, employee_code: "245efdj"
      },
      {
        id: 8, school_id: 1, staff_role_id: 6,
        first_name: "Bhavesh", middle_name: "Mohan", last_name: "Thakur",
        first_name_in_guj: "ભવેશ", middle_name_in_guj: "મોહન", last_name_in_guj: "ઠાકુર",
        gender: "Male", birth_date: new Date("1990-12-05"),
        mobile_number: 9999999999, email: "bhavesh.thakur@example.com",
        joining_date: new Date("2020-11-01"), employment_status: "Permanent",
        aadhar_no: 456789012345, religion: "Hindu", religion_in_guj: "હિંદુ",
        caste: "Thakur", caste_in_guj: "ઠાકુર", category: "OBC",
        address: "101 Village Road", district: "Rajkot", city: "Rajkot",
        state: "Gujarat", postal_code: 360001, bank_name: "Axis Bank",
        account_no: 4567890123, IFSC_code: "UTIB0004567",
        is_teching_staff: false, qualification: null, employee_code: "3"
      },
    ]

    for (const staff of staffList) {
      await Staff.updateOrCreate({ id: staff.id }, staff)
    }
  }
}