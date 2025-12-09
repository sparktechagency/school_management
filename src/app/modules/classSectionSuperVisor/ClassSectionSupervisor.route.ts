import express from "express";
import { ClassSectionSupervisorController } from "./classSectionSupervisor.controller";
import { auth } from "../../middleware/auth";
import { USER_ROLE } from "../../constant";

const router = express.Router();

router
.post(
    "/add", 
    // auth(USER_ROLE.admin, USER_ROLE.supperAdmin, USER_ROLE.school, USER_ROLE.teacher),
    ClassSectionSupervisorController.addOrUpdateSupervisor
)

.post(
    "/add-many",
    ClassSectionSupervisorController.addMultipleSupervisors
)

.get(
    "/my",
    auth(USER_ROLE.teacher),
    ClassSectionSupervisorController.getMySupervisorsClasses
)



export const ClassSectionSupervisorRoutes = router;