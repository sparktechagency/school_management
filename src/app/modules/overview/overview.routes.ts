import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { USER_ROLE } from '../../constant';
import OverviewController from './overview.controller';

const router = Router();

router
  .get(
    '/teacher_overview',
    auth(USER_ROLE.teacher),
    OverviewController.getTeacherHomePageOverview,
  )
  
  .get(
    '/daily_weekly_monthly_attendance_rate',
    auth(USER_ROLE.teacher),
    OverviewController.getDailyWeeklyMonthlyAttendanceRate,
  )

  .get(
    '/daily_weekly_monthly_attendance_rate/Specific_class_section',
    // auth(USER_ROLE.teacher),
    OverviewController.getDailyWeeklyMonthlyAttendanceRateOfSpecificClassIdAndSection,
  )

    .get(
    '/daily_weekly_monthly_attendance_rate/Specific_school',
    auth(USER_ROLE.teacher, USER_ROLE.school),
    OverviewController.getDailyWeeklyMonthlyAttendanceRateOfSchool,
  )

  
  .get(
    '/assignment_count',
    auth(USER_ROLE.teacher),
    OverviewController.getAssignmentCount,
  )
  .get(
    '/student_attendance',
    auth(USER_ROLE.student, USER_ROLE.parents, USER_ROLE.school),
    OverviewController.getStudentAttendance,
  )
  .get(
    '/student_overview',
    auth(USER_ROLE.student),
    OverviewController.getStudentHomePageOverview,
  )
  .get(
    '/parent_overview',
    auth(USER_ROLE.parents),
    OverviewController.getParentHomePageOverview,
  )
  .get(
    '/admin_overview',
    auth(USER_ROLE.admin),
    OverviewController.getAdminHomePageOverview,
  )

  .get(
  '/admin/home-overview',
  auth(USER_ROLE.school, USER_ROLE.manager), // apply roles as needed
  OverviewController.getHomePageOnlyOverviewOfAdminWithinApp
)

  

export const OverviewRoutes = router;
