import mongoose from "mongoose";
import Class from "../class/class.model";
import { ClassRoutine } from "../classRoutine/classRoutine.model";
import { PeriodAttendance } from "./attendancePeriod.model";
import dayjs from "dayjs";


const createTodayPeriodAttendance = async (schoolId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextDay = new Date(today);
  nextDay.setDate(nextDay.getDate() + 1);

  const dayName = today
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  const classes = await Class.find({ schoolId }).lean();

  const bulkOperations: any[] = [];

  for (const classItem of classes) {
    const sections = Array.isArray(classItem.section) ? classItem.section : [];

    for (const sec of sections) {
      const routine = await ClassRoutine.findOne({
        classId: classItem._id,
        section: sec
      }).lean();

      if (!routine) continue;

      const todayRoutine = routine.routines.find(r => r.day === dayName);

      console.log("todayRoutine", todayRoutine);    
      if (!todayRoutine) continue;

      for (const p of todayRoutine.periods) {

        console.log("p ===========>>>>>>>>", p);
        const exists = await PeriodAttendance.findOne({
          schoolId,
          classId: classItem._id,
          section: sec,
          periodNumber: p.periodNumber,
          date: { $gte: today, $lt: nextDay }
        }).lean();

        
        if (!exists) {
          bulkOperations.push({
            insertOne: {
              document: {
                schoolId,
                classId: classItem._id,
                section: sec,
                day: dayName,
                date: today,
                periodNumber: p.periodNumber,
                startTime: p.startTime,
                endTime: p.endTime,
                subjectId: p.subjectId,
                subjectName: p.subjectName,
                teacherId: p.teacherId,
                isAttendance: false
              }
            }
          });
        }
      }
    }
  }

  if (bulkOperations.length > 0) {
    await PeriodAttendance.bulkWrite(bulkOperations);
  }

  return {
    created: bulkOperations.length,
    message: "Period attendance generated successfully"
  };
};


const getAttendanceStatsBySchool = async (schoolId: string) => {
    const now = new Date();

    // ----------------------
    // 1️⃣ Today
    // ----------------------
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayStart.getDate() + 1);

    // ----------------------
    // 2️⃣ This week (Monday → Sunday)
    // ----------------------
    const day = now.getDay(); // 0 = Sunday
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - day + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // ----------------------
    // 3️⃣ This month
    // ----------------------
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // ----------------------
    // Helper function
    // ----------------------
    const calculateAttendance = (records: any[]) => {
      let totalStudents = 0;
      let totalPresent = 0;

      for (const r of records) {
        totalStudents += r.totalStudents;
        totalPresent += r.presentStudents.length;
      }

      const attendanceRate = totalStudents === 0 ? 0 : (totalPresent / totalStudents) * 100;

      return {
        totalRecords: records.length,
        totalStudents,
        totalPresent,
        attendanceRate: attendanceRate.toFixed(2) + "%",
      };
    };

    // ----------------------
    // Fetch records from DB
    // ----------------------
    const [todayRecords, weekRecords, monthRecords] = await Promise.all([
      PeriodAttendance.find({
        schoolId: new mongoose.Types.ObjectId(schoolId),
        date: { $gte: todayStart, $lt: todayEnd },
        isAttendance: true,
      }),
      PeriodAttendance.find({
        schoolId: new mongoose.Types.ObjectId(schoolId),
        date: { $gte: weekStart, $lt: weekEnd },
        isAttendance: true,
      }),
      PeriodAttendance.find({
        schoolId: new mongoose.Types.ObjectId(schoolId),
        date: { $gte: monthStart, $lt: monthEnd },
        isAttendance: true,
      }),
    ]);

    return {
      today: calculateAttendance(todayRecords),
      weekly: calculateAttendance(weekRecords),
      monthly: calculateAttendance(monthRecords),
    };
  }


const getTodayPendingAttendance = async (schoolId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const pending = await PeriodAttendance.find({
      schoolId: new mongoose.Types.ObjectId(schoolId),
      date: { $gte: today, $lt: tomorrow },
      isAttendance: false,
    })
      .populate("classId", "className levelName")
      .populate("teacherId", "name")
      .populate("subjectId", "name")
      .sort({ periodNumber: 1 });

    return pending;
  }

const getAttendanceHistoryBySchool = async (
  schoolId: string,
  date?: string
) => {

  // If admin did not send date → use today's date
  const targetDate = date || dayjs().format("YYYY-MM-DD");

  console.log({schoolId, targetDate});

  // Convert targetDate to start and end of the day
    const startOfDay = dayjs(targetDate).startOf("day").toDate();
    const endOfDay = dayjs(targetDate).endOf("day").toDate();

  // Fetch attendance for the target date
  const history = await PeriodAttendance.find({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    date: { $gte: startOfDay, $lte: endOfDay },
  }).sort({ periodNumber: 1 });

  return history;
};

  export const AttendancePeriodService = {
    createTodayPeriodAttendance,
    getAttendanceStatsBySchool,
    getTodayPendingAttendance,
    getAttendanceHistoryBySchool
  }

// const createTodayPeriodAttendance = async (schoolId: string) => {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const dayName = today
//       .toLocaleDateString("en-US", { weekday: "long" })
//       .toLowerCase(); // monday, tuesday...

//     // 1. Get all classes of the school
//     const classes = await Class.find({ schoolId });

//     for (const classItem of classes) {
//       const sections = classItem.section;

//       for (const sec of sections) {

//         // 2. Get routine for this class + section
//         const routine = await ClassRoutine.findOne({
//           classId: classItem._id,
//           section: sec
//         });

//         if (!routine) continue;

//         const todayRoutine = routine.routines.find(r => r.day === dayName);
//         if (!todayRoutine) continue;

//         // 3. Create period entries
//         for (const p of todayRoutine.periods) {
//           const exists = await PeriodAttendance.findOne({
//             schoolId,
//             classId: classItem._id,
//             section: sec,
//             periodNumber: p.periodNumber,
//             date: today
//           });

//           if (!exists) {
//             await PeriodAttendance.create({
//               schoolId,
//               classId: classItem._id,
//               section: sec,
//               day: dayName,
//               date: today,
//               periodNumber: p.periodNumber,
//               startTime: p.startTime,
//               endTime: p.endTime,
//               subjectId: p.subjectId,
//               subjectName: p.subjectName,
//               teacherId: p.teacherId,
//               isAttendance: false
//             });
//           }
//         }
//       }
//     }
//   }


//   export const AttendancePeriodService = {
//     createTodayPeriodAttendance
//   }


