import mongoose, { now } from "mongoose";
import { AddSubjectPayload, AddSubjectToRoutinePayload, IPeriod, ManyRoutinePayload, } from "./classRoutine.interface";
import { ClassRoutine } from "./classRoutine.model";
import AssignedSubjectTeacher from "../assignedSubjectTeacher/assignedSubjectTeacher.model";
import Teacher from "../teacher/teacher.model";
import AppError from "../../utils/AppError";
import httpStatus from "http-status";
import { TAuthUser } from "../../interface/authUser";
import dayjs from "dayjs";
import AggregationQueryBuilder from "../../QueryBuilder/aggregationBuilder";
import { USER_ROLE } from "../../constant";
import { StudentService } from "../student/student.service";
import { AssignedSubjectTeacherService } from "../assignedSubjectTeacher/assignedSubjectTeacher.service";
import { ClassSectionSupervisorService } from "../classSectionSuperVisor/classSectionSupervisor.service";
import { ClassSectionSupervisor } from "../classSectionSuperVisor/classSectionSupervisor.model";
import config from "../../../config";
import { JwtPayload, Secret } from "jsonwebtoken";
import { decodeToken } from "../../utils/decodeToken";

const getRoutineByClassAndSection = async (classId: string, section: string) => {
  const routine = await ClassRoutine.findOne({ classId, section: section.toUpperCase() });

  if (!routine) {
    throw new Error(`Routine not found for class ${classId} and section ${section}`);
  }

  const supervisor = await ClassSectionSupervisor.find({
    classId,
    section: section.toUpperCase(),
  }).select('teacherId teacherName').lean(); // null if not found

  return {  
    routine,
    supervisors: supervisor || [],
  };
};

const getRoutineByToken = async (classId: string, section: string) => {
  const routine = await ClassRoutine.findOne({ classId, section: section.toUpperCase() });

  if (!routine) {
    throw new Error(`Routine not found for class ${classId} and section ${section}`);
  }


  return routine;
};



const addPeriodToClassRoutine = async (
  classId: string,
  section: string,
  periodData: IPeriod
) => {
  const routine = await ClassRoutine.findOne({ classId, section: section.toUpperCase() });
  if (!routine) throw new Error(`ClassRoutine not found for classId: ${classId} section: ${section}`);

  // 1. Add to master periods if not exists
  const existingMaster = routine.periods.find(p => p.periodNumber === periodData.periodNumber);
  if (!existingMaster) {
    routine.periods.push({
      periodNumber: periodData.periodNumber,
      name: periodData.name,
      startTime: periodData.startTime,
      endTime: periodData.endTime,
      isBreak: periodData.isBreak ?? false,
    });
  }

  // 2. Add to each day's routine if not exists
  routine.routines.forEach(dayRoutine => {
    const existingPeriod = dayRoutine.periods.find(p => p.periodNumber === periodData.periodNumber);
    if (!existingPeriod) {
      dayRoutine.periods.push({
        periodNumber: periodData.periodNumber,
        subjectId: null,
        subjectName: null,
        teacherId: null,
        startTime: periodData.startTime,
        endTime: periodData.endTime,
        isBreak: periodData.isBreak ?? false,
      });
    }
  });

  await routine.save();
  return routine;
};

const updatePeriodInClassRoutine = async (
  classId: string,
  section: string,
  periodNumber: number,
  updateData: Partial<Pick<IPeriod, 'name' | 'startTime' | 'endTime' | 'isBreak'>>
) => {
  // Find the class routine
  const routine = await ClassRoutine.findOne({ classId, section: section.toUpperCase() });
  if (!routine) throw new Error(`ClassRoutine not found for classId: ${classId} section: ${section}`);

  // Update only master period template
  const masterIndex = routine.periods.findIndex(p => p.periodNumber === periodNumber);
  if (masterIndex === -1) throw new Error(`Master period ${periodNumber} not found`);

  routine.periods[masterIndex] = {
    ...(routine.periods[masterIndex] as any).toObject(),
    ...updateData, // Only name, startTime, endTime, isBreak
  };

  // Optionally, update startTime/endTime in each day's period template (but not subjectId/teacherId)
  routine.routines.forEach(dayRoutine => {
    const period = dayRoutine.periods.find(p => p.periodNumber === periodNumber);

    if (period) {
      period.startTime = updateData.startTime ?? period.startTime;
      period.endTime = updateData.endTime ?? period.endTime;
      period.isBreak = updateData.isBreak ?? period.isBreak;
    }
   });

  await routine.save();
  return routine;
};


const removePeriodFromClassRoutine = async (
  classId: string,
  section: string,
  periodNumber: number
) => {
  const routine = await ClassRoutine.findOne({ classId, section: section.toUpperCase() });
  if (!routine) throw new Error(`ClassRoutine not found for classId: ${classId} section: ${section}`);

  // Remove from master periods
  routine.periods = routine.periods.filter(p => p.periodNumber !== periodNumber);

  // Remove from each day's routine
  routine.routines.forEach(dayRoutine => {
    dayRoutine.periods = dayRoutine.periods.filter(p => p.periodNumber !== periodNumber);
  });

  await routine.save();
  return routine;
};


interface ISubjectWithTeachers {
  subjectId: string;
  subjectName: string;
  assignedTeacher: { teacherId: string; teacherName: string } | null;
  teacherList: { teacherId: string; teacherName: string }[];
}



const addOrUpdateSubjectInRoutine = async (payload: AddSubjectToRoutinePayload) => {
  
  const { schoolId, classId, section, day, periodNumber, subjectId, subjectName } = payload;

  if (!classId || !section || !day || !periodNumber || !subjectId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'classId, section, day, periodNumber and subjectId are required');
  }


  // Convert IDs to ObjectId
  const classObjectId = new mongoose.Types.ObjectId(classId);
  const subjectObjectId = new mongoose.Types.ObjectId(subjectId);
  const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

  const routine = await ClassRoutine.findOne({ classId: classObjectId, section });

  if (!routine) {
    throw new AppError(httpStatus.NOT_FOUND, `Routine not found for classId "${classId}" and section "${section}"`);
  }

  // Find the day routine
  const dayRoutine = routine.routines.find(
    (d) => d.day.toLowerCase() === day.toLowerCase()
  );

  // If day does not exist, throw error
  if (!dayRoutine) {
    throw new AppError(httpStatus.BAD_REQUEST, `Day "${day}" does not exist in routine`);
  }

  // Find the period within the day
  const period = dayRoutine.periods.find((p) => p.periodNumber === periodNumber);

  if (!period) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Period number ${periodNumber} does not exist on day "${day}"`
    );
  }


    // Check if there is an active assigned teacher for this subject in this class & section
  const assignedTeacher = await AssignedSubjectTeacher.findOne({
    schoolId: schoolObjectId,
    classId: classObjectId,
    section,
    subjectId: subjectObjectId,
    isActive: true
  }).select('teacherId');


    // Update period with subject and teacher info
  period.subjectId = subjectObjectId;
  period.subjectName = subjectName;
  period.teacherId = assignedTeacher
  ? (assignedTeacher.teacherId as unknown as mongoose.Types.ObjectId)
  : null;

  await routine.save();

  return routine;
};




const addOrUpdateManySubjectsInRoutine = async (payload: ManyRoutinePayload) => {

  console.log("payload ===>>> ", payload);
  

  const {
    schoolId,
    classId,
    className,
    section,
    periods = [],
    routine = [],
    addedStudents = [],
    superVisors = null,
    removeSupervisors = null
  } = payload;

  if (!schoolId || !classId || !section) {

    console.log("schoolId, classId and section are required");
    throw new AppError(httpStatus.BAD_REQUEST, "schoolId, classId and section are required");

  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const classObjectId = new mongoose.Types.ObjectId(classId);
    const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

    // Fetch existing class routine
    const classRoutine = await ClassRoutine.findOne({
      schoolId: schoolObjectId,
      classId: classObjectId,
      section: section.toUpperCase(),
    }).session(session);

    if (!classRoutine) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        `Routine not found for classId "${classId}" section "${section}"`
      );
    }

    // -----------------------------
    // STEP 1: Add or update periods
    // -----------------------------
    for (const p of periods) {
      const periodData = {
        periodNumber: p.periodNumber,
        name: p.periodName,
        startTime: p.startTime,
        endTime: p.endTime,
        isBreak: p.isBreak ?? false,
      };

      const existingMaster = classRoutine.periods.find(per => per.periodNumber === p.periodNumber);

      if (!existingMaster) {
        classRoutine.periods.push(periodData);
      } else {
        existingMaster.name = periodData.name;
        existingMaster.startTime = periodData.startTime;
        existingMaster.endTime = periodData.endTime;
        existingMaster.isBreak = periodData.isBreak;
      }

      // Sync with daily routines
      classRoutine.routines.forEach(dayRoutine => {

        const existingDayPeriod = dayRoutine.periods.find(dp => dp.periodNumber === p.periodNumber);

        if (!existingDayPeriod) {
          dayRoutine.periods.push({
            periodNumber: p.periodNumber,
            subjectId: null,
            subjectName: null,
            teacherId: null,
            startTime: periodData.startTime,
            endTime: periodData.endTime,
            isBreak: periodData.isBreak,
          });
        } else {
          existingDayPeriod.startTime = periodData.startTime;
          existingDayPeriod.endTime = periodData.endTime;
          existingDayPeriod.isBreak = periodData.isBreak;
        }
      });
    }

    // -----------------------------------
    // STEP 2: Add/update subjects & teachers
    // -----------------------------------
    for (const r of routine) {
      const { day, periodNumber, subjectId, subjectName, teacherId, teacherName } = r;

      const dayRoutine = classRoutine.routines.find(d => d.day.toLowerCase() === day.toLowerCase());

      if (!dayRoutine) {
        throw new AppError(httpStatus.BAD_REQUEST, `Day "${day}" does not exist`);
      }

      const period = dayRoutine.periods.find(p => p.periodNumber === periodNumber);

      if (!period) {
        throw new AppError(httpStatus.BAD_REQUEST, `Period ${periodNumber} not found on ${day}`);
      }

      // Update subject and teacher
      period.subjectId = new mongoose.Types.ObjectId(subjectId);
      period.subjectName = subjectName;
      period.teacherId = teacherId ? new mongoose.Types.ObjectId(teacherId) : null;

      (period as any).teacherName = teacherName ?? null;

      // Assign teacher to subject (updates AssignedSubjectTeacher table)
      if (teacherId) {
        await AssignedSubjectTeacherService.assignTeacherToSubject(
          {
            schoolId,
            classId,
            className,
            section,
            subjectId,
            subjectName,
            teacherId,
            teacherName,
          },
          session
        );
      }
    }

    // -----------------------------
    // STEP 3: Add new students
    // -----------------------------
    for (const stu of addedStudents) {
      await StudentService.createStudent(
        {
          ...stu,
          classId,
          className,
          section,
        },
        {
          role: USER_ROLE.school,
          schoolId: schoolId,
        },
        session
      );
    }

    // -----------------------------
    // STEP 4: Update supervisor if provided
    // -----------------------------
    // if (superVisor && superVisor.teacherId && superVisor.teacherName) {
    //   await ClassSectionSupervisorService.addOrUpdateSupervisor({
    //     classId,
    //     className,
    //     section,
    //     teacherId: superVisor.teacherId,
    //     teacherName: superVisor.teacherName,
    //   });
    // }


    // -----------------------------
    // STEP 4: Add / Remove Supervisors
    // -----------------------------

    // REMOVE MULTIPLE SUPERVISORS
    if (payload.removeSupervisors && payload.removeSupervisors.length > 0) {
      await ClassSectionSupervisor.deleteMany(
        {
          classId,
          className,
          section,
          teacherId: { $in: payload.removeSupervisors.map(id => new mongoose.Types.ObjectId(id)) }
        },
        { session }
      );
    }

    // ADD MULTIPLE SUPERVISORS
    if (superVisors && superVisors.length > 0) {
      await ClassSectionSupervisorService.addMultipleSupervisors(
        {
          classId,
          className,
          section,
          superVisors: superVisors,
        },
        session
      );
    }

    // -----------------------------
    // Save routine and commit
    // -----------------------------
    await classRoutine.save({ session });
    await session.commitTransaction();
    session.endSession();

    return classRoutine;
  } catch (error) {

    console.log({error})
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};






const getUniqueSubjectsOfClassRoutine = async (
  schoolId: string,
  classId: string,
  section: string
): Promise<ISubjectWithTeachers[]> => {
  const schoolObjectId = new mongoose.Types.ObjectId(schoolId);
  const classObjectId = new mongoose.Types.ObjectId(classId);

  // 1. Get ClassRoutine for the class and section
  const classRoutine = await ClassRoutine.findOne({
    classId: classObjectId,
    section,
  }).lean();

  if (!classRoutine) return [];

  // 2. Collect unique subjects from routines
  const subjectMap = new Map<string, { subjectId: string; subjectName: string }>();
  classRoutine.routines.forEach((day) => {
    day.periods.forEach((period) => {
      if (period.subjectId) {
        const key = period.subjectId.toString();
        if (!subjectMap.has(key)) {
          subjectMap.set(key, {
            subjectId: key,
            subjectName: period.subjectName || 'Unknown',
          });
        }
      }
    });
  });

  const subjectIds = Array.from(subjectMap.keys()).map((id) => new mongoose.Types.ObjectId(id));

  // 3. Get assigned teachers for this class/section/subject
  const assignedTeachers = await AssignedSubjectTeacher.find({
    schoolId: schoolObjectId,
    classId: classObjectId,
    section,
    subjectId: { $in: subjectIds },
    isActive: true,
  })
    .select('subjectId teacherId teacherName')
    .lean();

  const assignedTeacherMap = new Map<string, { teacherId: string; teacherName: string }>();


  assignedTeachers.forEach((t) => {
    assignedTeacherMap.set(t.subjectId.toString(), {
      teacherId: t.teacherId.toString(),
      teacherName: t.teacherName,
    });
  });

   
  // 4. Get all teachers for these subjects from Teacher model
  const allTeachers = await Teacher.find({
    schoolId: schoolObjectId,
    subjectId: { $in: subjectIds },
  })
    .select('userId subjectId subjectName')
    .populate('userId', 'name')
    .lean();

  // 5. Map all teachers by subjectId
  const teacherMap = new Map<string, { teacherId: string; teacherName: string }[]>();
  allTeachers.forEach((t) => {
    const key = t.subjectId.toString();
    if (!teacherMap.has(key)) teacherMap.set(key, []);
    teacherMap.get(key)?.push({ teacherId: t._id.toString(), teacherName: (t.userId as any).name });
  });

  console.log('teacherMap', teacherMap);

  // 6. Combine final response
  // const result: ISubjectWithTeachers[] = Array.from(subjectMap.values()).map((sub) => ({
  //   subjectId: sub.subjectId,
  //   subjectName: sub.subjectName,
  //   assignedTeacher: assignedTeacherMap.get(sub.subjectId) || null,
  //   teacherList: teacherMap.get(sub.subjectId) || [],
  // }));

  const result: ISubjectWithTeachers[] = Array.from(subjectMap.values()).map((sub) => {
  console.log('Current sub:', sub); // <-- log the sub value here
  return {
    subjectId: sub.subjectId,
    subjectName: sub.subjectName,
    assignedTeacher: assignedTeacherMap.get(sub.subjectId) || null,
    teacherList: teacherMap.get(sub.subjectId) || [],
  };
});

  return result;
};




const getTodayUpcomingClasses = async (
  user: TAuthUser,
  query: Record<string, unknown>
) => {
  // ------------------------------
  // DAY + TIME SETUP
  // ------------------------------

  console.log("user", user);


  const today =
    (query.today as string)?.toLowerCase() ||
    dayjs().format("dddd").toLowerCase();

  // const nowTime =
  //   (query.nowTime as string) || dayjs().format("HH:mm");

  const todayDate = query.todayDate
    ? dayjs(query.todayDate as string).format("YYYY-MM-DD")
    : dayjs().format("YYYY-MM-DD");

  const startOfDay = dayjs(todayDate).startOf("day").toDate();
  const endOfDay = dayjs(todayDate).endOf("day").toDate();

  // ------------------------------
  // MATCH LOGIC BASED ON ROLE
  // ------------------------------
  let matchStage: any = {
    schoolId: new mongoose.Types.ObjectId(String(user.mySchoolId)),
  };

  if (user.role === USER_ROLE.teacher) {
    matchStage = {
      ...matchStage,
      // teacherId match will happen after unwind
    };
  } else if (user.role === USER_ROLE.student) {
    const student = await StudentService.findStudent(user.studentId);

    matchStage = {
      ...matchStage,
      classId: new mongoose.Types.ObjectId(String(student.classId)),
      section: student.section,
    };
  }

  const upcomingQuery = new AggregationQueryBuilder(query);

  // ------------------------------
  // AGGREGATION PIPELINE
  // ------------------------------
  const result = await upcomingQuery
    .customPipeline([
      // 1) Match school/class
      { $match: matchStage },

      // 2) Unwind routines
      { $unwind: "$routines" },

      // 3) Match today's day
      { $match: { "routines.day": today } },

      // 4) Unwind periods
      { $unwind: "$routines.periods" },
      // (NEW) Remove break periods + unassigned subjects
      {
        $match: {
          "routines.periods.isBreak": { $ne: true },
          "routines.periods.subjectId": { $ne: null },
        },
      },

      // 5) Teacher-specific match
      ...(user.role === USER_ROLE.teacher
        ? [
            {
              $match: {
                "routines.periods.teacherId": new mongoose.Types.ObjectId(
                  String(user.userId)
                ),
              },
            },
          ]
        : []),

      // 6) Filter upcoming periods
      // {
      //   $match: {
      //     $expr: {
      //       $gt: ["$routines.periods.startTime", nowTime],
      //     },
      //   },
      // },

      // 7) Lookup subject
      {
        $lookup: {
          from: "subjects",
          localField: "routines.periods.subjectId",
          foreignField: "_id",
          as: "subject",
        },
      },
      { $unwind: { path: "$subject", preserveNullAndEmptyArrays: true } },

      // 8) Lookup teacher
      {
        $lookup: {
          from: "users",
          localField: "routines.periods.teacherId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },



      // 9) Lookup class info
      {
        $lookup: {
          from: "classes",
          localField: "classId",
          foreignField: "_id",
          as: "classInfo",
        },
      },
      { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },

      // 10) Count total students
      {
        $lookup: {
          from: "students",
          let: { classId: "$classId", section: "$section" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$classId", "$$classId"] },
                    { $eq: ["$section", "$$section"] },
                  ],
                },
              },
            },
          ],
          as: "matchedStudents",
        },
      },

      // 11) Attendance lookup
      {
        $lookup: {
          from: "attendances",
          let: {
            classId: "$classId",
            section: "$section",
            periodNumber: "$routines.periods.periodNumber",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$classId", "$$classId"] },
                    { $eq: ["$section", "$$section"] },
                    { $eq: ["$periodNumber", "$$periodNumber"] },
                    { $eq: ["$day", today] },
                    { $gte: ["$date", startOfDay] },
                    { $lte: ["$date", endOfDay] },
                    { $eq: ["$isAttendance", true] },
                  ],
                },
              },
            },
          ],
          as: "attendanceRecords",
        },
      },

      // 12) Final projection
      {
        $project: {
          _id: 0,
          schoolId: 1,
          classId: 1,
          className: "$classInfo.className",
          section: 1,

          day: "$routines.day",
          periodNumber: "$routines.periods.periodNumber",
          subjectId: { $ifNull: ["$subject._id", "$routines.periods.subjectId"] },
          subjectName: {
            $ifNull: ["$subject.subjectName", "$routines.periods.subjectName"],
          },

          teacherId: {
            $ifNull: ["$user._id", "$routines.periods.teacherId"],
          },
          teacherName: {
            $ifNull: ["$user.name", "$routines.periods.teacherName"],
          },
          startTime: "$routines.periods.startTime",
          endTime: "$routines.periods.endTime",
          totalStudents: { $size: "$matchedStudents" },

          levelName: "$classInfo.levelName",


          // Attendance info
          isTakedAttendance: { $gt: [{ $size: "$attendanceRecords" }, 0] },

          // Attendance _id if exists
          attendanceId: {
            $cond: [
              { $gt: [{ $size: "$attendanceRecords" }, 0] },
              { $arrayElemAt: ["$attendanceRecords._id", 0] },
              "",
            ],
          },
        },
      },
    ])
    .sort()
    .paginate()
    .execute(ClassRoutine);

  // ------------------------------
  // Meta for pagination
  // ------------------------------
  const meta = await upcomingQuery.countTotal(ClassRoutine);

  return { meta, result };
};

const getClassScheduleByDay = async (
  user: TAuthUser,
  query: Record<string, unknown>
) => {
  if (user.role !== USER_ROLE.student) {
    throw new AppError(httpStatus.FORBIDDEN, "Only students can access this");
  }

  // -----------------------------
  // DAY LOGIC (NO DATE)
  // -----------------------------
  const today =
    (query.today as string)?.toLowerCase() ||
    dayjs().format("dddd").toLowerCase();

  // -----------------------------
  // STUDENT CLASS INFO
  // -----------------------------
  const student = await StudentService.findStudent(user.studentId);
  if (!student) throw new AppError(404, "Student not found");

  const matchStage = {
    schoolId: new mongoose.Types.ObjectId(String(user.mySchoolId)),
    classId: new mongoose.Types.ObjectId(String(student.classId)),
    section: student.section,
  };

  const scheduleQuery = new AggregationQueryBuilder(query);

  // -----------------------------
  // PIPELINE
  // -----------------------------
  const result = await scheduleQuery
    .customPipeline([
      { $match: matchStage },

      { $unwind: "$routines" },
      { $match: { "routines.day": today } },

      { $unwind: "$routines.periods" },

      // Remove breaks + empty subjects
      {
        $match: {
          "routines.periods.isBreak": { $ne: true },
          "routines.periods.subjectId": { $ne: null },
        },
      },

      // SUBJECT NAME
      {
        $lookup: {
          from: "subjects",
          localField: "routines.periods.subjectId",
          foreignField: "_id",
          as: "subject",
        },
      },
      { $unwind: { path: "$subject", preserveNullAndEmptyArrays: true } },

      // CLASS NAME
      {
        $lookup: {
          from: "classes",
          localField: "classId",
          foreignField: "_id",
          as: "classInfo",
        },
      },
      { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },

      // FINAL PROJECT (ONLY REQUIRED FIELDS)
      {
        $project: {
          _id: 0,

          day: "$routines.day",
          periodNumber: "$routines.periods.periodNumber",

          startTime: "$routines.periods.startTime",
          endTime: "$routines.periods.endTime",

          classId: 1,
          className: "$classInfo.className",
          section: 1,

          subjectName: {
            $ifNull: ["$subject.subjectName", "$routines.periods.subjectName"],
          },
        },
      },
    ])
    .sort()
    .paginate()
    .execute(ClassRoutine);

  const meta = await scheduleQuery.countTotal(ClassRoutine);

  return { meta, result };
};


const getTodayTeacherClasses = async (user: TAuthUser, query: Record<string, unknown> = {}) => {
  console.log(user);
  if (!user.teacherId || !user.mySchoolId) throw new AppError(400, "TeacherId or schoolId missing");

  const today = (query.today as string)?.toLowerCase() || dayjs().format("dddd").toLowerCase();
  const nowTime = (query.nowTime as string) || dayjs().format("HH:mm");

  const result = await ClassRoutine.aggregate([
    // Only routines for this school
    { 
      $match: { 
        schoolId: new mongoose.Types.ObjectId(String(user.mySchoolId))
      } 
    },

    // Unwind routines
    { $unwind: "$routines" },

    // Match today's day
    { $match: { "routines.day": today } },

    // Unwind periods
    { $unwind: "$routines.periods" },

    // Match teacher and upcoming time
    { 
      $match: { 
        "routines.periods.teacherId": new mongoose.Types.ObjectId(String(user.teacherId)),
        $expr: { $gt: ["$routines.periods.startTime", nowTime] }
      }
    },

    // Lookup class info
    {
      $lookup: {
        from: "classes",
        localField: "classId",
        foreignField: "_id",
        as: "classInfo",
      },
    },
    { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },

    // Lookup subject info
    {
      $lookup: {
        from: "subjects",
        localField: "routines.periods.subjectId",
        foreignField: "_id",
        as: "subject",
      },
    },
    { $unwind: { path: "$subject", preserveNullAndEmptyArrays: true } },

    // Final projection
    {
      $project: {
        _id: 0,
        classId: 1,
        section: 1,
        day: "$routines.day",
        periodNumber: "$routines.periods.periodNumber",
        startTime: "$routines.periods.startTime",
        endTime: "$routines.periods.endTime",
        subjectName: { $ifNull: ["$subject.subjectName", "$routines.periods.subjectName"] },
        className: "$classInfo.className",
        levelName: "$classInfo.levelName",
      },
    },

    // Sort by startTime
    { $sort: { startTime: 1 } },
  ]);

  return result;
};



const getTodayClassListByClassAndSection = async (
  classId: string,
  section: string,
  query: Record<string, unknown>,
  schoolId: string
) => {
  // ------------------------------
  // DAY + DATE SETUP
  // ------------------------------
  const today =
    (query.today as string)?.toLowerCase() ||
    dayjs().format("dddd").toLowerCase();

  const todayDate = query.todayDate
    ? dayjs(query.todayDate as string).format("YYYY-MM-DD")
    : dayjs().format("YYYY-MM-DD");

  const startOfDay = dayjs(todayDate).startOf("day").toDate();
  const endOfDay = dayjs(todayDate).endOf("day").toDate();

  // ------------------------------
  // MATCH LOGIC — CLASS + SECTION
  // ------------------------------
  const matchStage: any = {
    schoolId: new mongoose.Types.ObjectId(String(schoolId)),
    classId: new mongoose.Types.ObjectId(String(classId)),
    section: section,
  };

  const classQuery = new AggregationQueryBuilder(query);

  // ------------------------------
  // AGGREGATION PIPELINE
  // ------------------------------
  const result = await classQuery
    .customPipeline([
      // 1) Match school, class, section
      { $match: matchStage },

      // 2) Unwind routines
      { $unwind: "$routines" },

      // 3) Match today's day
      { $match: { "routines.day": today } },

      // 4) Unwind periods
      { $unwind: "$routines.periods" },

      // 5) Filter out periods with no subject
      {
        $match: {
          $expr: { $ne: ["$routines.periods.subjectId", null] },
        },
      },

      // 6) Lookup subject
      {
        $lookup: {
          from: "subjects",
          localField: "routines.periods.subjectId",
          foreignField: "_id",
          as: "subject",
        },
      },
      { $unwind: { path: "$subject", preserveNullAndEmptyArrays: true } },

      // 7) Lookup teacher
      {
        $lookup: {
          from: "teachers",
          localField: "routines.periods.teacherId",
          foreignField: "_id",
          as: "teacher",
        },
      },
      { $unwind: { path: "$teacher", preserveNullAndEmptyArrays: true } },

      // 8) Lookup class info
      {
        $lookup: {
          from: "classes",
          localField: "classId",
          foreignField: "_id",
          as: "classInfo",
        },
      },
      { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },

      // 9) Count total students in this class+section
      {
        $lookup: {
          from: "students",
          let: { classId: "$classId", section: "$section" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$classId", "$$classId"] },
                    { $eq: ["$section", "$$section"] },
                  ],
                },
              },
            },
          ],
          as: "matchedStudents",
        },
      },

      // 10) Find today’s attendance for this class & period
      {
        $lookup: {
          from: "attendances",
          let: {
            classId: "$classId",
            section: "$section",
            periodNumber: "$routines.periods.periodNumber",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$classId", "$$classId"] },
                    { $eq: ["$section", "$$section"] },
                    { $eq: ["$periodNumber", "$$periodNumber"] },
                    { $eq: ["$day", today] },
                    { $gte: ["$date", startOfDay] },
                    { $lte: ["$date", endOfDay] },
                    { $eq: ["$isAttendance", true] },
                  ],
                },
              },
            },
          ],
          as: "attendanceRecords",
        },
      },

      // 11) Final data shape
      {
        $project: {
          _id: 0,
          schoolId: 1,
          classId: 1,
          className: "$classInfo.className",
          levelName: "$classInfo.levelName",
          section: 1,

          day: "$routines.day",
          periodNumber: "$routines.periods.periodNumber",
          startTime: "$routines.periods.startTime",
          endTime: "$routines.periods.endTime",

          subjectId: { $ifNull: ["$subject._id", "$routines.periods.subjectId"] },
          subjectName: {
            $ifNull: ["$subject.subjectName", "$routines.periods.subjectName"],
          },

          teacherId: "$teacher._id",
          teacherName: "$teacher.name",

          totalStudents: { $size: "$matchedStudents" },

          // Attendance check
          isTakedAttendance: { $gt: [{ $size: "$attendanceRecords" }, 0] },

          // return attendanceId if exists
          attendanceId: {
            $cond: [
              { $gt: [{ $size: "$attendanceRecords" }, 0] },
              { $arrayElemAt: ["$attendanceRecords._id", 0] },
              "",
            ],
          },
        },
      },
    ])
    .sort()
    .paginate()
    .execute(ClassRoutine);

  // Pagination meta
  const meta = await classQuery.countTotal(ClassRoutine);

  return { meta, result };
};


const getHistoryClassListOfSpecificClassAndSectionByDate = async (
  classId: string,
  section: string,
  date: string, // "YYYY-MM-DD"
  schoolId: string
) => {
  const targetDay = dayjs(date).format("dddd").toLowerCase();
  const targetDateStart = dayjs(date).startOf("day").toDate();
  const targetDateEnd = dayjs(date).endOf("day").toDate();

  const matchStage: any = {
    schoolId: new mongoose.Types.ObjectId(String(schoolId)),
    classId: new mongoose.Types.ObjectId(String(classId)),
    section,
  };

  const classQuery = new AggregationQueryBuilder({});

  const result = await classQuery
    .customPipeline([
      // 1) Match school, class, section
      { $match: matchStage },

      // 2) Unwind routines
      { $unwind: "$routines" },

      // 3) Match day
      { $match: { "routines.day": targetDay } },

      // 4) Unwind periods
      { $unwind: "$routines.periods" },

      // 5) Lookup subject
      {
        $lookup: {
          from: "subjects",
          localField: "routines.periods.subjectId",
          foreignField: "_id",
          as: "subject",
        },
      },
      { $unwind: { path: "$subject", preserveNullAndEmptyArrays: false } }, // subjectId=null হলে skip হবে

      // 6) Lookup teacher
      {
        $lookup: {
          from: "teachers",
          localField: "routines.periods.teacherId",
          foreignField: "_id",
          as: "teacher",
        },
      },
      { $unwind: { path: "$teacher", preserveNullAndEmptyArrays: true } },

      // 7) Lookup class info
      {
        $lookup: {
          from: "classes",
          localField: "classId",
          foreignField: "_id",
          as: "classInfo",
        },
      },
      { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },

      // 8) Count total students
      {
        $lookup: {
          from: "students",
          let: { classId: "$classId", section: "$section" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$classId", "$$classId"] },
                    { $eq: ["$section", "$$section"] },
                  ],
                },
              },
            },
          ],
          as: "matchedStudents",
        },
      },

      // 9) Lookup attendance
      {
        $lookup: {
          from: "attendances",
          let: {
            classId: "$classId",
            section: "$section",
            periodNumber: "$routines.periods.periodNumber",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$classId", "$$classId"] },
                    { $eq: ["$section", "$$section"] },
                    { $eq: ["$periodNumber", "$$periodNumber"] },
                    { $eq: ["$day", targetDay] },
                    { $gte: ["$date", targetDateStart] },
                    { $lte: ["$date", targetDateEnd] },
                  ],
                },
              },
            },
          ],
          as: "attendanceRecords",
        },
      },

      // 10) Final projection
      {
        $project: {
          _id: 0,
          schoolId: 1,
          classId: 1,
          className: "$classInfo.className",
          levelName: "$classInfo.levelName",
          section: 1,
          day: "$routines.day",
          periodNumber: "$routines.periods.periodNumber",
          startTime: "$routines.periods.startTime",
          endTime: "$routines.periods.endTime",
          subjectId: "$subject._id",
          subjectName: "$subject.subjectName",
          teacherId: "$teacher._id",
          teacherName: "$teacher.name",
          totalStudents: { $size: "$matchedStudents" },

          isTakedAttendance: { $gt: [{ $size: "$attendanceRecords" }, 0] },

          attendanceId: {
            $cond: [
              { $gt: [{ $size: "$attendanceRecords" }, 0] },
              { $arrayElemAt: ["$attendanceRecords._id", 0] },
              "",
            ],
          },

          totalPresentStudents: {
            $cond: [
              { $gt: [{ $size: "$attendanceRecords" }, 0] },
              { $size: { $arrayElemAt: ["$attendanceRecords.presentStudents", 0] } },
              0,
            ],
          },
          totalAbsentStudents: {
            $cond: [
              { $gt: [{ $size: "$attendanceRecords" }, 0] },
              { $size: { $arrayElemAt: ["$attendanceRecords.absentStudents", 0] } },
              0,
            ],
          },
        },
      },
    ])
    .sort({ "startTime": 1 })
    .paginate()
    .execute(ClassRoutine);

  const meta = await classQuery.countTotal(ClassRoutine);

  return { meta, result };
};



const getTodayClassListForSchoolAdmin = async (
  schoolId: string,
  query: Record<string, unknown>
) => {
  if (!mongoose.Types.ObjectId.isValid(schoolId)) {
    throw new Error("Invalid schoolId");
  }

  const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

  // ------------------------------
  // DAY + DATE SETUP
  // ------------------------------
  const today =
    (query.today as string)?.toLowerCase() ||
    dayjs().format("dddd").toLowerCase();

  const todayDate = query.todayDate
    ? dayjs(query.todayDate as string).format("YYYY-MM-DD")
    : dayjs().format("YYYY-MM-DD");

  const startOfDay = dayjs(todayDate).startOf("day").toDate();
  const endOfDay = dayjs(todayDate).endOf("day").toDate();

  // ------------------------------
  // MATCH LOGIC — SCHOOL ONLY
  // ------------------------------
  const matchStage: any = {
    schoolId: schoolObjectId,
  };

  const classQuery = new AggregationQueryBuilder(query);

  // ------------------------------
  // AGGREGATION PIPELINE
  // ------------------------------
  const result = await classQuery
    .customPipeline([
      // 1) Match school
      { $match: matchStage },

      // 2) Unwind routines
      { $unwind: "$routines" },

      // 3) Match today's day
      { $match: { "routines.day": today } },

      // 4) Unwind periods
      { $unwind: "$routines.periods" },

      // 5) Lookup subject
      {
        $lookup: {
          from: "subjects",
          localField: "routines.periods.subjectId",
          foreignField: "_id",
          as: "subject",
        },
      },
      { $unwind: { path: "$subject", preserveNullAndEmptyArrays: true } },

      // 6) Lookup teacher
      {
        $lookup: {
          from: "teachers",
          localField: "routines.periods.teacherId",
          foreignField: "_id",
          as: "teacher",
        },
      },
      { $unwind: { path: "$teacher", preserveNullAndEmptyArrays: true } },

      // 7) Lookup class info
      {
        $lookup: {
          from: "classes",
          localField: "classId",
          foreignField: "_id",
          as: "classInfo",
        },
      },
      { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },

      // 8) Count total students in class+section
      {
        $lookup: {
          from: "students",
          let: { classId: "$classId", section: "$section" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$classId", "$$classId"] },
                    { $eq: ["$section", "$$section"] },
                  ],
                },
              },
            },
          ],
          as: "matchedStudents",
        },
      },

      // 9) Attendance lookup
      {
        $lookup: {
          from: "attendances",
          let: {
            classId: "$classId",
            section: "$section",
            periodNumber: "$routines.periods.periodNumber",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$classId", "$$classId"] },
                    { $eq: ["$section", "$$section"] },
                    { $eq: ["$periodNumber", "$$periodNumber"] },
                    { $eq: ["$day", today] },
                    { $gte: ["$date", startOfDay] },
                    { $lte: ["$date", endOfDay] },
                    { $eq: ["$isAttendance", true] },
                  ],
                },
              },
            },
          ],
          as: "attendanceRecords",
        },
      },

      // 10) Final projection
      {
        $project: {
          _id: 0,
          schoolId: 1,
          classId: 1,
          className: "$classInfo.className",
          levelName: "$classInfo.levelName",
          section: 1,

          day: "$routines.day",
          periodNumber: "$routines.periods.periodNumber",
          startTime: "$routines.periods.startTime",
          endTime: "$routines.periods.endTime",

          subjectId: { $ifNull: ["$subject._id", "$routines.periods.subjectId"] },
          subjectName: {
            $ifNull: ["$subject.subjectName", "$routines.periods.subjectName"],
          },

          teacherId: "$teacher._id",
          teacherName: "$teacher.name",

          totalStudents: { $size: "$matchedStudents" },

          isTakedAttendance: { $gt: [{ $size: "$attendanceRecords" }, 0] },

          attendanceId: {
            $cond: [
              { $gt: [{ $size: "$attendanceRecords" }, 0] },
              { $arrayElemAt: ["$attendanceRecords._id", 0] },
              "",
            ],
          },
        },
      },

      // 11) Filter out periods where subjectId is null
      { $match: { subjectId: { $ne: null } } },
    ])
    .sort()
    .paginate()
    .execute(ClassRoutine);

  // ------------------------------
  // Pagination meta
  // ------------------------------
  const meta = await classQuery.countTotal(ClassRoutine);

  return { meta, result };
};



const getHistoryClassListForSchoolAdminByDate = async (
  schoolId: string,
  date: string, // "YYYY-MM-DD"
  query: Record<string, unknown> = {}
) => {
  if (!mongoose.Types.ObjectId.isValid(schoolId)) {
    throw new Error("Invalid schoolId");
  }

  const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

  const targetDay = dayjs(date).format("dddd").toLowerCase();
  const targetDateStart = dayjs(date).startOf("day").toDate();
  const targetDateEnd = dayjs(date).endOf("day").toDate();

  const matchStage: any = {
    schoolId: schoolObjectId,
  };

  const classQuery = new AggregationQueryBuilder(query);

  const result = await classQuery
    .customPipeline([
      // 1) Match school
      { $match: matchStage },

      // 2) Unwind routines
      { $unwind: "$routines" },

      // 3) Match day
      { $match: { "routines.day": targetDay } },

      // 4) Unwind periods
      { $unwind: "$routines.periods" },

      // 5) Lookup subject
      {
        $lookup: {
          from: "subjects",
          localField: "routines.periods.subjectId",
          foreignField: "_id",
          as: "subject",
        },
      },
      { $unwind: { path: "$subject", preserveNullAndEmptyArrays: false } }, // skip if subjectId is null

      // 6) Lookup teacher
      {
        $lookup: {
          from: "teachers",
          localField: "routines.periods.teacherId",
          foreignField: "_id",
          as: "teacher",
        },
      },
      { $unwind: { path: "$teacher", preserveNullAndEmptyArrays: true } },

      // 7) Lookup class info
      {
        $lookup: {
          from: "classes",
          localField: "classId",
          foreignField: "_id",
          as: "classInfo",
        },
      },
      { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },

      // 8) Count total students
      {
        $lookup: {
          from: "students",
          let: { classId: "$classId", section: "$section" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$classId", "$$classId"] },
                    { $eq: ["$section", "$$section"] },
                  ],
                },
              },
            },
          ],
          as: "matchedStudents",
        },
      },

      // 9) Lookup attendance
      {
        $lookup: {
          from: "attendances",
          let: {
            classId: "$classId",
            section: "$section",
            periodNumber: "$routines.periods.periodNumber",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$classId", "$$classId"] },
                    { $eq: ["$section", "$$section"] },
                    { $eq: ["$periodNumber", "$$periodNumber"] },
                    { $eq: ["$day", targetDay] },
                    { $gte: ["$date", targetDateStart] },
                    { $lte: ["$date", targetDateEnd] },
                  ],
                },
              },
            },
          ],
          as: "attendanceRecords",
        },
      },

      // 10) Final projection
      {
        $project: {
          _id: 0,
          schoolId: 1,
          classId: 1,
          className: "$classInfo.className",
          levelName: "$classInfo.levelName",
          section: 1,
          day: "$routines.day",
          periodNumber: "$routines.periods.periodNumber",
          startTime: "$routines.periods.startTime",
          endTime: "$routines.periods.endTime",
          subjectId: "$subject._id",
          subjectName: "$subject.subjectName",
          teacherId: "$teacher._id",
          teacherName: "$teacher.name",
          totalStudents: { $size: "$matchedStudents" },

          isTakedAttendance: { $gt: [{ $size: "$attendanceRecords" }, 0] },

          attendanceId: {
            $cond: [
              { $gt: [{ $size: "$attendanceRecords" }, 0] },
              { $arrayElemAt: ["$attendanceRecords._id", 0] },
              "",
            ],
          },

          totalPresentStudents: {
            $cond: [
              { $gt: [{ $size: "$attendanceRecords" }, 0] },
              { $size: { $arrayElemAt: ["$attendanceRecords.presentStudents", 0] } },
              0,
            ],
          },
          totalAbsentStudents: {
            $cond: [
              { $gt: [{ $size: "$attendanceRecords" }, 0] },
              { $size: { $arrayElemAt: ["$attendanceRecords.absentStudents", 0] } },
              0,
            ],
          },
        },
      },
    ])
    .sort()
    .paginate()
    .execute(ClassRoutine);

  const meta = await classQuery.countTotal(ClassRoutine);

  return { meta, result };
};












export const ClassRoutineService = {
  getRoutineByClassAndSection,
  addPeriodToClassRoutine,
  updatePeriodInClassRoutine,
  removePeriodFromClassRoutine,
  addOrUpdateSubjectInRoutine,
  getUniqueSubjectsOfClassRoutine,
  addOrUpdateManySubjectsInRoutine,
  getTodayUpcomingClasses,
  getTodayTeacherClasses,
  getTodayClassListByClassAndSection,
  getHistoryClassListOfSpecificClassAndSectionByDate,
  getTodayClassListForSchoolAdmin,
  getHistoryClassListForSchoolAdminByDate,
  getClassScheduleByDay,
  getRoutineByToken
};