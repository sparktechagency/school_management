import cron from "node-cron";
import { AttendancePeriodService } from "./attendancePeriod.service";
import School from "../school/school.model";

export const attendancePeriodCron = () => {
  // Runs every day at 1:00 AM
  cron.schedule("0 1 * * *", async () => {
    console.log("⏳ Cron Started: Creating period attendance for all schools...");

    try {
      const schools = await School.find();

      for (const school of schools) {
        await AttendancePeriodService.createTodayPeriodAttendance(
          school._id.toString()
        );
      }

      console.log("✅ Cron Completed: Period attendance generated.");
    } catch (error) {
      console.error("❌ Cron Error:", error);
    }
  });
};
