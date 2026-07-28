import Staff from '#models/Staff'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import xlsx from 'xlsx'
import StaffEnrollment from '#models/StaffEnrollment'
import StaffConfiguration from '#models/StaffConfiguration'
// import db from '@adonisjs/lucid/services/db'

export default class extends BaseSeeder {
  async run() {
    const filePath = "e:\\Internship\\CNKHMC\\FINAL_STAFF_LIST.xlsx";
    let workbook;
    try {
      workbook = xlsx.readFile(filePath, { cellDates: true });
    } catch (e) {
      console.error("Could not read excel file. Please ensure the path is correct.", e);
      return;
    }
    
    const parsedData: any[] = [];

    // Track configurations
    const staffTypesSet = new Set<string>();
    const staffCategoriesMap = new Map<string, string>(); // category -> type
    const designationsMap = new Map<string, string>(); // designation -> category

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return;

      const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[];
      let currentHeader = sheetName;
      let keys: string[] = [];
      
      rawData.forEach((row: any) => {
        // Group headers
        if (row.length === 1 && typeof row[0] === 'string' && row[0].includes("Staff")) {
          currentHeader = row[0].trim();
          return;
        }
        
        // Column headers
        if (row.includes("Sr. No.") || row.includes("Name of Staff")) {
          keys = row;
          return;
        }
        
        // Skip empty or invalid rows
        if (!row[0] || !keys.length || String(row[0]).toLowerCase() === "nan") return;
        
        const record: any = { _category: currentHeader, _sheetName: sheetName };
        keys.forEach((key, i) => {
          if (key) record[key] = row[i];
        });
        parsedData.push(record);
      });
    });

    for (const record of parsedData) {
      // Handle name splitting
      const fullName = (record["Name of Staff"] || "").trim();
      const nameParts = fullName.split(" ").filter((p: string) => p);
      
      let first_name = "Unknown";
      let middle_name = null;
      let last_name = "Unknown";
      
      if (nameParts.length === 1) {
        first_name = nameParts[0];
        last_name = nameParts[0];
      } else if (nameParts.length === 2) {
        first_name = nameParts[0];
        last_name = nameParts[1];
      } else if (nameParts.length > 2) {
        const titles = ['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.'];
        if (titles.includes(nameParts[0])) {
            first_name = `${nameParts[0]} ${nameParts[1]}`;
            if (nameParts.length === 3) {
                last_name = nameParts[2];
            } else {
                last_name = nameParts[nameParts.length - 1];
                middle_name = nameParts.slice(2, -1).join(" ");
            }
        } else {
            first_name = nameParts[0];
            last_name = nameParts[nameParts.length - 1];
            middle_name = nameParts.slice(1, -1).join(" ");
        }
      }

      // Default role
      let role_id = 3; // Teacher

      let employment_status = 'Permanent';

      // Role assignment based on category
      let staff_type = "";
      let staff_category = "";

      const catLower = (record._category + " " + record._sheetName).toLowerCase();
      if (catLower.includes('teaching staff') && catLower.includes('full time')) {
        role_id = 3; // Teacher
        staff_type = 'Teaching Staff';
        staff_category = 'Full Time';
      } else if (catLower.includes('teaching staff') && (catLower.includes('guest') || catLower.includes('visiting'))) {
        role_id = 8; // Visiting Faculty
        employment_status = 'Contract_Based';
        staff_type = 'Teaching Staff';
        staff_category = 'Guest/Visiting';
      } else if (catLower.includes('non-teaching staff')) {
        role_id = 4; // Clerk (or peon, etc. - non-teaching)
        staff_type = 'Non-Teaching Staff';
        staff_category = record._category.trim();
      } else if (catLower.includes('hospital staff')) {
        role_id = 7; // Hospital Staff
        staff_type = 'Hospital Staff';
        staff_category = record._category.trim();
      } else if (catLower.includes('hostel staff')) {
        role_id = 9; // Hostel Staff
        staff_type = 'Hostel Staff';
        staff_category = record._category.trim();
      } else if (catLower.includes('annpoorna staff') || catLower.includes('mess')) {
        role_id = 10; // Mess Staff
        staff_type = 'Mess Staff';
        staff_category = record._category.trim();
      } else {
        staff_type = 'Other';
        staff_category = record._category.trim();
      }

      // Check for retired explicitly in EPF column as per excel note
      if (String(record["EPF UAN NO."]).toLowerCase().includes('retire')) {
         employment_status = 'Resigned'; // ENUM only has Resigned, not Retired
      }

      let dateOfBirth = record["Date of Birth"];
      if (typeof dateOfBirth === 'number') {
         dateOfBirth = new Date(Math.round((dateOfBirth - 25569) * 86400 * 1000));
      } else if (dateOfBirth) {
         dateOfBirth = new Date(dateOfBirth);
      }

      let dateOfJoining = record["Date of Joining"];
      if (typeof dateOfJoining === 'number') {
         dateOfJoining = new Date(Math.round((dateOfJoining - 25569) * 86400 * 1000));
      } else if (dateOfJoining) {
         dateOfJoining = new Date(dateOfJoining);
      }

      const staffData = {
        school_id: 1, // Default school_id
        staff_role_id: role_id,
        is_teching_staff: (role_id === 3 || role_id === 8),
        is_teaching_role: (role_id === 3 || role_id === 8),
        first_name: first_name,
        middle_name: middle_name,
        last_name: last_name,
        gender: (record["Gender"] === 'M' ? 'Male' : (record["Gender"] === 'F' ? 'Female' : 'Male')) as "Male" | "Female",
        birth_date: dateOfBirth ? dateOfBirth : null,
        joining_date: dateOfJoining ? dateOfJoining : null,
        mobile_number: record["MOBILE NO."] ? (Number(String(record["MOBILE NO."]).replace(/\D/g,'').substring(0,10)) || 9999999999) : 9999999999,
        pan_card_no: record["PAN NO."] ? String(record["PAN NO."]).substring(0, 10) : null,
        aadhar_no: record["AADHAR NO."] ? (Number(String(record["AADHAR NO."]).replace(/\D/g,'').substring(0,12)) || null) : null,
        epf_uan_no: record["EPF UAN NO."] ? (Number(String(record["EPF UAN NO."]).replace(/\D/g,'').substring(0,12)) || null) : null,
        bank_name: record["Bank"] || null,
        account_no: record["Account No."] ? (Number(String(record["Account No."]).replace(/\D/g,'').substring(0,18)) || null) : null,
        IFSC_code: record["IFSC CODE"] ? String(record["IFSC CODE"]).substring(0,11) : null,
        employment_status: employment_status as any,
        pay_scale: record["Consolidated Salary"] ? String(record["Consolidated Salary"]) : null,
        employee_code: `EMP-${record._category.substring(0,2).toUpperCase()}-${record["Sr. No."]}-${Math.floor(Math.random() * 1000)}`,
        designation: record["Designation"] || null,
        staff_type: staff_type,
        staff_category: staff_category,
        is_active: true
      };

      if (staffData.staff_type) {
         staffTypesSet.add(staffData.staff_type);
      }
      if (staffData.staff_category && staffData.staff_type) {
         staffCategoriesMap.set(staffData.staff_category, staffData.staff_type);
      }
      if (staffData.designation && staffData.staff_category) {
         designationsMap.set(staffData.designation, staffData.staff_category);
      }

      try {
        let staff = await Staff.query().where('first_name', staffData.first_name).andWhere('last_name', staffData.last_name).andWhere('mobile_number', staffData.mobile_number).first();
        if (!staff) {
           try {
              staff = await Staff.create(staffData);
           } catch (e: any) {
              if (e.code === 'ER_DUP_ENTRY' && (e.message.includes('staff_pan_card_no_unique') || e.message.includes('staff_account_no_unique') || e.message.includes('staff_epf_uan_no_unique') || e.message.includes('staff_aadhar_no_unique'))) {
                 // skip creating staff if unique constraint duplicates
                 continue;
              } else {
                 throw e;
              }
           }
        } else {
           // Update existing staff
           staff.merge({
             staff_type: staffData.staff_type,
             staff_category: staffData.staff_category,
             designation: staffData.designation
           });
           await staff.save();
        }
        
        let sessionId = 1;

        let existingEnrollment = await StaffEnrollment.query()
          .where('staff_id', staff.id)
          .andWhere('academic_year', sessionId)
          .first();
        if (!existingEnrollment) {
          const se = new StaffEnrollment();
          se.staff_id = staff.id;
          se.academic_year = sessionId;
          se.school_id = 1;
          se.status = 'Retained';
          await se.save();
        }
      } catch (e) {
         console.error('Error creating staff:', fullName, e);
      }
    }

    // Insert staff configurations
    console.log('Inserting Staff Configurations...');
    const typeIds = new Map<string, number>();
    const categoryIds = new Map<string, number>();

    // 1. Insert Staff Types
    for (const type of staffTypesSet) {
       let config = await StaffConfiguration.query().where('config_type', 'STAFF_TYPE').andWhere('name', type).first();
       if (!config) {
          config = await StaffConfiguration.create({
             school_id: 1,
             config_type: 'STAFF_TYPE',
             name: type,
             parent_id: null
          });
       }
       typeIds.set(type, config.id);
    }

    // 2. Insert Staff Categories
    for (const [category, parentType] of staffCategoriesMap.entries()) {
       const parentId = typeIds.get(parentType);
       if (!parentId) continue;
       
       let config = await StaffConfiguration.query()
          .where('config_type', 'STAFF_CATEGORY')
          .andWhere('name', category)
          .andWhere('parent_id', parentId)
          .first();
          
       if (!config) {
          config = await StaffConfiguration.create({
             school_id: 1,
             config_type: 'STAFF_CATEGORY',
             name: category,
             parent_id: parentId
          });
       }
       categoryIds.set(category, config.id);
    }

    // 3. Insert Designations
    for (const [designation, parentCategory] of designationsMap.entries()) {
       const parentId = categoryIds.get(parentCategory);
       if (!parentId) continue;
       
       let config = await StaffConfiguration.query()
          .where('config_type', 'DESIGNATION')
          .andWhere('name', designation)
          .andWhere('parent_id', parentId)
          .first();
          
       if (!config) {
          await StaffConfiguration.create({
             school_id: 1,
             config_type: 'DESIGNATION',
             name: designation,
             parent_id: parentId
          });
       }
    }
  }
}
