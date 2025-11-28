import mongoose from "mongoose";
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

const getRoutineByClassAndSection = async (classId: string, section: string) => {
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
    ...routine.periods[masterIndex].toObject(),
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
  const {
    schoolId,
    classId,
    className,
    section,
    periods = [],
    routine = [],
    addedStudents = [],
    superVisor,
  } = payload;

  if (!schoolId || !classId || !section) {
    throw new AppError(httpStatus.BAD_REQUEST, "schoolId, classId and section are required");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const classObjectId = new mongoose.Types.ObjectId(classId);
    const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

    // Fetch existing class routine
    const classRoutine = await ClassRoutine.findOne({
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
        { role: "admin", schoolId },
        session
      );
    }

    // -----------------------------
    // STEP 4: Update supervisor if provided
    // -----------------------------
    if (superVisor && superVisor.teacherId && superVisor.teacherName) {
      await ClassSectionSupervisorService.addOrUpdateSupervisor({
        classId,
        className,
        section,
        teacherId: superVisor.teacherId,
        teacherName: superVisor.teacherName,
      });
    }

    // -----------------------------
    // Save routine and commit
    // -----------------------------
    await classRoutine.save({ session });
    await session.commitTransaction();
    session.endSession();

    return classRoutine;
  } catch (error) {
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
    teacherMap.get(key)?.push({ teacherId: t._id.toString(), teacherName: t.userId.name });
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



export const getTodayUpcomingClasses = async (
  user: TAuthUser,
  query: Record<string, unknown>
) => {
  // auto lowercase day
  let today = (query.today as string)?.toLowerCase() 
    || dayjs().format("dddd").toLowerCase();

  // auto time if not provided
  const nowTime = (query.nowTime as string) || dayjs().format("HH:mm");

  const upcomingQuery = new AggregationQueryBuilder(query);

  // ========================================================
  // MATCH STAGE BASED ON USER ROLE
  // ========================================================
  let matchStage: any = {};

  if (user.role === USER_ROLE.teacher) {
    matchStage = {
      "routines.periods.teacherId": new mongoose.Types.ObjectId(String(user.teacherId)),
    };
  } 
  else if (user.role === USER_ROLE.student) {
    const student = await StudentService.findStudent(user.studentId);

    matchStage = {
      classId: new mongoose.Types.ObjectId(String(student.classId)),
      section: student.section,
    };
  }

  // ========================================================
  // FULL PIPELINE
  // ========================================================
  const result = await upcomingQuery
    .customPipeline([
      // -------------------------------------
      // 1) Match Routine by class or teacher
      // -------------------------------------
      {
        $match: matchStage,
      },

      // -------------------------------------
      // 2) Unwind routines
      // -------------------------------------
      { $unwind: "$routines" },

      // -------------------------------------
      // 3) Filter Today’s Routine
      // -------------------------------------
      {
        $match: { "routines.day": today },
      },

      // -------------------------------------
      // 4) Unwind periods inside today's routine
      // -------------------------------------
      { $unwind: "$routines.periods" },

      // -------------------------------------
      // 5) Filter upcoming classes (nowTime)
      // -------------------------------------
      {
        $match: {
          $expr: {
            $gt: ["$routines.periods.startTime", nowTime],
          },
        },
      },

      // -------------------------------------
      // 6) Lookup Subject
      // -------------------------------------
      {
        $lookup: {
          from: "subjects",
          localField: "routines.periods.subjectId",
          foreignField: "_id",
          as: "subject",
        },
      },
      { $unwind: { path: "$subject", preserveNullAndEmptyArrays: true } },

      // -------------------------------------
      // 7) Lookup Teacher
      // -------------------------------------
      {
        $lookup: {
          from: "teachers",
          localField: "routines.periods.teacherId",
          foreignField: "_id",
          as: "teacher",
        },
      },
      { $unwind: { path: "$teacher", preserveNullAndEmptyArrays: true } },

      // -------------------------------------
      // 8) Lookup Class Info
      // -------------------------------------
      {
        $lookup: {
          from: "classes",
          localField: "classId",
          foreignField: "_id",
          as: "classInfo",
        },
      },
      { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },

      // -------------------------------------
      // 9) Count Total Students
      // -------------------------------------
      {
        $lookup: {
          from: "students",
          let: {
            classId: "$classId",
            section: "$section",
          },
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

      // -------------------------------------
      // 10) Final Projection
      // -------------------------------------
      {
        $project: {
          _id: 0,
          classId: 1,
          section: 1,
          day: "$routines.day",
          periodNumber: "$routines.periods.periodNumber",
          startTime: "$routines.periods.startTime",
          endTime: "$routines.periods.endTime",

          subjectName: {
            $ifNull: ["$subject.subjectName", "$routines.periods.subjectName"],
          },

          teacherName: "$teacher.name",

          className: "$classInfo.className",
          levelName: "$classInfo.levelName",

          totalStudents: { $size: "$matchedStudents" },
        },
      },
    ])
    .sort()
    .paginate()
    .execute(ClassRoutine);

  // Count for pagination
  const meta = await upcomingQuery.countTotal(ClassRoutine);

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
  getTodayUpcomingClasses
};