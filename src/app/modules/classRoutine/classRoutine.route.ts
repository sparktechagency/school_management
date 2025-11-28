import { Router } from "express";
import { ClassRoutineController } from "./classRoutine.controller";
import { auth } from "../../middleware/auth";
import { USER_ROLE } from "../../constant";

const router = Router();

router
    .get(
        "/Specific_class_section",
        ClassRoutineController.getRoutineByClassAndSection  
    )

    .get(
        "/unique_subjects",
        auth(USER_ROLE.school, USER_ROLE.manager),
        ClassRoutineController.getUniqueSubjectsOfClassRoutine
    )

    .get(
        "/today_upcoming_classes", 
        auth(USER_ROLE.teacher, USER_ROLE.student, USER_ROLE.school, USER_ROLE.parents),
        ClassRoutineController.getTodayUpcomingClasses
    )

    .post(
        "/add_period",
        ClassRoutineController.addPeriodToClassRoutine
    )

    .patch(
        "/update_period",
        ClassRoutineController.updatePeriodToClassRoutine
    )

    .patch(
        "/add_subject",
        auth(USER_ROLE.school, USER_ROLE.manager),
        ClassRoutineController.addOrUpdateSubjectInRoutine
    )

    .patch(
        "/add-or-update-many",
        auth(USER_ROLE.school, USER_ROLE.manager),
        ClassRoutineController.addOrUpdateManySubjectsInRoutine
    )

    .delete(
        "/remove",
        ClassRoutineController.removePeriodFromClassRoutine
    )

export const ClassRoutineRoutes = router