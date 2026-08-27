/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'
import AuthController from '#controllers/AuthController'
import ClassesController from '#controllers/ClassesController'
import UsersController from '#controllers/UsersController'
import StundetsController from '#controllers/StudentController'
import StaffMasterController from '#controllers/StaffMasterController'
import SchoolsController from '#controllers/SchoolsController'
import LeavesController from '#controllers/LeavesController'
import AttendanceController from '#controllers/AttendancesController'
import InquiriesController from '#controllers/InquiriesController'
import FeesController from '#controllers/FeesController'
import OrganizationController from '#controllers/OrganizationController'
import StaffController from '#controllers/StaffController'
import StaffExperiencesController from '#controllers/staff_experiences_controller'
import ClassSeatAvailabilitiesController from '#controllers/ClassSeatAvailabilitiesController'
import QuotasController from '#controllers/QuotaController'
import QuotaAllocationsController from '#controllers/QuotaAllocationController'
import AdmissionDashboardController from '#controllers/AdmissionDashboardController'
import GlobalSearchController from '#controllers/GlobalSearchController'
import StudentManagementController from '#controllers/StudentManagementController'
import PayrollController from '#controllers/PayrollController'
import StaffAttendanceController from '#controllers/StaffAttendanceController'
import SubjectController from '#controllers/SubjectController'
import TimeTableController from '#controllers/TimeTableController'
import ReportController from '#controllers/ReportController'
import AcademicCalendarSettingsController from '#controllers/AcademicCalendarSettingsController'
import DepartmentController from '#controllers/departments_controller'
import BatchesController from '#controllers/BatchesController'
import LessonPlanController from '#controllers/lesson_plans_controller'
import DailyDiaryController from '#controllers/daily_diaries_controller'
import DiaryLogPermissionsController from '#controllers/diary_log_permissions_controller'
import ChatController from '#controllers/ChatController'
import StaffConfigurationsController from '#controllers/StaffConfigurationsController'
import DeadStocksController from '#controllers/dead_stocks_controller'
import DeadStockTransactionsController from '#controllers/dead_stock_transactions_controller'
import InventoryDepartmentsController from '#controllers/inventory_departments_controller'
import PayrollSettingsController from '#controllers/payroll_settings_controller'

router.get('/', async () => {
  return { status: 'ok', message: 'Server is running' }
})

router
  .group(() => {
    router.post('/signup', [AuthController, 'createSchool'])
    router.post('/login', [AuthController, 'login'])
    router.post('/reset-password', [AuthController, 'resetPassword'])
  })
  .prefix('/api/v1/')

router
  .group(() => {
    router.get('/verify', [AuthController, 'verifyUser'])
    router.get('/logout', [AuthController, 'logout'])
    router.get('/organizations', [OrganizationController, 'getAllOrganization'])
    router.post('/onboard-organization', [OrganizationController, 'onboardOrganization'])
    router.get('/organization/:id', [OrganizationController, 'getOrganizationById'])
    router.put('/organization/:id', [OrganizationController, 'updateOrganizationById'])
    router.delete('/organization/:id', [OrganizationController, 'deleteOrganization'])
    router.get('/super-admin/organizations/:organization_id/entities', [OrganizationController, 'getEntities'])
    router.post('/super-admin/organizations/:organization_id/entities', [OrganizationController, 'createEntity'])

    // Department Management
    router.get('/departments', [DepartmentController, 'index'])
    router.post('/departments', [DepartmentController, 'store'])
    router.put('/departments/:id', [DepartmentController, 'update'])
    router.delete('/departments/:id', [DepartmentController, 'destroy'])

    // Org-level Reports
    router.get('/organization/:organization_id/reports/aggregated', [ReportController, 'getOrganizationAggregatedReport'])
    router.get('/entity/:entity_id/reports/detailed', [ReportController, 'getEntityDetailedReport'])

    router.get('/stats', [SchoolsController, 'fetchSchoolDataForDashBoard'])
    router.get('/school/:school_id', [SchoolsController, 'index'])
    router.put('/school/:school_id', [SchoolsController, 'update'])

    // AcademicSession routes removed - AcademicSessionsController no longer exists
    // router.post('/academic-session', [AcademicSessionsController, 'createAcademicSessionForSchool'])
    // router.put('/academic-session/:id', [
    //   AcademicSessionsController,
    //   'updateAcademicSessionForSchool',
    // ])
    // router.get('/academic-sessions/:school_id', [
    //   AcademicSessionsController,
    //   'getAllAcademicSessionInSchool',
    // ])
    // router.delete('/academic-session/:id', [AcademicSessionsController, 'deleteAcademicSession'])

    router.get('/academic-calendar-settings/:academic_session_id', [
      AcademicCalendarSettingsController,
      'getSettings',
    ])
    router.put('/academic-calendar-settings/:academic_session_id', [
      AcademicCalendarSettingsController,
      'upsertSettings',
    ])

    router.get('/users', [UsersController, 'indexSchoolUsers'])
    router.post('/user', [UsersController, 'createUser'])
    router.put('/user/:user_id', [UsersController, 'updateUser'])
    router.post('/user/onboard/staff', [UsersController, 'onBoardStaffAsUser'])
    router.put('/user/onboard/staff/:user_id', [UsersController, 'UpdateOnBoardedStaff'])

    router.get('/classes/:school_id', [ClassesController, 'indexClassesForSchool'])
    router.post('/class/base', [ClassesController, 'createClass'])
    router.post('/classes', [ClassesController, 'createMultipleClasses'])
    router.post('/class/division', [ClassesController, 'createDivision'])
    router.put('/class/:division_id', [ClassesController, 'updateClass'])

    // Batch Management
    router.get('/batches', [BatchesController, 'index'])
    router.post('/batches', [BatchesController, 'store'])
    router.get('/batches/:id', [BatchesController, 'show'])
    router.put('/batches/:id', [BatchesController, 'update'])
    router.delete('/batches/:id', [BatchesController, 'destroy'])

    // API to get the Global Search Results
    router.get('student/search', [GlobalSearchController, 'getStuentSearchResults'])
    router.get('staff/search', [GlobalSearchController, 'getStaffSearchResults'])

    router.get('students/:academic_year/:division_id', [
      StundetsController,
      'indexClassStudents',
    ])
    router.get('student/:student_id', [StundetsController, 'fetchStudent'])
    router.get('student/detail/:student_id', [StundetsController, 'fetchStudentInDetail'])
    router.get('students/:class_id', [StundetsController, 'indexClassStudents'])
    router.get('student/:school_id/:student_id', [StundetsController, 'fetchStudent'])
    router.post('student', [StundetsController, 'createSingleStudent'])
    router.post('students/multiple/:class_id', [StundetsController, 'createMultipleStudents'])
    router.put('student/:student_id', [StundetsController, 'updateStudents'])
    router.post('students/bulk-upload/:academic_year/:division_id', [
      StundetsController,
      'bulkUploadStudents',
    ])
    router.post('students/export/:academic_year/:class_id', [
      StundetsController,
      'exportToExcel',
    ])

    router.get('/staff-role/:school_id', [StaffMasterController, 'indexStaffMasterForSchool'])
    router.post('/staff-role', [StaffMasterController, 'createStaffRole'])
    router.put('/staff-role/:id', [StaffMasterController, 'updateStaffRole'])
    router.delete('/staff-role/:id', [StaffMasterController, 'deleteStaffRole'])

    router.get('staff', [StaffController, 'indexStaff'])
    router.get('staff/:id', [StaffController, 'findStaffById'])
    router.post('staff', [StaffController, 'createStaff'])
    router.put('staff/:staff_id', [StaffController, 'updateStaff'])
    router.delete('staff/:staff_id', [StaffController, 'destroyStaff'])
    router.post('staff/bulk-upload', [StaffController, 'bulkUploadStaff'])
    router.post('staff/export/:school_id/:academic_session_id/', [StaffController, 'exportToExcel'])
    router.post('staff/experience/upload', [StaffExperiencesController, 'bulkUpload'])
    
    // Staff Configurations
    router.get('staff-configurations', [StaffConfigurationsController, 'index'])
    router.post('staff-configurations', [StaffConfigurationsController, 'store'])
    router.put('staff-configurations/:id', [StaffConfigurationsController, 'update'])
    router.delete('staff-configurations/:id', [StaffConfigurationsController, 'destroy'])

    // Add new routes for leave management
    router
      .group(() => {
        // Leave type and policy routes (existing)
        router.get('leave-type', [LeavesController, 'indexLeaveTypesForSchool'])
        router.post('leave-type', [LeavesController, 'createLeaveTypeForSchool'])
        router.put('leave-type/:leave_type_id', [LeavesController, 'updateLeaveTypeForSchool'])
        router.get('leave-policy', [LeavesController, 'indexLeavePolicyForSchool'])
        router.get('leave-policy/user', [LeavesController, 'indexLeavePolicyForUser'])
        router.post('leave-policy', [LeavesController, 'createLeavePolicyForSchool'])
        router.put('leave-policy/:leave_policy_id', [
          LeavesController,
          'updateLeavePolicyForSchool',
        ])

        // Enhanced leave management routes
        router.get('leave-applications/:staff_id', [LeavesController, 'fetchLeaveApplication'])
        router.get('leave-applications', [LeavesController, 'fetchLeaveApplicationForAdmin'])
        router.post('leave-application', [LeavesController, 'applyForLeave'])
        router.put('leave-application/:uuid', [LeavesController, 'updateAppliedLeave'])
        router.put('leave-application/withdraw/:uuid', [
          LeavesController,
          'withdrawLeaveApplication',
        ])
        router.put('leave-application/status/:uuid', [
          LeavesController,
          'approveTeachersLeaveApplication',
        ])

        // New routes for enhanced functionality
        router.get('leave-balances/:staff_id', [LeavesController, 'fetchStaffLeaveBalances'])
        router.get('leave-logs/:id', [LeavesController, 'getLeaveApplicationLogs'])
        router.post('leave/staff/search', [LeavesController, 'searchStaff'])
        router.post('leave/carry-forward', [LeavesController, 'processLeaveCarryForward'])
      })
      .use(middleware.auth())

    // payroll
    router.get('/payroll/salary-component', [PayrollController, 'indexSalaryComponents'])
    router.post('/payroll/salary-component', [PayrollController, 'createSalaryComponent'])
    router.put('/payroll/salary-component/:component_id', [
      PayrollController,
      'updateSalaryComponent',
    ])
    router.delete('/payroll/salary-component/:component_id', [
      PayrollController,
      'deleteSalaryComponent',
    ])

    // payroll settings
    router.get('/payroll/settings', [PayrollSettingsController, 'getSettings'])
    router.put('/payroll/settings', [PayrollSettingsController, 'updateSettings'])

    router.get('/payroll/salary-template', [PayrollController, 'indexSalaryTemplates'])
    router.get('/payroll/salary-template/:template_id', [
      PayrollController,
      'fetchSingleSalaryTemplate',
    ])
    router.post('/payroll/salary-template', [PayrollController, 'createSalaryTemplate'])
    router.put('/payroll/salary-template/:template_id', [PayrollController, 'updateSalaryTemplate'])

    router.get('/payroll/staff-salary-template/:staff_id', [
      PayrollController,
      'fetchSalaryTemplateForSingleStaff',
    ])
    router.post('/payroll/staff-salary-template', [PayrollController, 'createStaffSalaryTemplate'])
    router.put('/payroll/staff-salary-template/:staff_id/:template_id', [
      PayrollController,
      'updateStaffSalaryTemplate',
    ])

    router.get('/payroll/staff', [PayrollController, 'fetchStaffWithSalaryTemplates'])
    router.post('/payroll/payrun', [PayrollController, 'createPayRunForStaff'])
    router.put('payroll/payrun/:staff_id/:payrun_template_id', [
      PayrollController,
      'udpdatePayRunTemplate',
    ])

    // routes for the class seat availability
    router.post('/classes/seats', [ClassSeatAvailabilitiesController, 'addSeatAvailability'])
    router.get('/classes/seats/all', [
      ClassSeatAvailabilitiesController,
      'getAllClassesSeatAvailability',
    ])
    router.get('/classes/seats/:class_id', [
      ClassSeatAvailabilitiesController,
      'getSeatAvailability',
    ])
    router.put('/classes/seats/:class_id', [
      ClassSeatAvailabilitiesController,
      'updateSeatAvailability',
    ])

    // routes for the quota
    router.post('/quota', [QuotasController, 'createQuotaForSeats'])
    router.get('/quota/all', [QuotasController, 'listAllQuotas'])
    router.put('/quota/:id', [QuotasController, 'updateQuota'])
    router.delete('/quota/:id', [QuotasController, 'delete'])

    // routes for the quota allocation
    router.post('/quota-allocation/', [QuotaAllocationsController, 'allocateQuotaToClass'])
    // router.get('/quota-allocation/all', [QuotaAllocationsController, 'listAllQuotaAllocation'])
    router.put('/quota-allocation/:quota_allocation_id', [
      QuotaAllocationsController,
      'updateTotalSeats',
    ])

    router.get('attendance/:class_id/:unix_date', [AttendanceController, 'getAttendanceDetails'])
    router.post('attendance', [AttendanceController, 'markAttendance'])

    /**Fees */

    router.get('/feestype', [FeesController, 'indexFeesTyeForSchool'])
    router.get('/feestype/filter', [FeesController, 'indexFeesTypeByFilter'])
    router.post('/feestype', [FeesController, 'createFeesType'])
    router.put('/feestype/:id', [FeesController, 'updateFeesType'])
    router.delete('/feestype/:id', [FeesController, 'deleteFeesType'])
    router.get('/feesplan', [FeesController, 'indexFeesPlanForSchool'])
    router.get('/feesplan/status/:plan_id/:status', [FeesController, 'updateFeesPlanStatus'])
    router.get('/feesplan/detail/:plan_id', [FeesController, 'fetchFeesPlanDetails'])
    router.post('/feesplan', [FeesController, 'createFeePlan'])
    router.post('/feesplan/applyextrafees', [FeesController, 'applyFeesTypeToStudentFeesPlan'])
    router.put('/feesplan/:plan_id', [FeesController, 'updatePlan'])
    router.delete('/feesplan/:plan_id', [FeesController, 'deleteFeesPlan'])

    router.get('/fees/status/class/:division_id', [FeesController, 'fetchFeesStatusForClass'])
    router.get('/fees/status/student/:student_id', [
      FeesController,
      'fetchFeesStatusForSingleStudent',
    ])
    // router.post('/fees/pay/:student_id', [FeesController, 'payFees'])
    router.post('/fees/pay/installments', [FeesController, 'payMultipleInstallments'])
    router.post('/fees/pay/extra/installments', [FeesController, 'payMultipleInstallmentsForExtraFees'])
     router.put('/transaction/:stundet_fees_master_id/:transaction_id', [FeesController, 'updateStatusOfPaidInstallments'])
    router.put('/transaction/reverse/:stundet_fees_master_id/:transaction_id', [FeesController, 'reversePaidInstallments'])

    router.get('/feesplan/installments/:division_id', [FeesController, 'fetchFeesTyesWithInstallmentsForClass'])

    router.get('/fees/report/installmentwisereport/:division_id/:fees_type_id/:installment_id', [FeesController, 'installmentWiseReportClass'])
    router.get('/fees/report/feestypewiseReport/:division_id/:fees_type_id/', [FeesController, 'feesTypesWiseReportClass'])

    /**concessions */
    router.get('/concessions', [FeesController, 'indexConcessionType'])
    router.get('/concessions/all', [FeesController, 'indexAllConcessionType'])
    router.get('/concession/:concession_id', [FeesController, 'fetchDetailConcessionType'])
    router.get('/concession/holder-students/:concession_id', [FeesController, 'fetchConcessionHolderStudents'])
    router.post('/concession', [FeesController, 'createConcession'])
    router.put('/concession/:concession_id', [FeesController, 'updateConcession'])
    router.post('/concession/apply/plan', [FeesController, 'applyConcessionToPlan'])
    router.put('/concession/plan/:concession_id/:plan_id', [
      FeesController,
      'updateAppliedConcessionToPlan',
    ])
    router.post('/concession/apply/student', [FeesController, 'applyConcessionToStudent'])
    router.put('/concession/student/:concession_id/:plan_id/:student_id', [
      FeesController,
      'updateConcessionAppliedToStudent',
    ])

    router.get('/inquiries', [InquiriesController, 'listAllInquiries'])
    router.post('/inquiry', [InquiriesController, 'addInquiryForClass'])
    router.get('/inquiry/:id', [InquiriesController, 'getInquiryById'])
    router.put('/inquiry/:id', [InquiriesController, 'updateInquiry'])
    router.post('/inquiry/convert/:inquiry_id', [InquiriesController, 'convertInquiryToStudent'])

    router.get('admissions/dashboard', [AdmissionDashboardController, 'getDashboardData'])
    router.get('admissions/dashboard/detailed', [
      AdmissionDashboardController,
      'getDetailedStatistics',
    ])
    router.get('admissions/dashboard/trends', [AdmissionDashboardController, 'getTrendData'])

    // Student Mangement --- Permotion, demotion, and drop and transfer
    // Get students eligible for promotion
    router.post('/students-for-permotion', [StudentManagementController, 'getStudentsForPromotion'])
    router.post('/promote-students', [StudentManagementController, 'promote'])
    router.post('/bulk-promote', [StudentManagementController, 'bulkPromote'])
    router.post('/hold-back-student', [StudentManagementController, 'holdBackStudent'])
    router.post('/bulk-hold-back-students', [StudentManagementController, 'bulkHoldBackStudents'])
    router.get('/promotion-history/:academic_session_id', [
      StudentManagementController,
      'getPromotionHistory',
    ])

    router.get('/management/students/:division_id' , [StudentManagementController , 'indexStudentForManagement'])
    router.post('/management/student/migrate/:student_enrollment_id' , [StudentManagementController , 'updateEnrollmentStatusToMigrate'])
    router.post('/management/student/complete/:student_enrollment_id' , [StudentManagementController , 'updateEnrollmentStatusToComplete'])
    router.post('/management/student/suspend/:student_enrollment_id' , [StudentManagementController , 'updateEnrollmentStatusToSuspended'])
    router.post('/management/student/drop/:student_enrollment_id' , [StudentManagementController , 'updateEnrollmentStatusToDrop'])


    router.get('subjects', [SubjectController, 'indexSubjects'])
    router.post('subject', [SubjectController, 'createSubject'])
    router.get('subjects/division/:division_id', [SubjectController, 'indexSubjectsForDivision'])
    router.put('subject/:subject_id', [SubjectController, 'updateSubject'])
    router.delete('subject/:subject_id', [SubjectController, 'destroySubject'])
    router.post('subject/assign', [SubjectController, 'assignSubjectToDivision'])
    router.post('subject/assign/staffs', [SubjectController, 'assignStaffToSubject'])

    // time table
    router.get('timetable/config/:academic_year', [
      TimeTableController,
      'getSchoolTimeTableConfig',
    ])
    router.post('timetable/config', [
      TimeTableController,
      'createSchoolTimeTableConfig',
    ])
    router.put('timetable/config/:id', [
      TimeTableController,
      'updateSchoolTimeTableConfig',
    ])
    router.post('timetable/config/lab', [
      TimeTableController,
      'createLabConfig',
    ])
    router.put('timetable/config/lab/:lab_id', [
      TimeTableController,
      'updateLabConfig',
    ])
    router.delete('timetable/config/lab/:lab_id', [
      TimeTableController,
      'deleteLabConfig',
    ])
    router.post('timetable/config/class/day', [TimeTableController ,'createClassDayConfig'])
    router.put('timetable/config/class/day/:class_id/:class_day_config_id', [TimeTableController ,'updateClassDayConfig'])
    router.delete('timetable/config/class/day/:id', [TimeTableController ,'deleteClassDayConfig'])
    router.get('timetable/teacher', [TimeTableController, 'getTeacherTimetable'])
    router.get('timetable/teacher/availability', [TimeTableController, 'getTeacherAvailability'])
    router.get('timetable/:division_id', [TimeTableController ,'fetchTimeTableForDivision'])
    router.get('timetable/export/:division_id', [TimeTableController ,'exportTimeTablePDF'])
    router.post('timetable/verify/config/period', [TimeTableController ,'checkAvailabilityForConfiguredPeriod'])
    router.post('timetable/auto-generate/:division_id', [TimeTableController ,'generateWeeklyTimeTableForClass'])
    router.post('timetable/config/period', [TimeTableController ,'createTimeTableForDivisionForADay'])    
    router.put('timetable/config/period', [TimeTableController ,'updateTimeTableForDivisionForADay'])        
    router.put('timetable/config/period/week', [TimeTableController ,'updateTimeTableForDivisionForWeek'])
    router.delete('timetable/config/period/all/:class_day_config_id', [TimeTableController ,'deleteAllPeriodsForClassDayConfig'])
    router.delete('timetable/config/:school_timetable_config_id/:division_id', [TimeTableController ,'deleteTimeTableForDivision'])

    // Lesson Plans
    router.get('lesson-plans', [LessonPlanController, 'index'])
    router.get('lesson-plans/subject/:subjectId', [LessonPlanController, 'getBySubject'])
    router.post('lesson-plans', [LessonPlanController, 'store'])
    router.post('lesson-plans/:id/topics', [LessonPlanController, 'addTopic'])
    router.get('lesson-plans/reports/coverage/:academicSessionId', [LessonPlanController, 'getCoverageReport'])
    router.post('lesson-plans/reports/export/:academicSessionId', [LessonPlanController, 'exportPDF'])
    router.post('lesson-plans/bulk-upload', [LessonPlanController, 'bulkUploadSyllabus'])
    router.delete('lesson-plans/subject/:subjectId', [LessonPlanController, 'deleteBySubject'])
    router.patch('lesson-plans/topics/:id/status', [LessonPlanController, 'updateTopicStatus'])
    router.patch('lesson-plans/subtopics/:id/status', [LessonPlanController, 'updateSubtopicStatus'])
    router.put('lesson-plans/topics/:id/assign', [LessonPlanController, 'assignTopicToTeacher'])
    router.put('lesson-plans/subtopics/:id/assign', [LessonPlanController, 'assignSubtopicToTeacher'])
    router.get('lesson-plans/export/:subjectId/:lpNumber', [LessonPlanController, 'exportLP'])

    // Daily Diaries
    router.get('daily-diaries', [DailyDiaryController, 'getLogsByDateRange'])
    router.post('daily-diaries', [DailyDiaryController, 'store'])

    // Diary Log Permissions
    router.get('diary-log-permissions', [DiaryLogPermissionsController, 'index'])
    router.post('diary-log-permissions', [DiaryLogPermissionsController, 'store'])
    router.delete('diary-log-permissions/:id', [DiaryLogPermissionsController, 'destroy'])


    router.post('staff-attendance/check-in', [StaffAttendanceController, 'checkIn'])
    router.post('staff-attendance/check-out', [StaffAttendanceController, 'checkOut'])
    router.post('staff-attendance/edit-request', [StaffAttendanceController, 'requestEdit'])

    // Admin functions
    router.post('staff-attendance/admin-mark', [StaffAttendanceController, 'adminMarkAttendance'])
    router.put('staff-attendance/edit-request/:id', [
      StaffAttendanceController,
      'processEditRequest',
    ])
    router.get('staff-attendance/edit-requests', [StaffAttendanceController, 'getEditRequests'])

    // View attendance
    router.get('staff-attendance/:staff_id', [StaffAttendanceController, 'getStaffAttendance'])

    // Internal Messaging Feature
    router.get('/chat/colleagues', [ChatController, 'indexColleagues'])
    router.get('/chat/rooms', [ChatController, 'indexRooms'])
    router.post('/chat/rooms', [ChatController, 'createRoom'])
    router.get('/chat/rooms/:id/messages', [ChatController, 'indexMessages'])
    router.post('/chat/rooms/:id/messages', [ChatController, 'createMessage'])
    router.post('/chat/rooms/:id/members', [ChatController, 'addMembers'])
    router.delete('/chat/rooms/:id/members/:userId', [ChatController, 'removeMember'])
    router.post('/chat/rooms/:id/read', [ChatController, 'markRead'])

    // Dead Stock Management
    router.get('dead-stocks', [DeadStocksController, 'index'])
    router.post('dead-stocks', [DeadStocksController, 'store'])
    router.get('dead-stocks/:id', [DeadStocksController, 'show'])

    // Dead Stock Transactions
    router.post('dead-stocks/issue', [DeadStockTransactionsController, 'issue'])
    router.post('dead-stocks/return', [DeadStockTransactionsController, 'returnStock'])
    router.post('dead-stocks/discard', [DeadStockTransactionsController, 'discard'])
    router.post('dead-stocks/transfer', [DeadStockTransactionsController, 'transfer'])

    // Inventory Departments
    router.get('inventory-departments', [InventoryDepartmentsController, 'index'])
    router.post('inventory-departments', [InventoryDepartmentsController, 'store'])
    router.get('inventory-departments/:id', [InventoryDepartmentsController, 'show'])
    router.put('inventory-departments/:id', [InventoryDepartmentsController, 'update'])
    router.delete('inventory-departments/:id', [InventoryDepartmentsController, 'destroy'])
  })
  .prefix('/api/v1/')
  .use(middleware.auth())
