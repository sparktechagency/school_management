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
        "/Specific_class_section_token",
        auth(USER_ROLE.student),
        ClassRoutineController.getRoutineByToken
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

    .get(
        "/class_schedule_by_day",
        auth(USER_ROLE.school, USER_ROLE.student),
        ClassRoutineController.getClassScheduleByDay
    )

    .get(
        "/specific_class_section/class_list",
        auth(USER_ROLE.teacher, USER_ROLE.student, USER_ROLE.school, USER_ROLE.parents),
        ClassRoutineController.getTodayClassListByClassAndSection
    )

    .get(
        "/specific_school/class_list",
        auth(USER_ROLE.teacher, USER_ROLE.student, USER_ROLE.school, USER_ROLE.parents),
        ClassRoutineController.getTodayClassListForSchoolAdmin
    )

    .get(
        "/classes/history",
        auth(USER_ROLE.teacher, USER_ROLE.student, USER_ROLE.school, USER_ROLE.parents),
        ClassRoutineController.getHistoryClassListByClassAndSection
    )

    .get(
        "/classes/history/specific_school",
        auth(USER_ROLE.teacher, USER_ROLE.student, USER_ROLE.school, USER_ROLE.parents),
        ClassRoutineController.getHistoryClassListForSchoolAdminByDate
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
        auth(USER_ROLE.school, USER_ROLE.manager, USER_ROLE.admin),
        ClassRoutineController.removePeriodFromClassRoutine
    )

export const ClassRoutineRoutes = router