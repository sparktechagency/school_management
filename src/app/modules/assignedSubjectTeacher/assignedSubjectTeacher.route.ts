import { Router } from "express";
import { AssignedSubjectTeacherController } from "./assignedSubjectTeacher.controller";


const router = Router();


router
     .post(
        "/add",
        AssignedSubjectTeacherController.assignSubjectTeacher
      )


export const AssignedSubjectTeacherRoutes = router;