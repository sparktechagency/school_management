import { Router } from "express";
import { AttendancePeriodController } from "./attendancePeriod.controller";


const router = Router();

router
    .post(
    "/create-today/:schoolId",
    AttendancePeriodController.createTodayPeriodAttendance
    )

    .get(
      "/stats/:schoolId",
      AttendancePeriodController.getAttendanceStatsBySchool
    )

    .get(
      "/today-pending/:schoolId",
      AttendancePeriodController.getTodayPendingAttendance
    )

    .get(
      "/history/:schoolId",
      AttendancePeriodController.getAttendanceHistoryBySchool
    );




export const AttendancePeriodRoutes = router;