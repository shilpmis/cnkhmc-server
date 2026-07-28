import StudentMeta from '#models/StudentMeta'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const metas = [
      {
        id: 1, student_id: 1, aadhar_dise_no: 123456789015,
        birth_place: "Bhavnagar", birth_place_in_guj: "ભાવનગર",
        religion: "Hindu", religion_in_guj: "હિંદુ",
        caste: "Brahmin", caste_in_guj: "બ્રાહ્મણ", category: "OPEN",
        admission_date: new Date("2023-07-10"), admission_class_id: 1,
        secondary_mobile: 9876543216, privious_school: "Nalanda Academy",
        privious_school_in_guj: "નાલંદા એકેડેમી", address: "Bhavnagar, Gujarat",
        district: "Bhavnagar", city: "Bhavnagar", state: "Gujarat",
        postal_code: "364002", bank_name: "Axis Bank",
        account_no: 1234567893, IFSC_code: "AXIS0001234"
      },
      {
        id: 2, student_id: 2, aadhar_dise_no: 123456789016,
        birth_place: "Rajkot", birth_place_in_guj: "રાજકોટ",
        religion: "Hindu", religion_in_guj: "હિંદુ",
        caste: "Desai", caste_in_guj: "દેસાઈ", category: "OPEN",
        admission_date: new Date("2021-06-12"), admission_class_id: 1,
        secondary_mobile: 9876543217, privious_school: "Bright Academy",
        privious_school_in_guj: "બ્રાઇટ એકેડેમી", address: "Rajkot, Gujarat",
        district: "Rajkot", city: "Rajkot", state: "Gujarat",
        postal_code: "360001", bank_name: "Kotak Mahindra Bank",
        account_no: 1234567894, IFSC_code: "KOTAK0001234"
      },
      {
        id: 3, student_id: 3, aadhar_dise_no: 123456789017,
        birth_place: "Jamnagar", birth_place_in_guj: "જામનગર",
        religion: "Hindu", religion_in_guj: "હિંદુ",
        caste: "Joshi", caste_in_guj: "જોશી", category: "OPEN",
        admission_date: new Date("2022-05-08"), admission_class_id: 1,
        secondary_mobile: 9876543218, privious_school: "Sunbeam School",
        privious_school_in_guj: "સનબીમ સ્કૂલ", address: "Jamnagar, Gujarat",
        district: "Jamnagar", city: "Jamnagar", state: "Gujarat",
        postal_code: "361001", bank_name: "Punjab National Bank",
        account_no: 1234567895, IFSC_code: "PNB0001234"
      },
      {
        id: 4, student_id: 4, aadhar_dise_no: 123456789034,
        birth_place: "Bhuj", birth_place_in_guj: "ભુજ",
        religion: "Hindu", religion_in_guj: "હિંદુ",
        caste: "Kapadia", caste_in_guj: "કાપડિયા", category: "OPEN",
        admission_date: new Date("2020-07-05"), admission_class_id: 1,
        secondary_mobile: 9876543245, privious_school: "Global International",
        privious_school_in_guj: "ગ્લોબલ ઇન્ટરનેશનલ", address: "Bhuj, Gujarat",
        district: "Bhuj", city: "Bhuj", state: "Gujarat",
        postal_code: "370001", bank_name: "Bank of Baroda",
        account_no: 1234567845, IFSC_code: "BARB0001252"
      },
    ] as any[]

    for (const meta of metas) {
      await StudentMeta.updateOrCreate({ id: meta.id }, meta)
    }
  }
}
