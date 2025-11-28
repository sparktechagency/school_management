import { Router } from 'express';
import { AnnouncementRoutes } from '../modules/announcment/announcement.routes';
import { AssignmentRoutes } from '../modules/assignment/assignment.routes';
import { AssignmentSubmissionRoutes } from '../modules/assignmentSubmission/assignmentSubmission.routes';
import { AttendanceRoutes } from '../modules/attendance/attendance.routes';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { ClassRoutes } from '../modules/class/class.routes';
import { ClassScheduleRoutes } from '../modules/classSchedule/classSchedule.routes';
import { ConversationRoutes } from '../modules/conversation/conversation.routes';
import { ExamRoutes } from '../modules/exam/exam.routes';
import { GradeSystemRoutes } from '../modules/gradeSystem/gradeSystem.routes';
import { LevelRoutes } from '../modules/level/level.routes';
import { NotificationRoutes } from '../modules/notification/notification.routes';
import { OverviewRoutes } from '../modules/overview/overview.routes';
import { PaymentRoutes } from '../modules/payment/payment.routes';
import { SchoolRoutes } from '../modules/school/school.routes';
import { StaticContentRoutes } from '../modules/staticContent/staticContent.routes';
import { StudentRoutes } from '../modules/student/student.routes';
import { SubjectRoutes } from '../modules/subject/subject.routes';
import { SubscriptionRoutes } from '../modules/subscription/subscription.routes';
import { TeacherRoutes } from '../modules/teacher/teacher.routes';
import { TermsRoutes } from '../modules/terms/terms.routes';
import { UserRoutes } from '../modules/user/user.routes';
import { FeedbackRoutes } from '../modules/feedback/feedback.routes';
import { ManagerRoutes } from '../modules/manager/manager.routes';
import { ClassSectionSupervisorRoutes } from '../modules/classSectionSuperVisor/ClassSectionSupervisor.route';
import { StudentReportRoutes } from '../modules/studentReport/studentReport.route';
import { StudentNoteRoutes } from '../modules/studentNote/studentNote.route';
import { ClassPeriodRoutes } from '../modules/classPeriod/classPeriod.route';
import { ClassRoutineRoutes } from '../modules/classRoutine/classRoutine.route';
import { AssignedSubjectTeacherRoutes } from '../modules/assignedSubjectTeacher/assignedSubjectTeacher.route';
import { AttendancePeriodRoutes } from '../modules/attendancePeriod/attendancePeriod.route';

const router = Router();

type TRoutes = {
  path: string;
  route: Router;
};

const routes: TRoutes[] = [
  {
    path: '/users',
    route: UserRoutes,
  },
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/school',
    route: SchoolRoutes,
  },
  {
    path: '/teacher',
    route: TeacherRoutes,
  },
  {
    path: '/student',
    route: StudentRoutes,
  },
  {
    path: '/student_report',
    route: StudentReportRoutes
  },
  {
    path: '/student_note',
    route: StudentNoteRoutes
  },
  {
    path: '/manager',
    route: ManagerRoutes,
  },
  {
    path: '/level',
    route: LevelRoutes,
  },
  {
    path: '/class',
    route: ClassRoutes,
  },
  {
    path: '/class_schedule',
    route: ClassScheduleRoutes,
  },
  {
    path: '/class_section_supervisor',
    route: ClassSectionSupervisorRoutes
  },
  {
    path: '/class_routine',
    route: ClassRoutineRoutes
  },
  {
    path: "/class_period",
    route: ClassPeriodRoutes
  },

  {
    path: "/attendance_period",
    route: AttendancePeriodRoutes
  },
  {
    path: '/attendance',
    route: AttendanceRoutes,
  },
  {
    path: '/assignment',
    route: AssignmentRoutes,
  },
  {
    path: '/assignment_submission',
    route: AssignmentSubmissionRoutes,
  },

  {
    path: "/assign_teacher",
    route: AssignedSubjectTeacherRoutes
  },
  {
    path: '/subject',
    route: SubjectRoutes,
  },
  {
    path: '/terms',
    route: TermsRoutes,
  },
  {
    path: '/exam',
    route: ExamRoutes,
  },
  {
    path: '/grade_system',
    route: GradeSystemRoutes,
  },
  {
    path: '/overview',
    route: OverviewRoutes,
  },
  {
    path: '/announcement',
    route: AnnouncementRoutes,
  },
  {
    path: '/payment',
    route: PaymentRoutes,
  },
  {
    path: '/subscription',
    route: SubscriptionRoutes,
  },
  {
    path: '/conversation',
    route: ConversationRoutes,
  },
  {
    path: '/notification',
    route: NotificationRoutes,
  },
  {
    path: '/static_content',
    route: StaticContentRoutes,
  },
  {
    path: '/feedback',
    route: FeedbackRoutes,
  },
];

routes.forEach((item) => {
  router.use(item.path, item.route);
});

export default router;
