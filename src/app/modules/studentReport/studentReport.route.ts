import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { USER_ROLE } from '../../constant';
import { StudentReportController } from './studentReport.controller';
import fileUpload from '../../utils/uploadImage';
import parseFormData from '../../middleware/parsedData';
const upload = fileUpload('./public/uploads/report_files/');

const router = Router();

router
  .post(
    '/create',
    auth(USER_ROLE.school, USER_ROLE.manager, USER_ROLE.teacher),
    upload.single('image'),
    parseFormData,
    StudentReportController.addReport,
  )

  .get(
    '/student/:studentId',
    auth(
      USER_ROLE.school,
      USER_ROLE.manager,
      USER_ROLE.teacher,
      USER_ROLE.supperAdmin,
    ),
    StudentReportController.getReportsByStudentId,
  )

  .get(
    '/specefic_class_section',
    // auth(
    //   USER_ROLE.school,
    //   USER_ROLE.manager,
    //   USER_ROLE.teacher,
    //   USER_ROLE.supperAdmin,j
    // ),
    StudentReportController.getAllReportsByClassIdAndSection,
  )

  .get(
    "/school/:schoolId",
    StudentReportController.getAllReportsBySchool
  )

export const StudentReportRoutes = router;
