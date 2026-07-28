

export default class FeesReportController {
  /**
   * Generate annual fee report
   */
//   public async annualReport({ request, response }: HttpContext) {
//     const { academicYear, classId, divisionId } = request.qs()

//     try {
//       const query = StudentFeesInstallments.query()
//         .select(
//           'student_fees_installments.amount as amount',
//           'student_fees_installments.paid_amount as paidAmount',
//           'student_fees_installments.is_paid as isPaid',
//           'student_fees_installments.due_date as dueDate',
//           'fees_types.name as feeTypeName',
//           'students.first_name',
//           'students.middle_name',
//           'students.last_name',
//           'classes.name as className',
//           'divisions.name as divisionName',
//           'academic_sessions.year as academicSessionYear'
//         )
//         .join('student_fees_masters', 'student_fees_installments.student_fee_master_id', '=', 'student_fees_masters.id')
//         .join('students', 'student_fees_masters.student_id', '=', 'students.id')
//         .join('student_enrollments', 'students.id', '=', 'student_enrollments.student_id')
//         .join('academic_sessions', 'student_enrollments.academic_year', '=', 'academic_sessions.id')
//         .join('classes', 'student_enrollments.class_id', '=', 'classes.id')
//         .leftJoin('divisions', 'student_enrollments.division_id', '=', 'divisions.id')
//         .join('student_fees_plan_masters', 'student_fees_masters.student_fees_plan_master_id', '=', 'student_fees_plan_masters.id')
//         .join('fees_plans', 'student_fees_plan_masters.fees_plan_id', '=', 'fees_plans.id')
//         .join('fees_plan_details', 'fees_plans.id', '=', 'fees_plan_details.fees_plan_id')
//         .join('fees_types', 'fees_plan_details.fee_type_id', '=', 'fees_types.id')
//         .whereRaw('student_fees_installments.fees_type_id = fees_types.id'); // Ensure correct join for fee type

//       if (academicYear) {
//         query.where('academic_sessions.id', academicYear)
//       }
//       if (classId) {
//         query.where('classes.id', classId)
//       }
//       if (divisionId) {
//         query.where('divisions.id', divisionId)
//       }

//       const feesData = await query.exec()

//       // Calculate total collected fees, outstanding fees, and concessions
//       let totalCollected = 0
//       let totalOutstanding = 0
//       let totalConcessions = 0

//       const concessionsData = await ConcessionStudentMaster.query()
//         .select('concessions.amount')
//         .join('concessions', 'concession_student_masters.concession_id', '=', 'concessions.id')
//         .join('student_enrollments', 'concession_student_masters.student_enrollment_id', '=', 'student_enrollments.id')
//         .whereIn('student_enrollments.student_id', feesData.map(fee => fee.student_id)) // Assuming student_id is available in feesData
//         .exec();

//       concessionsData.forEach(concession => {
//         totalConcessions += concession.amount
//       })


//       const reportSummary = feesData.reduce((acc, fee) => {
//         const studentName = `${fee.first_name} ${fee.middle_name ? fee.middle_name + ' ' : ''}${fee.last_name}`;
//         const key = `${fee.academicSessionYear}-${fee.className}-${fee.divisionName || 'N/A'}`;

//         if (!acc[key]) {
//           acc[key] = {
//             academicSession: fee.academicSessionYear,
//             className: fee.className,
//             divisionName: fee.divisionName || 'N/A',
//             totalAmount: 0,
//             paidAmount: 0,
//             outstandingAmount: 0,
//             students: {}
//           };
//         }

//         if (!acc[key].students[studentName]) {
//           acc[key].students[studentName] = {
//             totalFee: 0,
//             paidFee: 0,
//             outstandingFee: 0,
//             feeBreakdown: {}
//           };
//         }

//         if (!acc[key].students[studentName].feeBreakdown[fee.feeTypeName]) {
//           acc[key].students[studentName].feeBreakdown[fee.feeTypeName] = {
//             totalAmount: 0,
//             paidAmount: 0,
//             outstandingAmount: 0
//           };
//         }

//         acc[key].totalAmount += fee.amount;
//         acc[key].paidAmount += fee.paidAmount;
//         acc[key].outstandingAmount += (fee.amount - fee.paidAmount);

//         acc[key].students[studentName].totalFee += fee.amount;
//         acc[key].students[studentName].paidFee += fee.paidAmount;
//         acc[key].students[studentName].outstandingFee += (fee.amount - fee.paidAmount);

//         acc[key].students[studentName].feeBreakdown[fee.feeTypeName].totalAmount += fee.amount;
//         acc[key].students[studentName].feeBreakdown[fee.feeTypeName].paidAmount += fee.paidAmount;
//         acc[key].students[studentName].feeBreakdown[fee.feeTypeName].outstandingAmount += (fee.amount - fee.paidAmount);


//         totalCollected += fee.paidAmount;
//         totalOutstanding += (fee.amount - fee.paidAmount);

//         return acc;
//       }, {});


//       return response.json({
//         summary: Object.values(reportSummary),
//         totals: {
//           totalCollected,
//           totalOutstanding,
//           totalConcessions
//         }
//       })
//     } catch (error) {
//       console.error(error)
//       return response.internalServerError({ message: 'Error generating annual report' })
//     }
//   }

//   /**
//    * Generate monthly fee report
//    */
//   public async monthlyReport({ request, response }: HttpContext) {
//     const { academicYear, classId, divisionId, month } = request.qs()

//     if (!month) {
//       return response.badRequest({ message: 'Month parameter is required' })
//     }

//     const monthNumber = parseInt(month, 10);
//     if (isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
//       return response.badRequest({ message: 'Invalid month parameter. Must be a number between 1 and 12.' })
//     }

//     try {
//       const query = StudentFeesInstallments.query()
//         .select(
//           'student_fees_installments.amount as amount',
//           'student_fees_installments.paid_amount as paidAmount',
//           'student_fees_installments.is_paid as isPaid',
//           'student_fees_installments.due_date as dueDate',
//           'fees_types.name as feeTypeName',
//           'students.first_name',
//           'students.middle_name',
//           'students.last_name',
//           'classes.name as className',
//           'divisions.name as divisionName',
//           'academic_sessions.year as academicSessionYear'
//         )
//         .join('student_fees_masters', 'student_fees_installments.student_fee_master_id', '=', 'student_fees_masters.id')
//         .join('students', 'student_fees_masters.student_id', '=', 'students.id')
//         .join('student_enrollments', 'students.id', '=', 'student_enrollments.student_id')
//         .join('academic_sessions', 'student_enrollments.academic_year', '=', 'academic_sessions.id')
//         .join('classes', 'student_enrollments.class_id', '=', 'classes.id')
//         .leftJoin('divisions', 'student_enrollments.division_id', '=', 'divisions.id')
//         .join('student_fees_plan_masters', 'student_fees_masters.student_fees_plan_master_id', '=', 'student_fees_plan_masters.id')
//         .join('fees_plans', 'student_fees_plan_masters.fees_plan_id', '=', 'fees_plans.id')
//         .join('fees_plan_details', 'fees_plans.id', '=', 'fees_plan_details.fees_plan_id')
//         .join('fees_types', 'fees_plan_details.fee_type_id', '=', 'fees_types.id')
//         .whereRaw('student_fees_installments.fees_type_id = fees_types.id') // Ensure correct join for fee type
//         .whereRaw(`EXTRACT(MONTH FROM student_fees_installments.due_date) = ${monthNumber}`);

//       if (academicYear) {
//         query.where('academic_sessions.id', academicYear)
//       }
//       if (classId) {
//         query.where('classes.id', classId)
//       }
//       if (divisionId) {
//         query.where('divisions.id', divisionId)
//       }

//       const feesData = await query.exec()

//       // Calculate total collected fees, outstanding fees, and concessions for the month
//       let totalCollected = 0
//       let totalOutstanding = 0
//       let totalConcessions = 0

//       const concessionsData = await ConcessionStudentMaster.query()
//         .select('concessions.amount')
//         .join('concessions', 'concession_student_masters.concession_id', '=', 'concessions.id')
//         .join('student_enrollments', 'concession_student_masters.student_enrollment_id', '=', 'student_enrollments.id')
//         .whereIn('student_enrollments.student_id', feesData.map(fee => fee.student_id)) // Assuming student_id is available in feesData
//         .exec();

//       concessionsData.forEach(concession => {
//         totalConcessions += concession.amount
//       })

//       const reportSummary = feesData.reduce((acc, fee) => {
//         const studentName = `${fee.first_name} ${fee.middle_name ? fee.middle_name + ' ' : ''}${fee.last_name}`;
//         const key = `${fee.academicSessionYear}-${fee.className}-${fee.divisionName || 'N/A'}`;

//         if (!acc[key]) {
//           acc[key] = {
//             academicSession: fee.academicSessionYear,
//             className: fee.className,
//             divisionName: fee.divisionName || 'N/A',
//             totalAmount: 0,
//             paidAmount: 0,
//             outstandingAmount: 0,
//             students: {}
//           };
//         }

//         if (!acc[key].students[studentName]) {
//           acc[key].students[studentName] = {
//             totalFee: 0,
//             paidFee: 0,
//             outstandingFee: 0,
//             feeBreakdown: {}
//           };
//         }

//         if (!acc[key].students[studentName].feeBreakdown[fee.feeTypeName]) {
//           acc[key].students[studentName].feeBreakdown[fee.feeTypeName] = {
//             totalAmount: 0,
//             paidAmount: 0,
//             outstandingAmount: 0
//           };
//         }

//         acc[key].totalAmount += fee.amount;
//         acc[key].paidAmount += fee.paidAmount;
//         acc[key].outstandingAmount += (fee.amount - fee.paidAmount);

//         acc[key].students[studentName].totalFee += fee.amount;
//         acc[key].students[studentName].paidFee += fee.paidAmount;
//         acc[key].students[studentName].outstandingFee += (fee.amount - fee.paidAmount);

//         acc[key].students[studentName].feeBreakdown[fee.feeTypeName].totalAmount += fee.amount;
//         acc[key].students[studentName].feeBreakdown[fee.feeTypeName].paidAmount += fee.paidAmount;
//         acc[key].students[studentName].feeBreakdown[fee.feeTypeName].outstandingAmount += (fee.amount - fee.paidAmount);

//         totalCollected += fee.paidAmount;
//         totalOutstanding += (fee.amount - fee.paidAmount);

//         return acc;
//       }, {});


//       return response.json({
//         summary: Object.values(reportSummary),
//         totals: {
//           totalCollected,
//           totalOutstanding,
//           totalConcessions
//         }
//       })
//     } catch (error) {
//       console.error(error)
//       return response.internalServerError({ message: 'Error generating monthly report' })
//     }
//   }



    // public async installmentWiseReportForClass(ctx: HttpContext) {

    //     // api/v1/fees-report/installment-wise-report-for-class?academicYear=1&classId=1&divisionId=1 

    //     let divisionId = ctx.request.input('divisionId')
    // }   
}