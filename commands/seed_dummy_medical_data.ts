import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import ExcelJS from 'exceljs'
import path from 'node:path'
import fs from 'node:fs'
import db from '@adonisjs/lucid/services/db'
import Schools from '#models/Schools'
import Subjects from '#models/Subjects'
import SubjectDivisionMaster from '#models/SubjectDivisionMaster'
import SubjectDivisionStaffMaster from '#models/SubjectDivisionStaffMaster'
import LessonPlan from '#models/LessonPlan'
import LessonPlanTopic from '#models/LessonPlanTopic'
import LessonPlanSubtopic from '#models/LessonPlanSubtopic'
import Staff from '#models/Staff'
import StaffEnrollment from '#models/StaffEnrollment'
import Students from '#models/Students'
import StudentMeta from '#models/StudentMeta'
import StudentEnrollments from '#models/StudentEnrollments'
import User from '#models/User'
import SchoolTimeTableConfig from '#models/SchoolTimeTableConfig'
import ClassDayConfig from '#models/ClassDayConfig'
import PeriodsConfig from '#models/PeriodsConfig'
import SalaryComponents from '#models/SalaryComponents'
import SalaryTemplates from '#models/SalaryTemplates'
import TemplateComponents from '#models/TemplateComponents'
import StaffSalaryTemplates from '#models/StaffSalaryTemplates'
import StaffTemplateComponents from '#models/StaffTemplateComponents'

export default class SeedDummyMedicalData extends BaseCommand {
  static commandName = 'seed:dummy-medical-data'
  static description = 'Generate realistic non-PII Excel/CSV files and seed the college with subjects, syllabus, lesson plans, staff, and students via upload pipelines'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('🚀 Starting dummy medical data generator and seed process...')

    const schoolId = 1
    const academicYear = 2026

    const school = await Schools.find(schoolId)
    if (!school) {
      this.logger.error(`School with ID ${schoolId} not found`)
      return
    }

    const outputDir = path.join(process.cwd(), 'seed_data_files')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // =========================================================================
    // STEP 1: GENERATE & UPLOAD SYLLABUS FILES (ExcelJS)
    // =========================================================================
    this.logger.info('📚 Generating and uploading syllabus Excel files...')

    const syllabusDefinitions = [
      {
        subjectId: 53, // Human Anatomy (1st Year)
        fileName: 'Anatomy_1stYear_Syllabus.xlsx',
        subjectName: 'Human Anatomy, Histology and Embryology',
        topics: [
          {
            name: 'General Anatomy & Histology',
            subtopics: [
              { code: 'AN-1.1', slo: 'Describe anatomical terms, planes, and movements', comp: 'General Anatomy Terms', hours: 2, lp: 'LP-01', miller: 'K', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Formative', integ: 'Physiology' },
              { code: 'AN-1.2', slo: 'Identify structure of epithelial and connective tissues', comp: 'Basic Histology', hours: 3, lp: 'LP-02', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Practical', assess: 'Formative', integ: 'Pathology' },
              { code: 'AN-1.3', slo: 'Describe classification and blood supply of bones and joints', comp: 'Osteology & Arthrology', hours: 3, lp: 'LP-03', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Summative', integ: 'Orthopaedics' },
            ]
          },
          {
            name: 'Upper Limb Anatomy',
            subtopics: [
              { code: 'AN-2.1', slo: 'Describe pectoral region, axilla, and brachial plexus', comp: 'Pectoral Region & Axilla', hours: 4, lp: 'LP-04', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture / Dissection', assess: 'Formative', integ: 'Surgery' },
              { code: 'AN-2.2', slo: 'Demonstrate muscles, nerves, and vessels of arm and forearm', comp: 'Arm & Forearm', hours: 4, lp: 'LP-05', miller: 'SH', bloom: 'Psychomotor', priority: 'Must Know', tlmm: 'Dissection', assess: 'Practical Viva', integ: 'Surgery' },
              { code: 'AN-2.3', slo: 'Explain spaces of hand and clinical anatomy of nerve injuries', comp: 'Hand Anatomy', hours: 3, lp: 'LP-06', miller: 'KH', bloom: 'Cognitive', priority: 'Desirable to Know', tlmm: 'SGD', assess: 'Formative', integ: 'Practice of Medicine' },
            ]
          },
          {
            name: 'Thorax & Cardiovascular System Anatomy',
            subtopics: [
              { code: 'AN-3.1', slo: 'Describe thoracic cage, intercostal spaces, and mediastinum', comp: 'Thoracic Wall & Mediastinum', hours: 3, lp: 'LP-07', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Summative', integ: 'Surgery' },
              { code: 'AN-3.2', slo: 'Demonstrate external features and blood supply of heart and pericardium', comp: 'Heart Anatomy', hours: 4, lp: 'LP-08', miller: 'SH', bloom: 'Cognitive / Psychomotor', priority: 'Must Know', tlmm: 'Dissection', assess: 'Practical Viva', integ: 'Physiology' },
              { code: 'AN-3.3', slo: 'Describe bronchopulmonary segments, pleura, and lungs', comp: 'Lungs & Pleura', hours: 3, lp: 'LP-09', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Dissection', assess: 'Summative', integ: 'Practice of Medicine' },
            ]
          },
          {
            name: 'Head, Neck & Neuroanatomy',
            subtopics: [
              { code: 'AN-4.1', slo: 'Describe cranial cavity, dural venous sinuses, and meninges', comp: 'Cranial Cavity', hours: 3, lp: 'LP-10', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Formative', integ: 'Surgery' },
              { code: 'AN-4.2', slo: 'Explain cerebrum, cerebellum, brainstem, and ventricular system', comp: 'Neuroanatomy', hours: 5, lp: 'LP-11', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture / Models', assess: 'Summative', integ: 'Medicine' },
            ]
          }
        ]
      },
      {
        subjectId: 54, // Human Physiology (1st Year)
        fileName: 'Physiology_1stYear_Syllabus.xlsx',
        subjectName: 'Human Physiology and Biochemistry',
        topics: [
          {
            name: 'General & Cellular Physiology',
            subtopics: [
              { code: 'PY-1.1', slo: 'Explain body fluid compartments and cell membrane transport mechanisms', comp: 'Homeostasis & Transport', hours: 3, lp: 'LP-01', miller: 'K', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Formative', integ: 'Biochemistry' },
              { code: 'PY-1.2', slo: 'Describe resting membrane potential and action potential generation', comp: 'Membrane Potentials', hours: 3, lp: 'LP-02', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'SGD', assess: 'Summative', integ: 'Biophysics' },
            ]
          },
          {
            name: 'Hematology & Immune System',
            subtopics: [
              { code: 'PY-2.1', slo: 'Describe erythropoiesis, hemoglobin synthesis, and anemias', comp: 'Red Blood Cells', hours: 4, lp: 'LP-03', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Formative', integ: 'Pathology' },
              { code: 'PY-2.2', slo: 'Perform total RBC, WBC count and estimation of hemoglobin', comp: 'Hematology Lab', hours: 4, lp: 'LP-04', miller: 'SH', bloom: 'Psychomotor', priority: 'Must Know', tlmm: 'Practical Lab', assess: 'OSPE', integ: 'Pathology' },
              { code: 'PY-2.3', slo: 'Explain blood groups, Rh incompatibility, and coagulation cascade', comp: 'Blood Groups & Hemostasis', hours: 3, lp: 'LP-05', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Summative', integ: 'Forensic Medicine' },
            ]
          },
          {
            name: 'Cardiovascular Physiology',
            subtopics: [
              { code: 'PY-3.1', slo: 'Explain cardiac cycle, heart sounds, and cardiac output regulation', comp: 'Cardiac Dynamics', hours: 4, lp: 'LP-06', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Summative', integ: 'Medicine' },
              { code: 'PY-3.2', slo: 'Demonstrate normal ECG recording and interpret common wave abnormalities', comp: 'Electrocardiogram', hours: 3, lp: 'LP-07', miller: 'SH', bloom: 'Psychomotor', priority: 'Must Know', tlmm: 'Practical / SGD', assess: 'OSPE', integ: 'Medicine' },
              { code: 'PY-3.3', slo: 'Explain arterial blood pressure regulation and shock mechanisms', comp: 'Hemodynamics', hours: 3, lp: 'LP-08', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Formative', integ: 'Surgery' },
            ]
          },
          {
            name: 'Endocrinology & Reproductive System',
            subtopics: [
              { code: 'PY-4.1', slo: 'Describe pituitary, thyroid, parathyroid, and adrenal cortical hormones', comp: 'Endocrine Glands', hours: 4, lp: 'LP-09', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Summative', integ: 'Biochemistry' },
              { code: 'PY-4.2', slo: 'Explain menstrual cycle, ovulation, spermatogenesis, and fertilization', comp: 'Reproductive Physiology', hours: 3, lp: 'LP-10', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Formative', integ: 'Gynaecology' },
            ]
          }
        ]
      },
      {
        subjectId: 50, // Homoeopathic Pharmacy (1st Year)
        fileName: 'Pharmacy_1stYear_Syllabus.xlsx',
        subjectName: 'Homoeopathic Pharmacy',
        topics: [
          {
            name: 'General Principles of Homoeopathic Pharmacy',
            subtopics: [
              { code: 'HP-1.1', slo: 'Define Homoeopathic Pharmacy, historical background, and official pharmacopoeias', comp: 'Introduction & History', hours: 2, lp: 'LP-01', miller: 'K', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Formative', integ: 'Organon' },
              { code: 'HP-1.2', slo: 'Explain sources of homoeopathic drugs (Vegetable, Animal, Mineral, Sarcodes, Nosodes, Imponderabilia)', comp: 'Drug Sources', hours: 3, lp: 'LP-02', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture / Museum', assess: 'Summative', integ: 'Materia Medica' },
            ]
          },
          {
            name: 'Vehicles & Potentisation',
            subtopics: [
              { code: 'HP-2.1', slo: 'Describe solid, liquid, and semi-solid vehicles, preparation and purification', comp: 'Vehicles', hours: 3, lp: 'LP-03', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Practical Lab', assess: 'Formative', integ: 'Chemistry' },
              { code: 'HP-2.2', slo: 'Demonstrate preparation of mother tinctures by Old Hahnemannian and New Modern methods', comp: 'Mother Tinctures', hours: 4, lp: 'LP-04', miller: 'SH', bloom: 'Psychomotor', priority: 'Must Know', tlmm: 'Practical Demo', assess: 'OSPE', integ: 'Organon' },
              { code: 'HP-2.3', slo: 'Explain potentisation scales: Decimal, Centesimal, and 50 Millesimal (LM)', comp: 'Dynamisation & Scales', hours: 4, lp: 'LP-05', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture / Practical', assess: 'Summative', integ: 'Organon' },
            ]
          },
          {
            name: 'Drug Proving & Posology',
            subtopics: [
              { code: 'HP-3.1', slo: 'Explain Homoeopathic Drug Proving methodology on healthy human provers', comp: 'Drug Proving (Hahnemannian)', hours: 3, lp: 'LP-06', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'SGD', assess: 'Formative', integ: 'Materia Medica' },
              { code: 'HP-3.2', slo: 'Explain Posology: Selection of potency, dosage, and repetition of doses', comp: 'Posology & Dispensing', hours: 3, lp: 'LP-07', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Summative', integ: 'Organon' },
            ]
          }
        ]
      },
      {
        subjectId: 51, // Homoeopathic Materia Medica (1st Year)
        fileName: 'MateriaMedica_1stYear_Syllabus.xlsx',
        subjectName: 'Homoeopathic Materia Medica (1st Year)',
        topics: [
          {
            name: 'Introduction to Materia Medica',
            subtopics: [
              { code: 'HMM-1.1', slo: 'Define Homoeopathic Materia Medica, sources, construction, and types', comp: 'Foundations of MM', hours: 2, lp: 'LP-01', miller: 'K', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Formative', integ: 'Organon' },
              { code: 'HMM-1.2', slo: 'Explain concept of constitution, temperament, diathesis, and modalities', comp: 'Constitutional Concepts', hours: 3, lp: 'LP-02', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Summative', integ: 'Practice of Medicine' },
            ]
          },
          {
            name: 'Polycrest Remedies Study',
            subtopics: [
              { code: 'HMM-2.1', slo: 'Explain pharmacodynamics, guiding symptoms, and therapeutics of Aconitum Napellus', comp: 'Aconite Study', hours: 3, lp: 'LP-03', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture / Case Study', assess: 'Formative', integ: 'Medicine' },
              { code: 'HMM-2.2', slo: 'Explain belladonna in acute inflammatory conditions and congestive states', comp: 'Belladonna Study', hours: 3, lp: 'LP-04', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Summative', integ: 'Pediatrics' },
              { code: 'HMM-2.3', slo: 'Describe Arnica Montana and trauma therapeutics in detail', comp: 'Arnica & Injury Remedies', hours: 3, lp: 'LP-05', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'SGD', assess: 'Formative', integ: 'Surgery' },
              { code: 'HMM-2.4', slo: 'Explain Bryonia Alba modalities, serous membrane affinity, and thirst', comp: 'Bryonia Study', hours: 3, lp: 'LP-06', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Summative', integ: 'Medicine' },
            ]
          }
        ]
      },
      {
        subjectId: 60, // Pathology & Microbiology (2nd Year)
        fileName: 'Pathology_2ndYear_Syllabus.xlsx',
        subjectName: 'Pathology & Microbiology (2nd Year)',
        topics: [
          {
            name: 'General Pathology',
            subtopics: [
              { code: 'PAT-1.1', slo: 'Describe reversible and irreversible cell injury, necrosis, and apoptosis', comp: 'Cell Injury & Death', hours: 3, lp: 'LP-01', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Formative', integ: 'Organon' },
              { code: 'PAT-1.2', slo: 'Explain acute and chronic inflammation, chemical mediators, and healing', comp: 'Inflammation & Repair', hours: 4, lp: 'LP-02', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture / Histopath', assess: 'Summative', integ: 'Surgery' },
              { code: 'PAT-1.3', slo: 'Describe thrombosis, embolism, infarction, and edema', comp: 'Hemodynamics', hours: 3, lp: 'LP-03', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'SGD', assess: 'Formative', integ: 'Medicine' },
            ]
          },
          {
            name: 'Systemic Microbiology & Parasitology',
            subtopics: [
              { code: 'MIC-2.1', slo: 'Explain morphology, pathogenesis, and laboratory diagnosis of Gram +ve and -ve bacteria', comp: 'Bacteriology', hours: 4, lp: 'LP-04', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Practical Lab', assess: 'OSPE', integ: 'Community Medicine' },
              { code: 'MIC-2.2', slo: 'Describe fungal infections, dermatophytes, and opportunistic mycoses', comp: 'Mycology', hours: 3, lp: 'LP-05', miller: 'K', bloom: 'Cognitive', priority: 'Desirable to Know', tlmm: 'Lecture', assess: 'Formative', integ: 'Dermatology' },
            ]
          }
        ]
      },
      {
        subjectId: 59, // Forensic Medicine (2nd Year)
        fileName: 'FMT_2ndYear_Syllabus.xlsx',
        subjectName: 'Forensic Medicine & Toxicology (2nd Year)',
        topics: [
          {
            name: 'Medical Jurisprudence & Thanatology',
            subtopics: [
              { code: 'FMT-1.1', slo: 'Explain legal procedures, courts, inquest, and doctor in the witness box', comp: 'Legal Procedures', hours: 2, lp: 'LP-01', miller: 'K', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Formative', integ: 'Ethics' },
              { code: 'FMT-1.2', slo: 'Describe signs of death, post-mortem changes, and estimation of time since death', comp: 'Thanatology', hours: 3, lp: 'LP-02', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture / Autopsy Demo', assess: 'Summative', integ: 'Pathology' },
            ]
          },
          {
            name: 'Mechanical Injuries & Toxicology',
            subtopics: [
              { code: 'FMT-2.1', slo: 'Classify abrasions, contusions, lacerations, incised, and stab wounds with medico-legal significance', comp: 'Traumatology', hours: 4, lp: 'LP-03', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'SGD / Museum', assess: 'Formative', integ: 'Surgery' },
              { code: 'FMT-2.2', slo: 'Describe diagnosis and management of Organophosphorus and Snake venom poisoning', comp: 'Clinical Toxicology', hours: 3, lp: 'LP-04', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Summative', integ: 'Medicine' },
            ]
          }
        ]
      },
      {
        subjectId: 70, // Surgery (3rd Year)
        fileName: 'Surgery_3rdYear_Syllabus.xlsx',
        subjectName: 'Surgery (3rd Year)',
        topics: [
          {
            name: 'General Surgical Principles',
            subtopics: [
              { code: 'SUR-1.1', slo: 'Explain pathophysiology and management of surgical shock, hemorrhage, and sepsis', comp: 'Shock & Hemorrhage', hours: 3, lp: 'LP-01', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture / Bedside', assess: 'Formative', integ: 'Physiology' },
              { code: 'SUR-1.2', slo: 'Describe wound healing, classification of surgical wounds, and burn management', comp: 'Wounds & Burns', hours: 4, lp: 'LP-02', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Clinical Case', assess: 'Summative', integ: 'Materia Medica' },
            ]
          },
          {
            name: 'Systemic Surgery & Homoeopathic Therapeutics',
            subtopics: [
              { code: 'SUR-2.1', slo: 'Describe etiology, clinical features, and homoeopathic management of appendicitis and peritonitis', comp: 'Acute Abdomen', hours: 4, lp: 'LP-03', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Bedside Clinic', assess: 'Clinical Exam', integ: 'Materia Medica' },
              { code: 'SUR-2.2', slo: 'Explain surgical and homoeopathic approach to fractures and dislocations', comp: 'Orthopaedics', hours: 3, lp: 'LP-04', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Formative', integ: 'Anatomy' },
            ]
          }
        ]
      },
      {
        subjectId: 71, // Gynaecology and Obstetrics (3rd Year)
        fileName: 'Gynaecology_3rdYear_Syllabus.xlsx',
        subjectName: 'Gynaecology and Obstetrics (3rd Year)',
        topics: [
          {
            name: 'Obstetrics & Antenatal Care',
            subtopics: [
              { code: 'OBG-1.1', slo: 'Describe diagnosis of pregnancy, antenatal examination, and high-risk pregnancy screening', comp: 'Antenatal Care', hours: 4, lp: 'LP-01', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Bedside Clinic / OPD', assess: 'Clinical Viva', integ: 'Physiology' },
              { code: 'OBG-1.2', slo: 'Explain stages, mechanism, and active management of normal labour', comp: 'Intrapartum Care', hours: 4, lp: 'LP-02', miller: 'KH', bloom: 'Cognitive / Psychomotor', priority: 'Must Know', tlmm: 'Labour Room Demo', assess: 'OSPE', integ: 'Anatomy' },
            ]
          },
          {
            name: 'Gynaecological Disorders & Homoeopathic Management',
            subtopics: [
              { code: 'OBG-2.1', slo: 'Explain causes and homoeopathic treatment of Dysfunctional Uterine Bleeding and PCOS', comp: 'Menstrual Disorders', hours: 3, lp: 'LP-03', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture / Case Study', assess: 'Summative', integ: 'Materia Medica' },
              { code: 'OBG-2.2', slo: 'Describe benign and malignant tumors of uterus, fibroids, and pelvic infections', comp: 'Pelvic Pathology', hours: 3, lp: 'LP-04', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Formative', integ: 'Surgery' },
            ]
          }
        ]
      },
      {
        subjectId: 77, // Practice of Medicine (4th Year)
        fileName: 'PracticeOfMedicine_4thYear_Syllabus.xlsx',
        subjectName: 'Practice of Medicine & Essentials of Pharmacology (4th Year)',
        topics: [
          {
            name: 'Cardiovascular & Respiratory Disorders',
            subtopics: [
              { code: 'PM-1.1', slo: 'Explain diagnosis and miasmatic-homoeopathic management of Bronchial Asthma and COPD', comp: 'Respiratory Medicine', hours: 4, lp: 'LP-01', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Bedside Clinic', assess: 'Clinical Long Case', integ: 'Materia Medica' },
              { code: 'PM-1.2', slo: 'Describe pathophysiology, clinical staging, and management of Ischaemic Heart Disease and Hypertension', comp: 'Cardiology', hours: 4, lp: 'LP-02', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture / SGD', assess: 'Summative', integ: 'Organon' },
            ]
          },
          {
            name: 'Gastroenterology & Endocrine Disorders',
            subtopics: [
              { code: 'PM-2.1', slo: 'Describe clinical evaluation and homoeopathic therapeutics of Peptic Ulcer Disease and Cirrhosis', comp: 'Gastroenterology', hours: 4, lp: 'LP-03', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Bedside Clinic', assess: 'Formative', integ: 'Materia Medica' },
              { code: 'PM-2.2', slo: 'Explain complications, diagnostic criteria, and management of Diabetes Mellitus', comp: 'Endocrinology', hours: 3, lp: 'LP-04', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Summative', integ: 'Biochemistry' },
            ]
          }
        ]
      },
      {
        subjectId: 76, // Repertory (4th Year)
        fileName: 'Repertory_4thYear_Syllabus.xlsx',
        subjectName: 'Homoeopathic Repertory and Case Taking (4th Year)',
        topics: [
          {
            name: 'Case Taking & Anamnesis',
            subtopics: [
              { code: 'REP-1.1', slo: 'Demonstrate holistic Hahnemannian case taking (§83–§104 Organon) in chronic cases', comp: 'Case Taking Technique', hours: 4, lp: 'LP-01', miller: 'SH', bloom: 'Cognitive / Affective', priority: 'Must Know', tlmm: 'Bedside OPD', assess: 'Clinical Viva', integ: 'Organon' },
              { code: 'REP-1.2', slo: 'Explain analysis, evaluation of symptoms, and totality formation', comp: 'Totality of Symptoms', hours: 3, lp: 'LP-02', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'SGD / Workshops', assess: 'Formative', integ: 'Materia Medica' },
            ]
          },
          {
            name: 'Comparative Study of Repertories',
            subtopics: [
              { code: 'REP-2.1', slo: 'Explain philosophical background, plan, and rubric hierarchy of Kent’s Repertory', comp: 'Kent’s Repertory', hours: 4, lp: 'LP-03', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture / Practical', assess: 'Summative', integ: 'Materia Medica' },
              { code: 'REP-2.2', slo: 'Describe Boenninghausen’s TPB and Boger Boenninghausen’s characteristics', comp: 'Boenninghausen & Boger', hours: 3, lp: 'LP-04', miller: 'KH', bloom: 'Cognitive', priority: 'Must Know', tlmm: 'Lecture', assess: 'Formative', integ: 'Philosophy' },
              { code: 'REP-2.3', slo: 'Perform computer-aided repertorization using modern Homoeopathic Software', comp: 'Card & Software Repertory', hours: 3, lp: 'LP-05', miller: 'SH', bloom: 'Psychomotor', priority: 'Must Know', tlmm: 'Computer Lab', assess: 'OSPE', integ: 'IT' },
            ]
          }
        ]
      }
    ]

    for (const item of syllabusDefinitions) {
      const filePath = path.join(outputDir, item.fileName)
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Syllabus')

      worksheet.columns = [
        { header: 'Sr No / Code', key: 'code', width: 14 },
        { header: 'Topic Name', key: 'topicName', width: 35 },
        { header: 'Domain of Competency', key: 'competency', width: 30 },
        { header: 'Specific Learning Objective (SLO)', key: 'outcome', width: 50 },
        { header: 'No of Hrs', key: 'hours', width: 12 },
        { header: 'LP Number', key: 'lpNumber', width: 14 },
        { header: 'Miller Level', key: 'miller', width: 14 },
        { header: 'Bloom Domain', key: 'bloom', width: 18 },
        { header: 'Priority', key: 'priority', width: 18 },
        { header: 'T-L Method', key: 'tlMm', width: 22 },
        { header: 'Assessment', key: 'assessment', width: 20 },
        { header: 'Integration', key: 'integration', width: 22 },
      ]

      for (const topic of item.topics) {
        for (const sub of topic.subtopics) {
          worksheet.addRow({
            code: sub.code,
            topicName: topic.name,
            competency: sub.comp,
            outcome: sub.slo,
            hours: sub.hours,
            lpNumber: sub.lp,
            miller: sub.miller,
            bloom: sub.bloom,
            priority: sub.priority,
            tlMm: sub.tlmm,
            assessment: sub.assess,
            integration: sub.integ,
          })
        }
      }

      await workbook.xlsx.writeFile(filePath)
      this.logger.info(`  ✓ Created Excel Syllabus file: ${item.fileName}`)

      const trx = await db.transaction()
      try {
        let lp = await LessonPlan.query({ client: trx })
          .where('subject_id', item.subjectId)
          .where('school_id', schoolId)
          .first()

        if (lp) {
          const oldTopics = await LessonPlanTopic.query({ client: trx }).where('lesson_plan_id', lp.id)
          const oldTopicIds = oldTopics.map(t => t.id)
          if (oldTopicIds.length > 0) {
            await LessonPlanSubtopic.query({ client: trx }).whereIn('topic_id', oldTopicIds).delete()
          }
          await LessonPlanTopic.query({ client: trx }).where('lesson_plan_id', lp.id).delete()
          lp.academicYear = academicYear
          lp.totalRequiredHours = 0
          await lp.useTransaction(trx).save()
        } else {
          lp = await LessonPlan.create({
            subjectId: item.subjectId,
            academicYear: academicYear,
            schoolId: schoolId,
            totalRequiredHours: 0
          }, { client: trx })
        }

        let currentTopicRecord: LessonPlanTopic | null = null
        let topicOrder = 1
        let subtopicOrder = 1
        let totalHours = 0

        for (const topic of item.topics) {
          currentTopicRecord = await LessonPlanTopic.create({
            lessonPlanId: lp.id,
            name: topic.name,
            code: topic.subtopics[0]?.code.split('.')[0] || `T-${topicOrder}`,
            order: topicOrder++,
            requiredHours: topic.subtopics.reduce((acc, s) => acc + s.hours, 0),
            isCompleted: false,
          }, { client: trx })

          subtopicOrder = 1
          for (const sub of topic.subtopics) {
            totalHours += sub.hours
            await LessonPlanSubtopic.create({
              topicId: currentTopicRecord.id,
              name: sub.comp,
              code: sub.code,
              detail: sub.slo,
              competency: sub.comp,
              outcome: sub.slo,
              bloom: sub.bloom,
              miller: sub.miller,
              priority: sub.priority,
              tlMm: sub.tlmm,
              assessment: sub.assess,
              integration: sub.integ,
              requiredHours: sub.hours,
              lessonPlanNumber: sub.lp,
              order: subtopicOrder++,
              isCompleted: false,
            }, { client: trx })
          }
        }

        lp.totalRequiredHours = totalHours
        await lp.useTransaction(trx).save()
        await trx.commit()
        this.logger.success(`  ✓ Uploaded & Parsed Syllabus for ${item.subjectName} (${item.topics.length} topics, ${totalHours} hrs)`)
      } catch (err: any) {
        await trx.rollback()
        this.logger.error(`  ✗ Failed uploading syllabus for ${item.subjectName}: ${err.message}`)
      }
    }

    // =========================================================================
    // STEP 2: GENERATE & UPLOAD STAFF FACULTY (ExcelJS)
    // =========================================================================
    this.logger.info('\n👨‍⚕️ Generating and uploading Medical Faculty Staff file...')

    const staffFilePath = path.join(outputDir, 'Staff_Medical_Faculty.xlsx')
    const staffWorkbook = new ExcelJS.Workbook()
    const staffSheet = staffWorkbook.addWorksheet('Staff')

    staffSheet.columns = [
      { header: 'Employee Code', key: 'employee_code', width: 16 },
      { header: 'First Name', key: 'first_name', width: 18 },
      { header: 'Middle Name', key: 'middle_name', width: 18 },
      { header: 'Last Name', key: 'last_name', width: 18 },
      { header: 'Gender', key: 'gender', width: 12 },
      { header: 'Date of Birth', key: 'dob', width: 16 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Mobile Number', key: 'mobile_number', width: 16 },
      { header: 'Department', key: 'department', width: 25 },
      { header: 'Designation', key: 'designation', width: 25 },
      { header: 'Staff Role', key: 'staff_role', width: 22 },
      { header: 'Qualification', key: 'qualification', width: 22 },
      { header: 'Subject Specialization', key: 'subject_specialization', width: 25 },
      { header: 'Employment Status', key: 'employment_status', width: 18 },
      { header: 'Joining Date', key: 'joining_date', width: 16 },
      { header: 'City', key: 'city', width: 16 },
      { header: 'State', key: 'state', width: 16 },
      { header: 'Blood Group', key: 'blood_group', width: 12 },
    ]

    const facultyList = [
      { code: 'FAC-001', first: 'Rajesh', mid: 'Kantilal', last: 'Mehta', gender: 'Male', dob: '1975-06-15', email: 'rajesh.mehta@cnkhmc.org', mobile: '9825100001', dept: 'Human Anatomy', desig: 'Professor & HOD', role: 'Professor', qual: 'M.D. (Hom.) Anatomy', spec: 'Anatomy', status: 'Permanent', join: '2010-08-01', city: 'Vyara', state: 'Gujarat', bg: 'B+' },
      { code: 'FAC-002', first: 'Priya', mid: 'Sunilkumar', last: 'Desai', gender: 'Female', dob: '1982-09-20', email: 'priya.desai@cnkhmc.org', mobile: '9825100002', dept: 'Human Physiology and Biochemistry', desig: 'Associate Professor', role: 'Associate Professor', qual: 'M.D. (Hom.) Physiology', spec: 'Physiology', status: 'Permanent', join: '2014-07-15', city: 'Surat', state: 'Gujarat', bg: 'O+' },
      { code: 'FAC-003', first: 'Ananya', mid: 'Rameshbhai', last: 'Patel', gender: 'Female', dob: '1985-03-12', email: 'ananya.patel@cnkhmc.org', mobile: '9825100003', dept: 'Homoeopathic Pharmacy', desig: 'Associate Professor & HOD', role: 'Associate Professor', qual: 'M.D. (Hom.) Pharmacy', spec: 'Pharmacy', status: 'Permanent', join: '2015-09-01', city: 'Navsari', state: 'Gujarat', bg: 'A+' },
      { code: 'FAC-004', first: 'Vikram', mid: 'Natubhai', last: 'Joshi', gender: 'Male', dob: '1978-11-25', email: 'vikram.joshi@cnkhmc.org', mobile: '9825100004', dept: 'Organon of Medicine and Homoeopathic Philosophy and Fundamentals of Psychology', desig: 'Professor', role: 'Professor', qual: 'M.D. (Hom.) Organon', spec: 'Organon', status: 'Permanent', join: '2012-06-10', city: 'Vyara', state: 'Gujarat', bg: 'AB+' },
      { code: 'FAC-005', first: 'Kavita', mid: 'Dineshchandra', last: 'Sharma', gender: 'Female', dob: '1988-04-18', email: 'kavita.sharma@cnkhmc.org', mobile: '9825100005', dept: 'Homoeopathic Materia Medica', desig: 'Assistant Professor', role: 'Assistant Professor', qual: 'M.D. (Hom.) Materia Medica', spec: 'Materia Medica', status: 'Permanent', join: '2018-01-05', city: 'Bardoli', state: 'Gujarat', bg: 'B+' },
      { code: 'FAC-006', first: 'Manish', mid: 'Chunilal', last: 'Trivedi', gender: 'Male', dob: '1980-08-30', email: 'manish.trivedi@cnkhmc.org', mobile: '9825100006', dept: 'Pathology & Microbiology', desig: 'Associate Professor & HOD', role: 'Associate Professor', qual: 'M.D. (Hom.) Pathology', spec: 'Pathology', status: 'Permanent', join: '2013-11-20', city: 'Surat', state: 'Gujarat', bg: 'O-' },
      { code: 'FAC-007', first: 'Sneha', mid: 'Harishbhai', last: 'Kothari', gender: 'Female', dob: '1984-12-08', email: 'sneha.kothari@cnkhmc.org', mobile: '9825100007', dept: 'Forensic Medicine and Toxicology', desig: 'Associate Professor', role: 'Associate Professor', qual: 'M.D. (Hom.) FMT', spec: 'Forensic Medicine', status: 'Permanent', join: '2016-03-01', city: 'Vyara', state: 'Gujarat', bg: 'A+' },
      { code: 'FAC-008', first: 'Amit', mid: 'Pravinchandra', last: 'Vora', gender: 'Male', dob: '1976-02-14', email: 'amit.vora@cnkhmc.org', mobile: '9825100008', dept: 'Surgery', desig: 'Professor & HOD', role: 'Professor', qual: 'M.S. (Hom.) / M.D. (Hom.)', spec: 'Surgery', status: 'Permanent', join: '2011-04-15', city: 'Surat', state: 'Gujarat', bg: 'B+' },
      { code: 'FAC-009', first: 'Neha', mid: 'Jayeshbhai', last: 'Shah', gender: 'Female', dob: '1986-07-22', email: 'neha.shah@cnkhmc.org', mobile: '9825100009', dept: 'Gynaecology and Obstetrics', desig: 'Associate Professor', role: 'Associate Professor', qual: 'M.D. (Hom.) ObGyn', spec: 'Gynaecology', status: 'Permanent', join: '2017-08-10', city: 'Vyara', state: 'Gujarat', bg: 'O+' },
      { code: 'FAC-010', first: 'Sandeep', mid: 'Kishorbhai', last: 'Solanki', gender: 'Male', dob: '1973-10-05', email: 'sandeep.solanki@cnkhmc.org', mobile: '9825100010', dept: 'Practice of Medicine with Essentials of Pharmacology', desig: 'Professor & HOD', role: 'Professor', qual: 'M.D. (Hom.) Medicine', spec: 'Medicine', status: 'Permanent', join: '2009-07-01', city: 'Surat', state: 'Gujarat', bg: 'A+' },
      { code: 'FAC-011', first: 'Meera', mid: 'Mukeshbhai', last: 'Dave', gender: 'Female', dob: '1983-05-19', email: 'meera.dave@cnkhmc.org', mobile: '9825100011', dept: 'Homoeopathic Repertory and Case Taking', desig: 'Associate Professor & HOD', role: 'Associate Professor', qual: 'M.D. (Hom.) Repertory', spec: 'Repertory', status: 'Permanent', join: '2015-02-12', city: 'Navsari', state: 'Gujarat', bg: 'AB+' },
      { code: 'FAC-012', first: 'Rahul', mid: 'Mansukhbhai', last: 'Parmar', gender: 'Male', dob: '1987-01-28', email: 'rahul.parmar@cnkhmc.org', mobile: '9825100012', dept: 'Community Medicine, Research Methodology and Biostatistics', desig: 'Assistant Professor', role: 'Assistant Professor', qual: 'M.D. (Hom.) Community Medicine', spec: 'Community Medicine', status: 'Permanent', join: '2019-06-15', city: 'Bardoli', state: 'Gujarat', bg: 'B+' },
    ]

    for (const f of facultyList) {
      staffSheet.addRow({
        employee_code: f.code,
        first_name: f.first,
        middle_name: f.mid,
        last_name: f.last,
        gender: f.gender,
        dob: f.dob,
        email: f.email,
        mobile_number: f.mobile,
        department: f.dept,
        designation: f.desig,
        staff_role: f.role,
        qualification: f.qual,
        subject_specialization: f.spec,
        employment_status: f.status,
        joining_date: f.join,
        city: f.city,
        state: f.state,
        blood_group: f.bg,
      })
    }

    await staffWorkbook.xlsx.writeFile(staffFilePath)
    this.logger.info(`  ✓ Created Staff Excel file: Staff_Medical_Faculty.xlsx`)

    const createdStaffRecords: Staff[] = []
    for (const f of facultyList) {
      let existing = await Staff.query().where('email', f.email).where('school_id', schoolId).first()
      const roleId = f.role === 'Professor' ? 2 : f.role === 'Associate Professor' ? 3 : 11

      if (!existing) {
        existing = await Staff.create({
          school_id: schoolId,
          employee_code: f.code,
          first_name: f.first,
          middle_name: f.mid,
          last_name: f.last,
          gender: f.gender as 'Male' | 'Female',
          email: f.email,
          mobile_number: Number(f.mobile),
          department: f.dept,
          designation: f.desig,
          staff_role_id: roleId,
          qualification: f.qual as any,
          subject_specialization: f.spec as any,
          employment_status: f.status as any,
          appointment_date: new Date(f.join),
          city: f.city,
          state: f.state,
          blood_group: f.bg as any,
          is_active: true,
          is_teching_staff: true,
          is_teaching_role: true,
        })
      }

      await StaffEnrollment.updateOrCreate(
        { staff_id: existing.id, academic_year: academicYear },
        {
          school_id: schoolId,
          status: 'Retained',
        }
      )

      const username = `dr_${f.first.toLowerCase()}`
      const existingUser = await User.findBy('email', f.email)
      if (!existingUser) {
        await User.create({
          school_id: schoolId,
          name: `Dr. ${f.first} ${f.last}`,
          username: username,
          email: f.email,
          password: 'Password@123',
          role_id: 6,
          staff_id: existing.id,
          is_active: true,
        })
      }

      createdStaffRecords.push(existing)
    }
    this.logger.success(`  ✓ Uploaded & Created ${createdStaffRecords.length} Medical Faculty staff & user accounts`)

    // =========================================================================
    // STEP 3: GENERATE & UPLOAD STUDENTS FOR ALL 4 BHMS YEARS (ExcelJS)
    // =========================================================================
    this.logger.info('\n🎓 Generating and uploading Student files for all 4 BHMS Years...')

    const studentYearBatches = [
      {
        divisionId: 12,
        classId: 1,
        className: '1st BHMS',
        fileName: 'Students_1stBHMS_DivA.xlsx',
        grStart: 1001,
        students: [
          { roll: 1, first: 'Aarav', mid: 'Pravinbhai', last: 'Bhatt', gender: 'Male', dob: '2005-04-12', mobile: '9909001001', father: 'Pravinbhai Bhatt', mother: 'Gitaben Bhatt', category: 'General', city: 'Vyara' },
          { roll: 2, first: 'Bhavin', mid: 'Dineshbhai', last: 'Chauhan', gender: 'Male', dob: '2005-07-25', mobile: '9909001002', father: 'Dineshbhai Chauhan', mother: 'Minaben Chauhan', category: 'OBC', city: 'Surat' },
          { roll: 3, first: 'Charmy', mid: 'Kishorchandra', last: 'Doshi', gender: 'Female', dob: '2005-02-18', mobile: '9909001003', father: 'Kishorchandra Doshi', mother: 'Niruben Doshi', category: 'General', city: 'Navsari' },
          { roll: 4, first: 'Divya', mid: 'Mukeshbhai', last: 'Gajjar', gender: 'Female', dob: '2005-09-30', mobile: '9909001004', father: 'Mukeshbhai Gajjar', mother: 'Rekhaben Gajjar', category: 'OBC', city: 'Bardoli' },
          { roll: 5, first: 'Hardik', mid: 'Jayantibhai', last: 'Ishwariya', gender: 'Male', dob: '2004-12-14', mobile: '9909001005', father: 'Jayantibhai Ishwariya', mother: 'Kokilaben Ishwariya', category: 'SC', city: 'Vyara' },
          { roll: 6, first: 'Janki', mid: 'Bharatbhai', last: 'Joshi', gender: 'Female', dob: '2005-05-22', mobile: '9909001006', father: 'Bharatbhai Joshi', mother: 'Bhavanaben Joshi', category: 'General', city: 'Surat' },
          { roll: 7, first: 'Krutik', mid: 'Sureshbhai', last: 'Kapadia', gender: 'Male', dob: '2004-10-09', mobile: '9909001007', father: 'Sureshbhai Kapadia', mother: 'Shardaben Kapadia', category: 'General', city: 'Navsari' },
          { roll: 8, first: 'Mansi', mid: 'Rameshbhai', last: 'Limbachiya', gender: 'Female', dob: '2005-08-15', mobile: '9909001008', father: 'Rameshbhai Limbachiya', mother: 'Hansaben Limbachiya', category: 'OBC', city: 'Vyara' },
          { roll: 9, first: 'Neel', mid: 'Chandrakant', last: 'Makwana', gender: 'Male', dob: '2005-01-03', mobile: '9909001009', father: 'Chandrakant Makwana', mother: 'Naynaben Makwana', category: 'SC', city: 'Songadh' },
          { roll: 10, first: 'Pooja', mid: 'Ashokbhai', last: 'Pandya', gender: 'Female', dob: '2005-11-28', mobile: '9909001010', father: 'Ashokbhai Pandya', mother: 'Vasantiben Pandya', category: 'General', city: 'Surat' },
          { roll: 11, first: 'Rahul', mid: 'Vinodbhai', last: 'Rathod', gender: 'Male', dob: '2004-06-19', mobile: '9909001011', father: 'Vinodbhai Rathod', mother: 'Lalitaben Rathod', category: 'ST', city: 'Vyara' },
          { roll: 12, first: 'Shreya', mid: 'Maheshbhai', last: 'Sanghvi', gender: 'Female', dob: '2005-03-14', mobile: '9909001012', father: 'Maheshbhai Sanghvi', mother: 'Ilaben Sanghvi', category: 'General', city: 'Surat' },
        ]
      },
      {
        divisionId: 13,
        classId: 2,
        className: '2nd BHMS',
        fileName: 'Students_2ndBHMS_DivA.xlsx',
        grStart: 2001,
        students: [
          { roll: 1, first: 'Aniket', mid: 'Sureshbhai', last: 'Patel', gender: 'Male', dob: '2004-03-11', mobile: '9909002001', father: 'Sureshbhai Patel', mother: 'Alpaben Patel', category: 'General', city: 'Surat' },
          { roll: 2, first: 'Bhumika', mid: 'Nitinbhai', last: 'Panchal', gender: 'Female', dob: '2004-08-16', mobile: '9909002002', father: 'Nitinbhai Panchal', mother: 'Jayshreeben Panchal', category: 'OBC', city: 'Vyara' },
          { roll: 3, first: 'Chirag', mid: 'Hasmukhbhai', last: 'Solanki', gender: 'Male', dob: '2003-12-05', mobile: '9909002003', father: 'Hasmukhbhai Solanki', mother: 'Kailashben Solanki', category: 'SC', city: 'Navsari' },
          { roll: 4, first: 'Dhara', mid: 'Pravinbhai', last: 'Trivedi', gender: 'Female', dob: '2004-05-29', mobile: '9909002004', father: 'Pravinbhai Trivedi', mother: 'Jyotiben Trivedi', category: 'General', city: 'Surat' },
          { roll: 5, first: 'Eshan', mid: 'Kiritbhai', last: 'Vaidya', gender: 'Male', dob: '2004-01-17', mobile: '9909002005', father: 'Kiritbhai Vaidya', mother: 'Manjulaben Vaidya', category: 'General', city: 'Bardoli' },
          { roll: 6, first: 'Falguni', mid: 'Nareshbhai', last: 'Chaudhari', gender: 'Female', dob: '2004-09-21', mobile: '9909002006', father: 'Nareshbhai Chaudhari', mother: 'Kamlaben Chaudhari', category: 'ST', city: 'Vyara' },
          { roll: 7, first: 'Gaurav', mid: 'Dipakbhai', last: 'Bhavsar', gender: 'Male', dob: '2003-11-14', mobile: '9909002007', father: 'Dipakbhai Bhavsar', mother: 'Ranjanben Bhavsar', category: 'OBC', city: 'Surat' },
          { roll: 8, first: 'Hetvi', mid: 'Bipinbhai', last: 'Shah', gender: 'Female', dob: '2004-07-04', mobile: '9909002008', father: 'Bipinbhai Shah', mother: 'Diptiben Shah', category: 'General', city: 'Navsari' },
          { roll: 9, first: 'Ishaan', mid: 'Rajendrabhai', last: 'Raval', gender: 'Male', dob: '2004-02-23', mobile: '9909002009', father: 'Rajendrabhai Raval', mother: 'Sangitaben Raval', category: 'General', city: 'Vyara' },
          { roll: 10, first: 'Krupali', mid: 'Pankajbhai', last: 'Vaghela', gender: 'Female', dob: '2004-10-10', mobile: '9909002010', father: 'Pankajbhai Vaghela', mother: 'Gitaben Vaghela', category: 'SC', city: 'Surat' },
        ]
      },
      {
        divisionId: 14,
        classId: 3,
        className: '3rd BHMS',
        fileName: 'Students_3rdBHMS_DivA.xlsx',
        grStart: 3001,
        students: [
          { roll: 1, first: 'Aditya', mid: 'Harshadrai', last: 'Deshmukh', gender: 'Male', dob: '2003-05-15', mobile: '9909003001', father: 'Harshadrai Deshmukh', mother: 'Shobhaben Deshmukh', category: 'General', city: 'Surat' },
          { roll: 2, first: 'Binal', mid: 'Arvindbhai', last: 'Gohil', gender: 'Female', dob: '2003-09-08', mobile: '9909003002', father: 'Arvindbhai Gohil', mother: 'Lataben Gohil', category: 'OBC', city: 'Vyara' },
          { roll: 3, first: 'Darshan', mid: 'Mansukhbhai', last: 'Jadav', gender: 'Male', dob: '2002-12-20', mobile: '9909003003', father: 'Mansukhbhai Jadav', mother: 'Kantaben Jadav', category: 'SC', city: 'Navsari' },
          { roll: 4, first: 'Ekta', mid: 'Shaileshbhai', last: 'Kothari', gender: 'Female', dob: '2003-04-14', mobile: '9909003004', father: 'Shaileshbhai Kothari', mother: 'Binaben Kothari', category: 'General', city: 'Surat' },
          { roll: 5, first: 'Fenil', mid: 'Gunvantbhai', last: 'Modi', gender: 'Male', dob: '2003-08-31', mobile: '9909003005', father: 'Gunvantbhai Modi', mother: 'Ushaben Modi', category: 'OBC', city: 'Bardoli' },
          { roll: 6, first: 'Geeta', mid: 'Rameshbhai', last: 'Gamit', gender: 'Female', dob: '2003-01-25', mobile: '9909003006', father: 'Rameshbhai Gamit', mother: 'Sunandaben Gamit', category: 'ST', city: 'Songadh' },
          { roll: 7, first: 'Harsh', mid: 'Nileshbhai', last: 'Parikh', gender: 'Male', dob: '2002-10-18', mobile: '9909003007', father: 'Nileshbhai Parikh', mother: 'Anitaben Parikh', category: 'General', city: 'Surat' },
          { roll: 8, first: 'Ishita', mid: 'Chetanbhai', last: 'Rawal', gender: 'Female', dob: '2003-06-07', mobile: '9909003008', father: 'Chetanbhai Rawal', mother: 'Dakshaben Rawal', category: 'General', city: 'Vyara' },
          { roll: 9, first: 'Jay', mid: 'Kishorbhai', last: 'Sonigra', gender: 'Male', dob: '2003-03-02', mobile: '9909003009', father: 'Kishorbhai Sonigra', mother: 'Meenaben Sonigra', category: 'OBC', city: 'Navsari' },
          { roll: 10, first: 'Kinjal', mid: 'Dharmendrabhai', last: 'Upadhyay', gender: 'Female', dob: '2003-11-12', mobile: '9909003010', father: 'Dharmendrabhai Upadhyay', mother: 'Pratibhaben Upadhyay', category: 'General', city: 'Surat' },
        ]
      },
      {
        divisionId: 15,
        classId: 4,
        className: '4th BHMS',
        fileName: 'Students_4thBHMS_DivA.xlsx',
        grStart: 4001,
        students: [
          { roll: 1, first: 'Akash', mid: 'Bhupendrabhai', last: 'Baxi', gender: 'Male', dob: '2002-04-10', mobile: '9909004001', father: 'Bhupendrabhai Baxi', mother: 'Smitaben Baxi', category: 'General', city: 'Surat' },
          { roll: 2, first: 'Bhumit', mid: 'Vinodbhai', last: 'Dudhwala', gender: 'Male', dob: '2002-08-24', mobile: '9909004002', father: 'Vinodbhai Dudhwala', mother: 'Hansaben Dudhwala', category: 'OBC', city: 'Vyara' },
          { roll: 3, first: 'Chandni', mid: 'Pravinbhai', last: 'Gami', gender: 'Female', dob: '2002-01-19', mobile: '9909004003', father: 'Pravinbhai Gami', mother: 'Kusumben Gami', category: 'General', city: 'Navsari' },
          { roll: 4, first: 'Dhaval', mid: 'Natwarlal', last: 'Kapadia', gender: 'Male', dob: '2001-11-30', mobile: '9909004004', father: 'Natwarlal Kapadia', mother: 'Taraben Kapadia', category: 'General', city: 'Surat' },
          { roll: 5, first: 'Falak', mid: 'Irfanbhai', last: 'Mansuri', gender: 'Female', dob: '2002-07-15', mobile: '9909004005', father: 'Irfanbhai Mansuri', mother: 'Raziaben Mansuri', category: 'OBC', city: 'Bardoli' },
          { roll: 6, first: 'Gopi', mid: 'Mohanbhai', last: 'Padvi', gender: 'Female', dob: '2002-03-08', mobile: '9909004006', father: 'Mohanbhai Padvi', mother: 'Urmilaben Padvi', category: 'ST', city: 'Vyara' },
          { roll: 7, first: 'Hiren', mid: 'Jagdishchandra', last: 'Pandit', gender: 'Male', dob: '2001-10-05', mobile: '9909004007', father: 'Jagdishchandra Pandit', mother: 'Sarojben Pandit', category: 'General', city: 'Surat' },
          { roll: 8, first: 'Jahnavi', mid: 'Vasantbhai', last: 'Rana', gender: 'Female', dob: '2002-05-18', mobile: '9909004008', father: 'Vasantbhai Rana', mother: 'Kalyaniben Rana', category: 'OBC', city: 'Navsari' },
          { roll: 9, first: 'Kunal', mid: 'Chandrakant', last: 'Vyas', gender: 'Male', dob: '2002-09-12', mobile: '9909004009', father: 'Chandrakant Vyas', mother: 'Madhaviben Vyas', category: 'General', city: 'Vyara' },
          { roll: 10, first: 'Lopa', mid: 'Yogeshbhai', last: 'Zala', gender: 'Female', dob: '2002-02-27', mobile: '9909004010', father: 'Yogeshbhai Zala', mother: 'Niranjanaben Zala', category: 'General', city: 'Surat' },
        ]
      }
    ]

    for (const batch of studentYearBatches) {
      const studentFilePath = path.join(outputDir, batch.fileName)
      const studentWorkbook = new ExcelJS.Workbook()
      const studentSheet = studentWorkbook.addWorksheet('Students')

      studentSheet.columns = [
        { header: 'AdmissionID', key: 'admission_id', width: 14 },
        { header: 'GR No.', key: 'gr_no', width: 14 },
        { header: 'FIRST_NAME', key: 'first_name', width: 18 },
        { header: 'MIDDLE_NAME', key: 'middle_name', width: 18 },
        { header: 'LAST_NAME', key: 'last_name', width: 18 },
        { header: 'GENDER', key: 'gender', width: 12 },
        { header: 'DATE_OF_BIRTH', key: 'dob', width: 16 },
        { header: 'STANDARD', key: 'standard', width: 16 },
        { header: 'DIVISION', key: 'division', width: 12 },
        { header: 'MOBILE_NO1', key: 'mobile', width: 16 },
        { header: 'CURRENT ADDRESS', key: 'address', width: 30 },
        { header: 'Current CITY', key: 'city', width: 16 },
        { header: 'Current STATE', key: 'state', width: 16 },
        { header: 'Currrent PIN_CODE', key: 'pincode', width: 14 },
        { header: 'FATHER_NAME', key: 'father_name', width: 22 },
        { header: 'MOTHER_NAME', key: 'mother_name', width: 22 },
        { header: 'CATEGORY', key: 'category', width: 14 },
        { header: 'ROLL_NO', key: 'roll_no', width: 12 },
        { header: 'ADMISSION_DATE', key: 'admission_date', width: 16 },
      ]

      let grCounter = batch.grStart
      for (const s of batch.students) {
        studentSheet.addRow({
          admission_id: `ADM-${grCounter}`,
          gr_no: grCounter,
          first_name: s.first,
          middle_name: s.mid,
          last_name: s.last,
          gender: s.gender,
          dob: s.dob,
          standard: batch.className,
          division: 'A',
          mobile: s.mobile,
          address: `Station Road, ${s.city}`,
          city: s.city,
          state: 'Gujarat',
          pincode: '394650',
          father_name: s.father,
          mother_name: s.mother,
          category: s.category,
          roll_no: s.roll,
          admission_date: '2024-08-01',
        })
        grCounter++
      }

      await studentWorkbook.xlsx.writeFile(studentFilePath)
      this.logger.info(`  ✓ Created Student Excel file: ${batch.fileName}`)

      const rollCol = batch.className.includes('1st')
        ? 'first_year_roll_number'
        : batch.className.includes('2nd')
        ? 'second_year_roll_number'
        : batch.className.includes('3rd')
        ? 'third_year_roll_number'
        : 'fourth_year_roll_number'

      let gr = batch.grStart
      for (const s of batch.students) {
        const existingStudent = await Students.query()
          .where('gr_no', gr)
          .where('school_id', schoolId)
          .first()

        let studentRecord = existingStudent
        if (!studentRecord) {
          studentRecord = await Students.create({
            school_id: schoolId,
            first_name: s.first,
            middle_name: s.mid,
            last_name: s.last,
            gender: s.gender as 'Male' | 'Female',
            gr_no: gr,
            primary_mobile: Number(s.mobile),
            birth_date: new Date(s.dob),
            [rollCol]: s.roll,
            father_name: s.father,
            mother_name: s.mother,
            is_active: true,
            student_type: 'COLLEGE',
          })

          await StudentMeta.create({
            student_id: studentRecord.id,
            category: (s.category === 'General' ? 'OPEN' : s.category) as any,
            city: s.city,
            state: 'Gujarat',
            postal_code: '394650',
            address: `Station Road, ${s.city}`,
            admission_date: new Date('2024-08-01'),
          })
        }

        await StudentEnrollments.updateOrCreate(
          {
            student_id: studentRecord.id,
            academic_year: academicYear,
            division_id: batch.divisionId,
          },
          {
            status: 'pursuing',
            is_new_admission: true,
          }
        )

        gr++
      }
      this.logger.success(`  ✓ Uploaded & Enrolled ${batch.students.length} students into ${batch.className} (Div A, ID: ${batch.divisionId})`)
    }

    // =========================================================================
    // STEP 4: ASSIGN SUBJECTS TO DIVISIONS & LINK TEACHERS
    // =========================================================================
    this.logger.info('\n🔗 Assigning Subjects to Divisions and Linking Faculty...')

    const divisionSubjectMappings = [
      { divisionId: 12, subjects: [50, 51, 52, 53, 54, 55], teacherMapping: { 53: 'FAC-001', 54: 'FAC-002', 50: 'FAC-003', 51: 'FAC-005' } },
      { divisionId: 13, subjects: [56, 57, 58, 59, 60, 61, 62, 63, 64], teacherMapping: { 60: 'FAC-006', 59: 'FAC-007', 57: 'FAC-004', 56: 'FAC-005' } },
      { divisionId: 14, subjects: [65, 66, 67, 68, 69, 70, 71, 72, 73], teacherMapping: { 70: 'FAC-008', 71: 'FAC-009', 72: 'FAC-012', 65: 'FAC-005' } },
      { divisionId: 15, subjects: [74, 75, 76, 77, 78, 79], teacherMapping: { 77: 'FAC-010', 76: 'FAC-011', 74: 'FAC-005', 78: 'FAC-012' } },
    ]

    for (const mapping of divisionSubjectMappings) {
      for (const subjId of mapping.subjects) {
        const subj = await Subjects.find(subjId)
        if (!subj) continue

        const divMaster = await SubjectDivisionMaster.updateOrCreate(
          {
            division_id: mapping.divisionId,
            subject_id: subjId,
            academic_year: academicYear,
          },
          {
            code_for_division: subj.code,
            status: 'Active',
          }
        )

        const empCode = (mapping.teacherMapping as any)[subjId]
        if (empCode) {
          const staff = await Staff.findBy('employee_code', empCode)
          if (staff) {
            const enrollment = await StaffEnrollment.findBy('staff_id', staff.id)
            if (enrollment) {
              await SubjectDivisionStaffMaster.updateOrCreate(
                {
                  subjects_division_id: divMaster.id,
                  staff_enrollment_id: enrollment.id,
                },
                {
                  status: 'Active',
                }
              )
            }

            const lp = await LessonPlan.query().where('subject_id', subjId).where('school_id', schoolId).first()
            if (lp) {
              await LessonPlanTopic.query()
                .where('lesson_plan_id', lp.id)
                .update({ assigned_staff_ids: JSON.stringify([staff.id]) })
            }
          }
        }
      }
    }
    this.logger.success('  ✓ All BHMS Subjects assigned to Divisions and mapped to Professors & HODs')

    // =========================================================================
    // STEP 5: GENERATE & SEED WEEKLY TIMETABLE FOR ALL 4 BHMS YEARS (Mon-Sat)
    // =========================================================================
    this.logger.info('\n📅 Generating and Seeding Weekly Timetables (Monday - Saturday)...')

    let schoolTimeTableConfig = await SchoolTimeTableConfig.query()
      .where('academic_year', academicYear)
      .first()

    if (!schoolTimeTableConfig) {
      schoolTimeTableConfig = await SchoolTimeTableConfig.create({
        academic_year: academicYear,
        max_periods_per_day: 7,
        default_period_duration: 60,
        allowed_period_durations: [60],
        lab_enabled: true,
        pt_enabled: false,
        period_gap_duration: 0,
        teacher_max_periods_per_day: 5,
        teacher_max_periods_per_week: 25,
        is_lab_included_in_max_periods: true,
      })
    }

    const daysList: Array<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'> = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

    const timetableYearConfigs = [
      {
        classId: 1,
        divisionId: 12,
        className: '1st BHMS Div A',
        schedule: [
          { order: 1, start: '09:00', end: '10:00', isBreak: false, subjId: 53, empCode: 'FAC-001' },
          { order: 2, start: '10:00', end: '11:00', isBreak: false, subjId: 54, empCode: 'FAC-002' },
          { order: 3, start: '11:00', end: '12:00', isBreak: false, subjId: 50, empCode: 'FAC-003' },
          { order: 4, start: '12:00', end: '12:45', isBreak: true, subjId: null, empCode: null },
          { order: 5, start: '12:45', end: '13:45', isBreak: false, subjId: 51, empCode: 'FAC-005' },
          { order: 6, start: '13:45', end: '14:45', isBreak: false, subjId: 53, empCode: 'FAC-001' },
          { order: 7, start: '14:45', end: '15:45', isBreak: false, subjId: 54, empCode: 'FAC-002' },
        ],
      },
      {
        classId: 2,
        divisionId: 13,
        className: '2nd BHMS Div A',
        schedule: [
          { order: 1, start: '09:00', end: '10:00', isBreak: false, subjId: 60, empCode: 'FAC-006' },
          { order: 2, start: '10:00', end: '11:00', isBreak: false, subjId: 59, empCode: 'FAC-007' },
          { order: 3, start: '11:00', end: '12:00', isBreak: false, subjId: 57, empCode: 'FAC-004' },
          { order: 4, start: '12:00', end: '12:45', isBreak: true, subjId: null, empCode: null },
          { order: 5, start: '12:45', end: '13:45', isBreak: false, subjId: 56, empCode: 'FAC-005' },
          { order: 6, start: '13:45', end: '14:45', isBreak: false, subjId: 60, empCode: 'FAC-006' },
          { order: 7, start: '14:45', end: '15:45', isBreak: false, subjId: 59, empCode: 'FAC-007' },
        ],
      },
      {
        classId: 3,
        divisionId: 14,
        className: '3rd BHMS Div A',
        schedule: [
          { order: 1, start: '09:00', end: '10:00', isBreak: false, subjId: 70, empCode: 'FAC-008' },
          { order: 2, start: '10:00', end: '11:00', isBreak: false, subjId: 71, empCode: 'FAC-009' },
          { order: 3, start: '11:00', end: '12:00', isBreak: false, subjId: 72, empCode: 'FAC-012' },
          { order: 4, start: '12:00', end: '12:45', isBreak: true, subjId: null, empCode: null },
          { order: 5, start: '12:45', end: '13:45', isBreak: false, subjId: 65, empCode: 'FAC-005' },
          { order: 6, start: '13:45', end: '14:45', isBreak: false, subjId: 70, empCode: 'FAC-008' },
          { order: 7, start: '14:45', end: '15:45', isBreak: false, subjId: 71, empCode: 'FAC-009' },
        ],
      },
      {
        classId: 4,
        divisionId: 15,
        className: '4th BHMS Div A',
        schedule: [
          { order: 1, start: '09:00', end: '10:00', isBreak: false, subjId: 77, empCode: 'FAC-010' },
          { order: 2, start: '10:00', end: '11:00', isBreak: false, subjId: 76, empCode: 'FAC-011' },
          { order: 3, start: '11:00', end: '12:00', isBreak: false, subjId: 74, empCode: 'FAC-005' },
          { order: 4, start: '12:00', end: '12:45', isBreak: true, subjId: null, empCode: null },
          { order: 5, start: '12:45', end: '13:45', isBreak: false, subjId: 78, empCode: 'FAC-012' },
          { order: 6, start: '13:45', end: '14:45', isBreak: false, subjId: 77, empCode: 'FAC-010' },
          { order: 7, start: '14:45', end: '15:45', isBreak: false, subjId: 76, empCode: 'FAC-011' },
        ],
      },
    ]

    for (const yearCfg of timetableYearConfigs) {
      for (const day of daysList) {
        const classDayConfig = await ClassDayConfig.updateOrCreate(
          {
            school_timetable_config_id: schoolTimeTableConfig.id,
            class_id: yearCfg.classId,
            day: day,
          },
          {
            allowed_durations: [60],
            max_consecutive_periods: 3,
            total_breaks: 1,
            break_durations: [45],
            day_start_time: '09:00',
            day_end_time: '16:00',
          }
        )

        await PeriodsConfig.query()
          .where('class_day_config_id', classDayConfig.id)
          .where('division_id', yearCfg.divisionId)
          .delete()

        for (const slot of yearCfg.schedule) {
          let sdmId: number | null = null
          let staffEnrollId: number | null = null

          if (!slot.isBreak && slot.subjId) {
            const sdm = await SubjectDivisionMaster.query()
              .where('division_id', yearCfg.divisionId)
              .where('subject_id', slot.subjId)
              .where('academic_year', academicYear)
              .first()

            if (sdm) {
              sdmId = sdm.id
            }

            if (slot.empCode) {
              const staff = await Staff.findBy('employee_code', slot.empCode)
              if (staff) {
                const enrollment = await StaffEnrollment.findBy('staff_id', staff.id)
                if (enrollment) {
                  staffEnrollId = enrollment.id
                }
              }
            }
          }

          await PeriodsConfig.create({
            class_day_config_id: classDayConfig.id,
            division_id: yearCfg.divisionId,
            period_order: slot.order,
            start_time: slot.start,
            end_time: slot.end,
            is_break: slot.isBreak,
            subjects_division_masters_id: sdmId,
            staff_enrollment_id: staffEnrollId,
            lab_id: null,
            is_pt: false,
            is_free_period: false,
            is_library: false,
            is_seminar: false,
            batch_name: null,
          })
        }
      }
      this.logger.success(`  ✓ Generated 6-day Timetable for ${yearCfg.className} (Class ${yearCfg.classId}, Division ${yearCfg.divisionId})`)
    }

    // =========================================================================
    // STEP 6: GENERATE & UPLOAD HOSPITAL & NON-TEACHING STAFF (ExcelJS)
    // =========================================================================
    this.logger.info('\n🏥 Generating and uploading Hospital & Non-Teaching Staff...')

    const hospitalAndNonTeachingList = [
      // Hospital Staff
      {
        code: 'HOSP-001',
        first: 'Sanjay',
        mid: 'Kantilal',
        last: 'Patel',
        gender: 'Male' as const,
        dob: '1980-05-12',
        email: 'sanjay.patel@cnkhmc.org',
        mobile: '9825200001',
        dept: 'Homoeopathic Hospital (OPD/IPD)',
        desig: 'Resident Medical Officer (RMO)',
        role: 'Hospital Staff',
        qual: 'B.H.M.S.',
        spec: 'Medicine',
        status: 'Permanent',
        join: '2016-04-01',
        city: 'Vyara',
        state: 'Gujarat',
        bg: 'O+',
        staffCategory: 'Hospital',
        ctc: 480000,
        templateCode: 'HOSP_CARE',
      },
      {
        code: 'HOSP-002',
        first: 'Jayshree',
        mid: 'Mukeshbhai',
        last: 'Solanki',
        gender: 'Female' as const,
        dob: '1984-08-20',
        email: 'jayshree.solanki@cnkhmc.org',
        mobile: '9825200002',
        dept: 'Nursing Administration',
        desig: 'Nursing Superintendent / Matron',
        role: 'Hospital Staff',
        qual: 'Diploma',
        spec: 'Others',
        status: 'Permanent',
        join: '2017-06-15',
        city: 'Surat',
        state: 'Gujarat',
        bg: 'A+',
        staffCategory: 'Hospital',
        ctc: 360000,
        templateCode: 'HOSP_CARE',
      },
      {
        code: 'HOSP-003',
        first: 'Nilesh',
        mid: 'Pravinbhai',
        last: 'Rathod',
        gender: 'Male' as const,
        dob: '1988-11-05',
        email: 'nilesh.rathod@cnkhmc.org',
        mobile: '9825200003',
        dept: 'Clinical Pathology Lab',
        desig: 'Clinical Lab Technician',
        role: 'Hospital Staff',
        qual: 'Diploma',
        spec: 'Biology',
        status: 'Permanent',
        join: '2018-08-01',
        city: 'Navsari',
        state: 'Gujarat',
        bg: 'B+',
        staffCategory: 'Hospital',
        ctc: 300000,
        templateCode: 'HOSP_CARE',
      },
      {
        code: 'HOSP-004',
        first: 'Ramila',
        mid: 'Bharatbhai',
        last: 'Chaudhari',
        gender: 'Female' as const,
        dob: '1990-02-14',
        email: 'ramila.chaudhari@cnkhmc.org',
        mobile: '9825200004',
        dept: 'Hospital Pharmacy & Dispensary',
        desig: 'Hospital Pharmacist',
        role: 'Hospital Staff',
        qual: 'Diploma',
        spec: 'Chemistry',
        status: 'Permanent',
        join: '2019-03-10',
        city: 'Vyara',
        state: 'Gujarat',
        bg: 'AB+',
        staffCategory: 'Hospital',
        ctc: 300000,
        templateCode: 'HOSP_CARE',
      },
      {
        code: 'HOSP-005',
        first: 'Rajesh',
        mid: 'Gunvantbhai',
        last: 'Gamit',
        gender: 'Male' as const,
        dob: '1986-07-28',
        email: 'rajesh.gamit@cnkhmc.org',
        mobile: '9825200005',
        dept: 'Radiology & Diagnostic Units',
        desig: 'X-Ray & ECG Technician',
        role: 'Hospital Staff',
        qual: 'Diploma',
        spec: 'Physics',
        status: 'Permanent',
        join: '2020-01-15',
        city: 'Songadh',
        state: 'Gujarat',
        bg: 'O-',
        staffCategory: 'Hospital',
        ctc: 280000,
        templateCode: 'HOSP_CARE',
      },
      // Non-Teaching / Administrative Staff
      {
        code: 'NT-001',
        first: 'Bharat',
        mid: 'Dineshbhai',
        last: 'Shah',
        gender: 'Male' as const,
        dob: '1974-03-18',
        email: 'bharat.shah@cnkhmc.org',
        mobile: '9825300001',
        dept: 'General Administration',
        desig: 'Office Superintendent / Head Clerk',
        role: 'Non-Teaching',
        qual: 'M.Com',
        spec: 'Commerce',
        status: 'Permanent',
        join: '2011-09-01',
        city: 'Surat',
        state: 'Gujarat',
        bg: 'B+',
        staffCategory: 'Non-Teaching',
        ctc: 420000,
        templateCode: 'NON_TEACH',
      },
      {
        code: 'NT-002',
        first: 'Kaushik',
        mid: 'Vinodbhai',
        last: 'Joshi',
        gender: 'Male' as const,
        dob: '1981-12-22',
        email: 'kaushik.joshi@cnkhmc.org',
        mobile: '9825300002',
        dept: 'Accounts & Finance',
        desig: 'Senior Accountant',
        role: 'Non-Teaching',
        qual: 'M.Com',
        spec: 'Commerce',
        status: 'Permanent',
        join: '2015-11-01',
        city: 'Vyara',
        state: 'Gujarat',
        bg: 'A+',
        staffCategory: 'Non-Teaching',
        ctc: 360000,
        templateCode: 'NON_TEACH',
      },
      {
        code: 'NT-003',
        first: 'Minakshi',
        mid: 'Nitinbhai',
        last: 'Pandya',
        gender: 'Female' as const,
        dob: '1985-09-10',
        email: 'minakshi.pandya@cnkhmc.org',
        mobile: '9825300003',
        dept: 'Central Medical Library',
        desig: 'College Librarian',
        role: 'Non-Teaching',
        qual: 'Others',
        spec: 'Others',
        status: 'Permanent',
        join: '2016-07-20',
        city: 'Bardoli',
        state: 'Gujarat',
        bg: 'O+',
        staffCategory: 'Non-Teaching',
        ctc: 360000,
        templateCode: 'NON_TEACH',
      },
      {
        code: 'NT-004',
        first: 'Paresh',
        mid: 'Chandrakant',
        last: 'Vaghela',
        gender: 'Male' as const,
        dob: '1989-04-05',
        email: 'paresh.vaghela@cnkhmc.org',
        mobile: '9825300004',
        dept: 'Anatomy Dissection Hall',
        desig: 'Lab Attendant / Dissection Assistant',
        role: 'Non-Teaching',
        qual: 'HSC',
        spec: 'Others',
        status: 'Permanent',
        join: '2018-02-01',
        city: 'Navsari',
        state: 'Gujarat',
        bg: 'B+',
        staffCategory: 'Non-Teaching',
        ctc: 240000,
        templateCode: 'NON_TEACH',
      },
      {
        code: 'NT-005',
        first: 'Mukesh',
        mid: 'Bhupatbhai',
        last: 'Vasava',
        gender: 'Male' as const,
        dob: '1992-06-30',
        email: 'mukesh.vasava@cnkhmc.org',
        mobile: '9825300005',
        dept: 'Campus Support Services',
        desig: 'Multi-Tasking Staff (MTS) / Peon',
        role: 'Non-Teaching',
        qual: 'SSC',
        spec: 'Others',
        status: 'Permanent',
        join: '2019-10-15',
        city: 'Vyara',
        state: 'Gujarat',
        bg: 'AB+',
        staffCategory: 'Non-Teaching',
        ctc: 200000,
        templateCode: 'NON_TEACH',
      },
    ]

    const hospStaffFilePath = path.join(outputDir, 'Staff_Hospital_and_NonTeaching.xlsx')
    const hospWorkbook = new ExcelJS.Workbook()
    const hospSheet = hospWorkbook.addWorksheet('Hospital_and_Staff')

    hospSheet.columns = [
      { header: 'Employee Code', key: 'employee_code', width: 16 },
      { header: 'First Name', key: 'first_name', width: 18 },
      { header: 'Middle Name', key: 'middle_name', width: 18 },
      { header: 'Last Name', key: 'last_name', width: 18 },
      { header: 'Gender', key: 'gender', width: 12 },
      { header: 'Staff Category', key: 'staff_category', width: 18 },
      { header: 'Department', key: 'department', width: 30 },
      { header: 'Designation', key: 'designation', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Mobile', key: 'mobile', width: 16 },
      { header: 'City', key: 'city', width: 16 },
      { header: 'Blood Group', key: 'bg', width: 12 },
    ]

    for (const h of hospitalAndNonTeachingList) {
      hospSheet.addRow({
        employee_code: h.code,
        first_name: h.first,
        middle_name: h.mid,
        last_name: h.last,
        gender: h.gender,
        staff_category: h.staffCategory,
        department: h.dept,
        designation: h.desig,
        email: h.email,
        mobile: h.mobile,
        city: h.city,
        bg: h.bg,
      })

      let existingStaff = await Staff.query().where('email', h.email).where('school_id', schoolId).first()
      if (!existingStaff) {
        existingStaff = await Staff.create({
          school_id: schoolId,
          employee_code: h.code,
          first_name: h.first,
          middle_name: h.mid,
          last_name: h.last,
          gender: h.gender,
          email: h.email,
          mobile_number: Number(h.mobile),
          department: h.dept,
          designation: h.desig,
          staff_role_id: 11,
          qualification: h.qual as any,
          subject_specialization: h.spec as any,
          employment_status: h.status as any,
          appointment_date: new Date(h.join),
          city: h.city,
          state: h.state,
          blood_group: h.bg as any,
          is_active: true,
          is_teching_staff: false,
          is_teaching_role: false,
          staff_category: h.staffCategory,
        })
      }

      await StaffEnrollment.updateOrCreate(
        { staff_id: existingStaff.id, academic_year: academicYear },
        {
          school_id: schoolId,
          status: 'Retained',
        }
      )

      const username = `${h.code.toLowerCase().replace('-', '_')}_${h.first.toLowerCase()}`
      const existingUser = await User.findBy('email', h.email)
      if (!existingUser) {
        await User.create({
          school_id: schoolId,
          name: `${h.first} ${h.last}`,
          username: username,
          email: h.email,
          password: 'Password@123',
          role_id: 7,
          staff_id: existingStaff.id,
          is_active: true,
        })
      }
    }

    await hospWorkbook.xlsx.writeFile(hospStaffFilePath)
    this.logger.success(`  ✓ Created & Uploaded 10 Hospital and Non-Teaching Staff records`)

    // =========================================================================
    // STEP 7: CREATE SALARY COMPONENTS, TEMPLATES & ATTACH TO STAFF
    // =========================================================================
    this.logger.info('\n💳 Creating Salary Components & Salary Templates...')

    const componentsDef = [
      { code: 'BASIC', name: 'Basic Pay', type: 'earning' as const, method: 'percentage' as const, pct: 40, amt: null, epf: true, tax: true },
      { code: 'DA', name: 'Dearness Allowance (DA)', type: 'earning' as const, method: 'percentage' as const, pct: 30, amt: null, epf: true, tax: true },
      { code: 'HRA', name: 'House Rent Allowance (HRA)', type: 'earning' as const, method: 'percentage' as const, pct: 15, amt: null, epf: false, tax: true },
      { code: 'TA', name: 'Transport Allowance (TA)', type: 'earning' as const, method: 'amount' as const, pct: null, amt: 1600, epf: false, tax: false },
      { code: 'MA', name: 'Medical Allowance (MA)', type: 'earning' as const, method: 'amount' as const, pct: null, amt: 1250, epf: false, tax: false },
      { code: 'SMA', name: 'Special Medical / Clinical Allowance', type: 'earning' as const, method: 'amount' as const, pct: null, amt: 2500, epf: false, tax: true },
      { code: 'PF', name: 'Provident Fund (EPF)', type: 'deduction' as const, method: 'percentage' as const, pct: 12, amt: null, epf: true, tax: false },
      { code: 'PT', name: 'Professional Tax (PT)', type: 'deduction' as const, method: 'amount' as const, pct: null, amt: 200, epf: false, tax: false },
      { code: 'TDS', name: 'Tax Deducted at Source (TDS)', type: 'deduction' as const, method: 'amount' as const, pct: null, amt: 1500, epf: false, tax: false },
    ]

    const createdComponentsMap = new Map<string, SalaryComponents>()

    for (const c of componentsDef) {
      const comp = await SalaryComponents.updateOrCreate(
        {
          school_id: schoolId,
          component_code: c.code,
          academic_year: academicYear,
        },
        {
          component_name: c.name,
          component_type: c.type,
          calculation_method: c.method,
          percentage: c.pct,
          amount: c.amt,
          is_based_on_annual_ctc: c.method === 'percentage',
          is_taxable: c.tax,
          consider_for_epf: c.epf,
          is_mandatory: true,
          is_mandatory_for_all_templates: false,
        }
      )
      createdComponentsMap.set(c.code, comp)
    }
    this.logger.success(`  ✓ Created / Verified ${createdComponentsMap.size} Salary Components (Basic, DA, HRA, TA, MA, SMA, PF, PT, TDS)`)

    // Templates definition
    const templatesDef = [
      {
        code: 'MED_FACULTY',
        name: 'Medical Teaching Faculty (Professors & HODs)',
        ctc: 720000,
        components: ['BASIC', 'DA', 'HRA', 'TA', 'MA', 'SMA', 'PF', 'PT', 'TDS'],
      },
      {
        code: 'HOSP_CARE',
        name: 'Hospital & Clinical Care Staff (RMO & Nurses)',
        ctc: 480000,
        components: ['BASIC', 'DA', 'HRA', 'TA', 'MA', 'SMA', 'PF', 'PT', 'TDS'],
      },
      {
        code: 'NON_TEACH',
        name: 'Non-Teaching & Administrative Staff',
        ctc: 360000,
        components: ['BASIC', 'DA', 'HRA', 'TA', 'MA', 'PF', 'PT', 'TDS'],
      },
    ]

    const createdTemplatesMap = new Map<string, SalaryTemplates>()

    for (const t of templatesDef) {
      const tpl = await SalaryTemplates.updateOrCreate(
        {
          school_id: schoolId,
          template_code: t.code,
          academic_year: academicYear,
        },
        {
          template_name: t.name,
          description: `Standard institutional payroll template for ${t.name}`,
          annual_ctc: t.ctc,
          is_active: true,
          is_mandatory: false,
        }
      )

      await TemplateComponents.query().where('salary_templates_id', tpl.id).delete()

      for (const compCode of t.components) {
        const comp = createdComponentsMap.get(compCode)
        if (comp) {
          await TemplateComponents.create({
            salary_templates_id: tpl.id,
            salary_components_id: comp.id,
            amount: comp.amount,
            percentage: comp.percentage,
            is_based_on_annual_ctc: comp.is_based_on_annual_ctc,
            is_mandatory: true,
          })
        }
      }
      createdTemplatesMap.set(t.code, tpl)
    }
    this.logger.success(`  ✓ Created 3 Standard Salary Templates (Teaching Faculty, Hospital Staff, Non-Teaching Staff)`)

    // Attach templates to Staff
    this.logger.info('🔗 Attaching Salary Templates & Component structures to Staff members...')

    // 1. Attach Medical Faculty (teaching)
    const teachingTemplate = createdTemplatesMap.get('MED_FACULTY')!
    for (const f of facultyList) {
      const staff = await Staff.findBy('employee_code', f.code)
      if (staff) {
        const enrollment = await StaffEnrollment.findBy('staff_id', staff.id)
        if (enrollment) {
          const facultyCtc = f.role === 'Professor' ? 840000 : f.role === 'Associate Professor' ? 660000 : 540000

          await StaffSalaryTemplates.query().where('staff_enrollments_id', enrollment.id).delete()

          const staffTpl = await StaffSalaryTemplates.create({
            base_template_id: teachingTemplate.id,
            staff_enrollments_id: enrollment.id,
            template_name: `${teachingTemplate.template_name} - ${f.first} ${f.last}`,
            template_code: `${teachingTemplate.template_code}_${f.code}`,
            description: `Individual salary configuration for ${f.first} ${f.last}`,
            annual_ctc: facultyCtc,
          })

          for (const compCode of templatesDef[0].components) {
            const comp = createdComponentsMap.get(compCode)!
            const monthlySalary = Math.round(facultyCtc / 12)
            const compAmt = comp.amount ? comp.amount : comp.percentage ? Math.round((monthlySalary * comp.percentage) / 100) : 0

            await StaffTemplateComponents.create({
              staff_salary_templates_id: staffTpl.id,
              salary_components_id: comp.id,
              amount: compAmt,
              percentage: comp.percentage,
              is_mandatory: true,
            })
          }
        }
      }
    }

    // 2. Attach Hospital & Non-Teaching Staff
    for (const h of hospitalAndNonTeachingList) {
      const staff = await Staff.findBy('employee_code', h.code)
      if (staff) {
        const enrollment = await StaffEnrollment.findBy('staff_id', staff.id)
        if (enrollment) {
          const baseTpl = createdTemplatesMap.get(h.templateCode)!
          const tplDef = templatesDef.find((td) => td.code === h.templateCode)!

          await StaffSalaryTemplates.query().where('staff_enrollments_id', enrollment.id).delete()

          const staffTpl = await StaffSalaryTemplates.create({
            base_template_id: baseTpl.id,
            staff_enrollments_id: enrollment.id,
            template_name: `${baseTpl.template_name} - ${h.first} ${h.last}`,
            template_code: `${baseTpl.template_code}_${h.code}`,
            description: `Individual salary configuration for ${h.first} ${h.last}`,
            annual_ctc: h.ctc,
          })

          for (const compCode of tplDef.components) {
            const comp = createdComponentsMap.get(compCode)!
            const monthlySalary = Math.round(h.ctc / 12)
            const compAmt = comp.amount ? comp.amount : comp.percentage ? Math.round((monthlySalary * comp.percentage) / 100) : 0

            await StaffTemplateComponents.create({
              staff_salary_templates_id: staffTpl.id,
              salary_components_id: comp.id,
              amount: compAmt,
              percentage: comp.percentage,
              is_mandatory: true,
            })
          }
        }
      }
    }

    this.logger.success('  ✓ Assigned & Calculated Salary Templates with TDS, PF, PT & Deductions for all 22 Staff members')

    this.logger.info('\n======================================================')
    this.logger.success('🎉 ALL DUMMY NON-PII DATA, TIMETABLES & PAYROLL SEEDED SUCCESSFULLY!')
    this.logger.info(`📁 Generated Excel files saved in: ${outputDir}`)
    this.logger.info('======================================================\n')
  }
}
