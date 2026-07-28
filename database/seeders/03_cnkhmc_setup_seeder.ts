import Department from '#models/Department'
import Subjects from '#models/Subjects'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    // 1. Create BHMS Subjects
    const subjectsData = [
      // 1st Year
      { name: 'Anatomy (1st Year)', code: 'ANAT-1', academic_year: 2025, description: 'Anatomy Department Subject', status: 'Active' as const, year: '1st Year' },
      { name: 'Physiology (1st Year)', code: 'PHYS-1', academic_year: 2025, description: 'Physiology Department Subject', status: 'Active' as const, year: '1st Year' },
      { name: 'Homoeopathic Pharmacy (1st Year)', code: 'PHAR-1', academic_year: 2025, description: 'Homoeopathic Pharmacy Department Subject', status: 'Active' as const, year: '1st Year' },
      
      // 2nd Year
      { name: 'Pathology & Microbiology (2nd Year)', code: 'PATH-2', academic_year: 2025, description: 'Pathology & Microbiology Department Subject', status: 'Active' as const, year: '2nd Year' },
      { name: 'Forensic Medicine & Toxicology (2nd Year)', code: 'FMT-2', academic_year: 2025, description: 'Forensic Medicine & Toxicology Department Subject', status: 'Active' as const, year: '2nd Year' },
      { name: 'Organon of Medicine (2nd Year)', code: 'ORGM-2', academic_year: 2025, description: 'Organon of Medicine Department Subject', status: 'Active' as const, year: '2nd Year' },
      { name: 'Homoeopathic Materia Medica (2nd Year)', code: 'HMM-2', academic_year: 2025, description: 'Homoeopathic Materia Medica Department Subject', status: 'Active' as const, year: '2nd Year' },
      
      // 3rd Year
      { name: 'Surgery (3rd Year)', code: 'SURG-3', academic_year: 2025, description: 'Surgery Department Subject', status: 'Active' as const, year: '3rd Year' },
      { name: 'Gynaecology & Obstetrics (3rd Year)', code: 'OBG-3', academic_year: 2025, description: 'Gynaecology & Obstetrics Department Subject', status: 'Active' as const, year: '3rd Year' },
      { name: 'Organon of Medicine (3rd Year)', code: 'ORGM-3', academic_year: 2025, description: 'Organon of Medicine Department Subject', status: 'Active' as const, year: '3rd Year' },
      { name: 'Homoeopathic Materia Medica (3rd Year)', code: 'HMM-3', academic_year: 2025, description: 'Homoeopathic Materia Medica Department Subject', status: 'Active' as const, year: '3rd Year' },
      
      // 4th Year
      { name: 'Practice of Medicine (4th Year)', code: 'MED-4', academic_year: 2025, description: 'Practice of Medicine Department Subject', status: 'Active' as const, year: '4th Year' },
      { name: 'Repertory (4th Year)', code: 'REP-4', academic_year: 2025, description: 'Repertory Department Subject', status: 'Active' as const, year: '4th Year' },
      { name: 'Community Medicine (4th Year)', code: 'CMED-4', academic_year: 2025, description: 'Community Medicine Department Subject', status: 'Active' as const, year: '4th Year' },
      { name: 'Organon of Medicine (4th Year)', code: 'ORGM-4', academic_year: 2025, description: 'Organon of Medicine Department Subject', status: 'Active' as const, year: '4th Year' },
      { name: 'Homoeopathic Materia Medica (4th Year)', code: 'HMM-4', academic_year: 2025, description: 'Homoeopathic Materia Medica Department Subject', status: 'Active' as const, year: '4th Year' },
    ]

    await Subjects.createMany(subjectsData)

    // 2. Create BHMS Departments aligned with Subjects
    const departmentsData = [
      { name: 'Anatomy', code: 'ANAT', entity_id: 1, subjects: ['Anatomy'] },
      { name: 'Physiology', code: 'PHYS', entity_id: 1, subjects: ['Physiology'] },
      { name: 'Homoeopathic Pharmacy', code: 'PHAR', entity_id: 1, subjects: ['Homoeopathic Pharmacy'] },
      { name: 'Pathology & Microbiology', code: 'PATH', entity_id: 1, subjects: ['Pathology & Microbiology'] },
      { name: 'Forensic Medicine & Toxicology', code: 'FMT', entity_id: 1, subjects: ['Forensic Medicine & Toxicology'] },
      { name: 'Organon of Medicine', code: 'ORGM', entity_id: 1, subjects: ['Organon of Medicine'] },
      { name: 'Homoeopathic Materia Medica', code: 'HMM', entity_id: 1, subjects: ['Homoeopathic Materia Medica'] },
      { name: 'Surgery', code: 'SURG', entity_id: 1, subjects: ['Surgery'] },
      { name: 'Gynaecology & Obstetrics', code: 'OBG', entity_id: 1, subjects: ['Gynaecology & Obstetrics'] },
      { name: 'Practice of Medicine', code: 'MED', entity_id: 1, subjects: ['Practice of Medicine'] },
      { name: 'Repertory', code: 'REP', entity_id: 1, subjects: ['Repertory'] },
      { name: 'Community Medicine', code: 'CMED', entity_id: 1, subjects: ['Community Medicine'] },
    ]

    await Department.createMany(departmentsData)
  }
}
