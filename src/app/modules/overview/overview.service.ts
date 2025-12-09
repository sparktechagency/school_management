/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { months, StatisticHelper } from '../../helper/staticsHelper';
import { TAuthUser } from '../../interface/authUser';
import Assignment from '../assignment/assignment.model';
import Attendance from '../attendance/attendance.model';
import ClassSchedule from '../classSchedule/classSchedule.model';
import Result from '../result/result.model';
import { StudentService } from '../student/student.service';
import { TeacherService } from '../teacher/teacher.service';
import { calculateAttendanceRate, getAttendanceRate, getAttendanceRateByClassIdAndSection } from './overview.helper';
import Exam from '../exam/exam.model';
import { ClassSectionSupervisor } from '../classSectionSuperVisor/classSectionSupervisor.model';
import Student from '../student/student.model';
import { ClassSectionSupervisorService } from '../classSectionSuperVisor/classSectionSupervisor.service';
import { ClassRoutine } from '../classRoutine/classRoutine.model';
import Class from '../class/class.model';

// const getTeacherHomePageOverview = async (user: TAuthUser) => {
//   const day = new Date()
//     .toLocaleString('en-US', { weekday: 'long' })
//     .toLowerCase();

//   const today = new Date();
//   today.setUTCHours(0, 0, 0, 0);

//  // Get classes where this teacher is supervisor
//   const supervisorClasses = await ClassSectionSupervisorService.getMySupervisorsClasses(user.teacherId);

//   // Prepare filters for student counting
//   const classFilters = supervisorClasses.map((cls: any) => ({
//     classId: cls.classId,
//     section: cls.section,
//   }));

//   const studentMatchFilter =
//     classFilters.length > 0 ? { $or: classFilters } : { _id: null };

//   // Summoned and Terminated Counts
//   const [totalSummoned, totalTerminated] = await Promise.all([
//     Student.countDocuments({
//       ...studentMatchFilter,
//       summoned: true
//     }),
//     Student.countDocuments({
//       ...studentMatchFilter,
//       isTerminated: true
//     }),
//   ]);




//   const [todaysClass, todaysAttendanceRate, assignmentDue, totalUpcomingExams] = await Promise.all([
//     ClassSchedule.countDocuments({ teacherId: user.teacherId, days: day }),
     
    
//     ClassSchedule.aggregate([
//       {
//         $match: {
//           teacherId: new mongoose.Types.ObjectId(String(user.teacherId)),
//           days: day,
//         },
//       },
//       {
//         $lookup: {
//           from: 'attendances',
//           localField: '_id',
//           foreignField: 'classScheduleId',
//           as: 'attendance',
//         },
//       },
//       {
//         $unwind: {
//           path: '$attendance',
//           preserveNullAndEmptyArrays: true,
//         },
//       },

//       {
//         $group: {
//           _id: '$_id',
//           totalPresent: { $first: '$attendance.presentStudents' },
//           totalStudents: { $first: '$attendance.totalStudents' },
//         },
//       },
//       {
//         $project: {
//           totalStudents: 1,
//           totalPresentCount: { $size: { $ifNull: ['$totalPresent', []] } },
//           attendanceRate: {
//             $cond: [
//               { $eq: ['$totalStudents', 0] },
//               0,
//               {
//                 $round: [
//                   {
//                     $multiply: [
//                       {
//                         $divide: [
//                           { $size: { $ifNull: ['$totalPresent', []] } },
//                           '$totalStudents',
//                         ],
//                       },
//                       100,
//                     ],
//                   },
//                   2,
//                 ],
//               },
//             ],
//           },
//         },
//       },
//       // New stage: Calculate overall attendance rate
//       {
//         $group: {
//           _id: null,
//           totalPresentSum: { $sum: '$totalPresentCount' },
//           totalStudentSum: { $sum: '$totalStudents' },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           totalPresentSum: 1,
//           totalStudentSum: 1,
//           overallAttendanceRate: {
//             $cond: [
//               { $eq: ['$totalStudentSum', 0] },
//               0,
//               {
//                 $round: [
//                   {
//                     $multiply: [
//                       { $divide: ['$totalPresentSum', '$totalStudentSum'] },
//                       100,
//                     ],
//                   },
//                   2,
//                 ],
//               },
//             ],
//           },
//         },
//       },
//     ]),

//     Assignment.countDocuments({
//       teacherId: user.userId,
//       status: { $eq: 'on-going' },
//     }),

//     //added total upcoming exams count
//     Exam.countDocuments({
//       teacherId: user.teacherId,
//       date: { $gt: today }
//     }),
//   ]);


//   return {
//     todaysClass,
//     overallAttendanceRate: todaysAttendanceRate[0]?.overallAttendanceRate || 0,
//     activeStudents: todaysAttendanceRate[0]?.totalPresentSum || 0,
//     assignmentDue,
//     totalUpcomingExams,
//     // NEW DATA
//     totalSummoned,
//     totalTerminated,

//     // FULL SUPERVISOR CLASS LIST
//     supervisorClasses,
//   };
// };


const getTeacherHomePageOverview = async (user: TAuthUser) => {

const day = new Date().toLocaleString("en-US", {
  weekday: "long",
}).toLowerCase();

console.log("day ===>>> ", day);

const today = new Date();
today.setHours(0, 0, 0, 0);

  // Supervisor classes
  const supervisorClasses = await ClassSectionSupervisorService.getMySupervisorsClasses(user.userId);

  const classFilters = supervisorClasses.map((cls: any) => ({
    classId: cls.classId,
    section: cls.section,
  }));

  const studentMatchFilter = classFilters.length ? { $or: classFilters } : { _id: null };

  const [totalSummoned, totalTerminated] = await Promise.all([
    Student.countDocuments({ ...studentMatchFilter, summoned: true }),
    Student.countDocuments({ ...studentMatchFilter, isTerminated: true }),
  ]);

  // -----------------------------
  // TODAY'S CLASS USING CLASSROUTINE
  // -----------------------------
  const todaysClassResult = await ClassRoutine.aggregate([
    { $unwind: "$routines" },
    { $match: { "routines.day": day } },
    { $unwind: "$routines.periods" },
    {
      $match: {
        "routines.periods.teacherId": new mongoose.Types.ObjectId(String(user.userId)),
      },
    },
    { $count: "totalClasses" },
  ]);

  const todaysClass = todaysClassResult[0]?.totalClasses || 0;

  // -----------------------------
  // ATTENDANCE RATE USING CLASSROUTINE
  // -----------------------------
  const attendanceStats = await ClassRoutine.aggregate([
    { $unwind: "$routines" },
    { $match: { "routines.day": day } },
    { $unwind: "$routines.periods" },
    {
      $match: {
        "routines.periods.teacherId": new mongoose.Types.ObjectId(String(user.userId)),
      },
    },
    {
      $lookup: {
        from: "attendances",
        let: {
          cid: "$classId",
          sec: "$section",
          pnum: "$routines.periods.periodNumber",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$classId", "$$cid"] },
                  { $eq: ["$section", "$$sec"] },
                  { $eq: ["$periodNumber", "$$pnum"] },
                  { $eq: ["$date", today] },
                ],
              },
            },
          },
        ],
        as: "attendance",
      },
    },
    {
      $unwind: {
        path: "$attendance",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: null,
        totalStudents: { $sum: "$attendance.totalStudents" },
        totalPresent: { $sum: { $size: { $ifNull: ["$attendance.presentStudents", []] } } },
      },
    },
    {
      $project: {
        _id: 0,
        totalStudents: 1,
        totalPresent: 1,
        attendanceRate: {
          $cond: [
            { $eq: ["$totalStudents", 0] },
            0,
            {
              $round: [
                {
                  $multiply: [
                    { $divide: ["$totalPresent", "$totalStudents"] },
                    100,
                  ],
                },
                2,
              ],
            },
          ],
        },
      },
    },
  ]);

  const overallAttendanceRate = attendanceStats[0]?.attendanceRate || 0;
  const activeStudents = attendanceStats[0]?.totalPresent || 0;

  return {
    todaysClass,
    overallAttendanceRate,
    activeStudents,
    assignmentDue: 0, // remove old logic
    totalUpcomingExams: 0, // adjust as needed
    totalSummoned,
    totalTerminated,
    supervisorClasses,
  };
};




const getDailyWeeklyMonthlyAttendanceRate = async (user: TAuthUser) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Start of today in UTC

  const startOfWeek = new Date(today);
  startOfWeek.setUTCDate(today.getUTCDate() - today.getUTCDay()); // Start from Sunday
  startOfWeek.setUTCHours(0, 0, 0, 0);

  const startOfMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
  ); // First of the month in UTC

  const teacherId = new mongoose.Types.ObjectId(String(user.teacherId));

  const [daily, weekly, monthly] = await Promise.all([
    getAttendanceRate(teacherId, today),
    getAttendanceRate(teacherId, startOfWeek),
    getAttendanceRate(teacherId, startOfMonth),
  ]);

  const dailyAttendanceRate = calculateAttendanceRate(daily);
  const weeklyAttendanceRate = calculateAttendanceRate(weekly);
  const monthlyAttendanceRate = calculateAttendanceRate(monthly);

  return {
    dailyAttendanceRate: dailyAttendanceRate?.attendanceRate || 0,
    weeklyAttendanceRate: weeklyAttendanceRate?.attendanceRate || 0,
    monthlyAttendanceRate: monthlyAttendanceRate?.attendanceRate || 0,
  };
};

const getDailyWeeklyMonthlyAttendanceRateOfSpecificClassIdAndSection = async ( classId : string, section : string) => {

  console.log({classId, section});

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Start of today in UTC

  const startOfWeek = new Date(today);
  startOfWeek.setUTCDate(today.getUTCDate() - today.getUTCDay()); // Start from Sunday
  startOfWeek.setUTCHours(0, 0, 0, 0);

  const startOfMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
  ); // First of the month in UTC

  const classObjectId = new mongoose.Types.ObjectId(classId);

  console.log({today, startOfWeek, startOfMonth});

  const [daily, weekly, monthly] = await Promise.all([
    getAttendanceRateByClassIdAndSection(classObjectId, section, today),
    getAttendanceRateByClassIdAndSection(classObjectId, section, startOfWeek),
    getAttendanceRateByClassIdAndSection(classObjectId, section, startOfMonth),
  ]);

  console.log({dailyData: daily.length, weeklyData: weekly.length, monthlyData: monthly.length});

  const dailyAttendanceRate = calculateAttendanceRate(daily);
  const weeklyAttendanceRate = calculateAttendanceRate(weekly);
  const monthlyAttendanceRate = calculateAttendanceRate(monthly);

  return {
    dailyAttendanceRate: dailyAttendanceRate?.attendanceRate || 0,
    weeklyAttendanceRate: weeklyAttendanceRate?.attendanceRate || 0,
    monthlyAttendanceRate: monthlyAttendanceRate?.attendanceRate || 0,
  };
};


const getDailyWeeklyMonthlyAttendanceRateOfSchool = async (schoolId: string) => {
  if (!mongoose.Types.ObjectId.isValid(schoolId)) {
    throw new Error("Invalid schoolId");
  }

  const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

  // ------------------------------
  // DATE SETUP
  // ------------------------------
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Start of today in UTC

  const startOfWeek = new Date(today);
  startOfWeek.setUTCDate(today.getUTCDate() - today.getUTCDay()); // Sunday
  startOfWeek.setUTCHours(0, 0, 0, 0);

  const startOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  // ------------------------------
  // FETCH ALL CLASSES OF THE SCHOOL
  // ------------------------------
  const classes = await Class.find({ schoolId: schoolObjectId }).lean();

  let dailyAll: any[] = [];
  let weeklyAll: any[] = [];
  let monthlyAll: any[] = [];

  // ------------------------------
  // LOOP THROUGH EACH CLASS AND EACH SECTION
  // ------------------------------
  for (const cls of classes) {
    for (const section of cls.section) {
      const classObjectId = new mongoose.Types.ObjectId(cls._id);

      const [daily, weekly, monthly] = await Promise.all([
        getAttendanceRateByClassIdAndSection(classObjectId, section, today),
        getAttendanceRateByClassIdAndSection(classObjectId, section, startOfWeek),
        getAttendanceRateByClassIdAndSection(classObjectId, section, startOfMonth),
      ]);

      dailyAll = dailyAll.concat(daily);
      weeklyAll = weeklyAll.concat(weekly);
      monthlyAll = monthlyAll.concat(monthly);
    }
  }

  // ------------------------------
  // CALCULATE ATTENDANCE RATES
  // ------------------------------
  const dailyAttendanceRate = calculateAttendanceRate(dailyAll);
  const weeklyAttendanceRate = calculateAttendanceRate(weeklyAll);
  const monthlyAttendanceRate = calculateAttendanceRate(monthlyAll);

  return {
    dailyAttendanceRate: dailyAttendanceRate?.attendanceRate || 0,
    weeklyAttendanceRate: weeklyAttendanceRate?.attendanceRate || 0,
    monthlyAttendanceRate: monthlyAttendanceRate?.attendanceRate || 0,
  };
};

const getAssignmentCount = async (user: TAuthUser) => {


  const teacher = await TeacherService.findTeacher(user);

    console.log("assignment count ==>> ", {user, teacher});

  if (!teacher || !teacher._id) {
    throw new Error('Teacher not found or invalid teacher data');
  }

  // Use teacher._id instead of teacher.schoolId for teacherId field
  const schoolId = new mongoose.Types.ObjectId(String(teacher.schoolId));

  console.log("this is school id =>>> ",{
      schoolId,
      teacherId: new mongoose.Types.ObjectId(user.userId),
      status: 'on-going',
    })

  // Calculate date for last week
  const lastWeekDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Run both queries in parallel for better performance
  const [activeAssignment, assignmentThisWeek] = await Promise.all([
    Assignment.countDocuments({
      schoolId,
      teacherId: new mongoose.Types.ObjectId(user.userId),
      status: 'on-going',
    }),

    Assignment.countDocuments({
      schoolId,
      teacherId: new mongoose.Types.ObjectId(user.userId),
      status: "completed",
      dueDate: { $gte: lastWeekDate },
    }),
  ]);

  console.log({activeAssignment, assignmentThisWeek});

  return {
    activeAssignment: activeAssignment || 0,
    assignmentThisWeek: assignmentThisWeek || 0,
  };
};

const getStudentAttendance = async (
  user: TAuthUser,
  query: Record<string, unknown>,
) => {
  const { year } = query;
  const { startDate, endDate } = StatisticHelper.statisticHelper(
    year as string,
  );

  const attendance = await Attendance.aggregate([
    {
      $match: {
        schoolId: new mongoose.Types.ObjectId(String(user.schoolId)),
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $project: {
        month: { $month: '$date' },
        year: { $year: '$date' },
        presentCount: { $size: '$presentStudents' },
      },
    },
    {
      $group: {
        _id: {
          year: '$year',
          month: '$month',
        },
        totalPresent: { $sum: '$presentCount' },
      },
    },
    {
      $sort: {
        '_id.year': 1,
        '_id.month': 1,
      },
    },
  ]);

  const formattedResult = months.map((month, index) => {
    const monthData = attendance.find((r: any) => r._id.month === index + 1);

    return {
      month: month,
      totalPresent: monthData?.totalPresent || 0,
    };
  });

  return formattedResult;
};

// const getStudentHomePageOverview = async (user: TAuthUser) => {
//   const studentId = user.studentId;

//   // Get current day name
//   const dayName = [
//     'sunday',
//     'monday',
//     'tuesday',
//     'wednesday',
//     'thursday',
//     'friday',
//     'saturday',
//   ][new Date().getDay()];

//   // Fetch student profile once
//   const studentProfile = await StudentService.findStudent(studentId);
//   if (!studentProfile) throw new Error('Student profile not found');

//   const { schoolId, classId, className, section  } = studentProfile;

//   // Prepare date range
//   const today = new Date();
//   today.setUTCHours(0, 0, 0, 0);

//   const last30Days = new Date(today);
//   last30Days.setUTCDate(today.getUTCDate() - 30);

//   // Prepare ObjectIds once
//   const schoolObjectId = new mongoose.Types.ObjectId(String(schoolId));
//   const studentObjectId = new mongoose.Types.ObjectId(String(studentId));
//   const classObjectId = new mongoose.Types.ObjectId(String(classId));
//   // Run all parallel queries
//   const [routineDoc, attendanceRecords, assignmentDueCount, gpaResult] =
//     await Promise.all([
//       // ClassSchedule.countDocuments({
//       //   schoolId,
//       //   classId,
//       //   days: dayName,
//       // }),
//       ClassRoutine.findOne({
//         schoolId,
//         classId,
//         section,
//       }).lean(),

//       // Attendance.aggregate([
//       //   {
//       //     $match: {
//       //       schoolId: schoolObjectId,
//       //       classId: classObjectId,
//       //       date: { $gte: last30Days },
//       //     },
//       //   },
//       //   {
//       //     $project: {
//       //       presentStudents: 1,
//       //     },
//       //   },
//       // ]),

//       Attendance.find({
//         schoolId,
//         classId,
//         date: { $gte: last30Days },
//         isAttendance: true, // Only valid attendance
//       })
//         .select("presentStudents date")
//         .lean(),

//       Assignment.countDocuments({
//         schoolId,
//         classId,
//         status: 'on-going',
//       }),

//       Result.aggregate([
//         { $match: { schoolId: schoolObjectId } },
//         { $unwind: '$students' },
//         { $match: { 'students.studentId': studentObjectId } },
//         {
//           $group: {
//             _id: null,
//             cgpa: { $avg: '$students.gpa' },
//           },
//         },
//         {
//           $project: {
//             _id: 0,
//             cgpa: 1,
//           },
//         },
//       ]),
//     ]);


//   // ================================
//   // 1️⃣ TODAY'S CLASS COUNT (NO BREAKS)
//   // ================================
//   let todaysClass = 0;

//   if (routineDoc) {
//     const todayRoutine = routineDoc.routines.find(
//       (d) => d.day.toLowerCase() === dayName
//     );

//     if (todayRoutine) {
//       todaysClass = todayRoutine.periods.filter((p) => !p.isBreak).length;
//     }
//   }

//   // ==================================
//   // 2️⃣ ATTENDANCE CALCULATION (LAST 30 DAYS)
//   // ==================================
//   const groupedDays = new Map(); // avoid counting same day multiple periods

//   attendanceRecords.forEach((record) => {
//     const dateKey = record.date.toISOString().split("T")[0];

//     if (!groupedDays.has(dateKey)) {
//       groupedDays.set(dateKey, {
//         present: record.presentStudents.some(
//           (s) => s.studentId.toString() === studentId
//         ),
//       });
//     }
//   });

//   const totalDays = groupedDays.size;
//   const presentDays = [...groupedDays.values()].filter((d) => d.present).length;

//   const attendanceRate =
//     totalDays > 0 ? Math.round((presentDays / totalDays) * 10000) / 100 : 0;

//   return {
//     todaysClass,
//     attendanceRate,
//     assignmentDue: assignmentDueCount,
//     gpa: gpaResult[0]?.cgpa || 0,
//   };
// };


const getStudentHomePageOverview = async (user: TAuthUser) => {
  const studentId = user.studentId;

  // Today name
  const dayName = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ][new Date().getDay()];

  // Student profile
  const studentProfile = await StudentService.findStudent(studentId);
  if (!studentProfile) throw new Error("Student profile not found");

  const { schoolId, classId, className, section } = studentProfile;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const last30Days = new Date(today);
  last30Days.setUTCDate(today.getUTCDate() - 30);

  const schoolObjectId = new mongoose.Types.ObjectId(String(schoolId));
  const studentObjectId = new mongoose.Types.ObjectId(String(studentId));
  const classObjectId = new mongoose.Types.ObjectId(String(classId));

  // Parallel fetch
  const [routineDoc, attendanceRecords, assignmentDueCount, gpaResult] =
    await Promise.all([
      ClassRoutine.findOne({
        schoolId,
        classId,
        section,
      }).lean(),

      Attendance.find({
        schoolId,
        classId,
        date: { $gte: last30Days },
        isAttendance: true,
      })
        .select("presentStudents date periodNumber")
        .lean(),

      Assignment.countDocuments({
        schoolId,
        classId,
        status: "on-going",
      }),

      Result.aggregate([
        { $match: { schoolId: schoolObjectId } },
        { $unwind: "$students" },
        { $match: { "students.studentId": studentObjectId } },
        { $group: { _id: null, cgpa: { $avg: "$students.gpa" } } },
        { $project: { _id: 0, cgpa: 1 } },
      ]),
    ]);

  // =======================================
  // 1️⃣ TODAY'S CLASS COUNT (subject & teacher required)
  // =======================================
  let todaysClass = 0;

  if (routineDoc) {
    const todayRoutine = routineDoc.routines.find(
      (r) => r.day.toLowerCase() === dayName
    );

    if (todayRoutine) {
      todaysClass = todayRoutine.periods.filter(
        (p) =>
          !p.isBreak && // skip break
          p.subjectId && // subject must exist
          p.teacherId // teacher must exist
      ).length;
    }
  }

  // ============================================
  // 2️⃣ ATTENDANCE RATE (day present if >= 50% present)
  // ============================================

  // Group attendance by date
  const dayWise = new Map();

  attendanceRecords.forEach((record) => {
    const dateKey = record.date.toISOString().split("T")[0];

    if (!dayWise.has(dateKey)) {
      dayWise.set(dateKey, {
        totalPeriods: 0,
        presentPeriods: 0,
      });
    }

    const dayData = dayWise.get(dateKey);

    dayData.totalPeriods++;

    const isPresent = record.presentStudents.some(
      (s) => s.studentId.toString() === studentId
    );

    if (isPresent) dayData.presentPeriods++;

    dayWise.set(dateKey, dayData);
  });

  // Determine present days
  let presentDays = 0;

  for (const [date, d] of dayWise.entries()) {
    const { totalPeriods, presentPeriods } = d;

    const required = totalPeriods / 2;

    if (presentPeriods >= required) {
      presentDays++;
    }
  }

  const totalDays = dayWise.size;

  const attendanceRate =
    totalDays > 0
      ? Math.round((presentDays / totalDays) * 10000) / 100
      : 0;

  // ==========================
  // Final response
  // ==========================
  return {
    todaysClass,
    attendanceRate,
    assignmentDue: assignmentDueCount,
    gpa: gpaResult[0]?.cgpa || 0,
  };
};

const getParentHomePageOverview = async (user: TAuthUser) => {
  return user;
};

const getAdminHomePageOverview = async (user: TAuthUser) => {
  return user;
};

const getHomePageOnlyOverviewOfAdminWithinApp = async (schoolId: string) => {
  const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

  // Prepare today's date once
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Run everything in parallel (fastest approach)
  const [
    studentStats,
    presentResult
  ] = await Promise.all([
    // Count normal, terminated, summoned in one aggregated query
    Student.aggregate([
      { $match: { schoolId: schoolObjectId } },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: 1 },
          totalTerminatedStudents: {
            $sum: { $cond: [{ $eq: ['$isTerminated', true] }, 1, 0] }
          },
          totalSummonedStudents: {
            $sum: { $cond: [{ $eq: ['$summoned', true] }, 1, 0] }
          }
        }
      }
    ]),

    // Attendance present count for today
    Attendance.aggregate([
      {
        $match: {
          schoolId: schoolObjectId,
          date: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          totalPresent: { $sum: { $size: '$presentStudents' } }
        }
      }
    ])
  ]);

  // Extract results safely
  const stats = studentStats[0] || {
    totalStudents: 0,
    totalTerminatedStudents: 0,
    totalSummonedStudents: 0
  };

  const todayTotalPresentStudents =
    presentResult.length > 0 ? presentResult[0].totalPresent : 0;

  return {
    totalStudents: stats.totalStudents,
    totalTerminatedStudents: stats.totalTerminatedStudents,
    totalSummonedStudents: stats.totalSummonedStudents,
    todayTotalPresentStudents
  };
};

export const OverviewService = {
  getTeacherHomePageOverview,
  getAssignmentCount,
  getDailyWeeklyMonthlyAttendanceRate,
  getStudentHomePageOverview,
  getParentHomePageOverview,
  getAdminHomePageOverview,
  getStudentAttendance,
  getDailyWeeklyMonthlyAttendanceRateOfSpecificClassIdAndSection,
  getHomePageOnlyOverviewOfAdminWithinApp,
  getDailyWeeklyMonthlyAttendanceRateOfSchool
};
