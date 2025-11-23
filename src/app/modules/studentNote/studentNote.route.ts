import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { USER_ROLE } from '../../constant';
import { StudentNoteController } from './studentNote.controller';

const router = Router();

// CREATE NOTE
router.post(
  '/create',
  auth(USER_ROLE.school, USER_ROLE.manager, USER_ROLE.teacher),
  StudentNoteController.addNote,
)

// GET NOTES BY STUDENT ID
.get(
  '/student/:studentId',
  auth(
    USER_ROLE.school,
    USER_ROLE.manager,
    USER_ROLE.teacher,
    USER_ROLE.supperAdmin,
  ),
  StudentNoteController.getNotesByStudentId,
)

// GET ALL NOTES BY CLASS + SECTION
.get(
  '/specefic_class_section',
  // auth(
  //   USER_ROLE.school,
  //   USER_ROLE.manager,
  //   USER_ROLE.teacher,
  //   USER_ROLE.supperAdmin,
  // ),
  StudentNoteController.getAllNotesByClassIdAndSection,
)

  .get(
    "/school/:schoolId",
    StudentNoteController.getAllNotesBySchool
  )

export const StudentNoteRoutes = router;
