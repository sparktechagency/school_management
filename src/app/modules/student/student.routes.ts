import { Router } from 'express';
import { USER_ROLE } from '../../constant';
import { auth } from '../../middleware/auth';
import validateRequest from '../../middleware/validation';
import fileUpload from '../../utils/uploadImage';
import { StudentController } from './student.controller';
import { StudentValidation } from './student.validation';

const upload = fileUpload('./public/uploads/files/');

const router = Router();

router
  .post(
    '/create',
    auth(USER_ROLE.admin, USER_ROLE.supperAdmin, USER_ROLE.school),
    validateRequest(StudentValidation.studentSchema),
    StudentController.createStudent,
  )
  
  .post(
    '/create_student_using_xlsx',
    auth(
      USER_ROLE.admin,
      USER_ROLE.supperAdmin,
      USER_ROLE.school,
      USER_ROLE.manager,
    ),
    upload.single('file'),
    StudentController.createStudentUsingXlsx,
  )

  .patch(
    "/terminate",
    auth(USER_ROLE.admin, USER_ROLE.supperAdmin, USER_ROLE.school, USER_ROLE.teacher),
    StudentController.terminateStudentByTeacher
  )

  .patch(
    "/terminate/remove/:studentId",
    auth(USER_ROLE.admin, USER_ROLE.supperAdmin, USER_ROLE.school, USER_ROLE.teacher),
    StudentController.removeTermination
  )

  .patch(
    "/summoned",
    auth(USER_ROLE.admin, USER_ROLE.supperAdmin, USER_ROLE.school, USER_ROLE.teacher),
    StudentController.summonStudent
  )

    .patch(
    "/summoned/remove/:studentId",
    auth(USER_ROLE.admin, USER_ROLE.supperAdmin, USER_ROLE.school, USER_ROLE.teacher),
    StudentController.removeSummoned
  )

  .get(
    '/student_list',
    auth(USER_ROLE.admin, USER_ROLE.supperAdmin, USER_ROLE.school),
    StudentController.getAllStudents,
  )

  .get(
    '/specefic_student_list',
    auth(USER_ROLE.admin, USER_ROLE.supperAdmin, USER_ROLE.school, USER_ROLE.teacher),
    StudentController.getAllStudentsListOfSpecificClassIdAndSection,
  )

  .get('/my_child', auth(USER_ROLE.parents), StudentController.getMyChildren)

  .get(
    '/parents_list',
    auth(USER_ROLE.parents, USER_ROLE.admin, USER_ROLE.supperAdmin),
    StudentController.getParentsList,
  )
  .get(
    '/parents_details/:parentUserId',
    auth(USER_ROLE.supperAdmin),
    StudentController.getParentsDetails,
  )
  .get(
    '/select_child/:userId',
    auth(USER_ROLE.parents),
    StudentController.selectChild,
  )
  .get(
    "/terminated_students",
    auth(USER_ROLE.admin, USER_ROLE.supperAdmin, USER_ROLE.school),
    StudentController.getTerminatedStudentsBySchool
  )

  .get(
    "/summoned_students",
    auth(USER_ROLE.admin, USER_ROLE.supperAdmin, USER_ROLE.school),
    StudentController.getAllSummonedStudentBySchool
  )

  .get(
    "/generate_report_data/:studentId",
    auth(USER_ROLE.admin, USER_ROLE.supperAdmin, USER_ROLE.school, USER_ROLE.teacher, USER_ROLE.student, USER_ROLE.parents),
    StudentController.getSpecificStudentReport
  )


  .patch(
    '/edit_student/:studentId',
    auth(USER_ROLE.admin, USER_ROLE.supperAdmin, USER_ROLE.school),
    StudentController.editStudent,
  )
  .delete(
    '/delete_student/:studentId',
    auth(USER_ROLE.admin, USER_ROLE.supperAdmin, USER_ROLE.school),
    StudentController.deleteStudent,
  );

export const StudentRoutes = router;
