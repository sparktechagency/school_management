import mongoose from "mongoose";
import { ClassPeriod } from "../classPeriod/classPeriod.model";
import { ClassRoutine } from "../classRoutine/classRoutine.model";

export const defaultDays = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

export const sanitizeSections = (sections: string[] = []) => {
  // 1. Convert to uppercase
  const upperSections = sections.map((s) => s.toUpperCase().trim());

  // 2. Remove duplicates
  const uniqueSections = Array.from(new Set(upperSections));

  return uniqueSections;
};

// Generate routine for a specific class & section
export const generateRoutineForSection = async (classId: string, section: string, session: mongoose.ClientSession) => {
  const classPeriod = await ClassPeriod.findOne({ classId, section }).session(session);
  if (!classPeriod) throw new Error(`ClassPeriod not found for section ${section}`);

  const routines = defaultDays.map((day) => ({
    day,
    periods: classPeriod.periods.map((p) => ({
      periodNumber: p.periodNumber,
      name: p.name,
      startTime: p.startTime,
      endTime: p.endTime,
      subject: "",      // initially empty
      teacherId: null,  // initially empty
    })),
  }));

  return await ClassRoutine.create(
    [
      {
        classId,
        section,
        routines,
      },
    ],
    { session }
  );
};








export const addOrUpdateManySubjectsInRoutine = async (payload: ManyRoutinePayload) => {
  const {
    schoolId,
    classId,
    className,
    section,
    superVisorId,
    periods = [],
    routine = [],
    addedStudents = [],
    removedStudents = []
  } = payload;

  if (!schoolId || !classId || !section) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "schoolId, classId and section are required"
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const classObjectId = new mongoose.Types.ObjectId(classId);
    const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

    /* -------------------------------------------------------------
       STEP 1: Fetch existing routine
    ------------------------------------------------------------- */
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

    // OPTIONAL: save supervisor
    if (superVisorId) {
      classRoutine.superVisorId = new mongoose.Types.ObjectId(superVisorId);
    }

    /* -------------------------------------------------------------
       STEP 2: PERIODS (Add or Update)
    ------------------------------------------------------------- */
    for (const p of periods) {
      let masterPeriod = classRoutine.periods.find(mp => mp.periodNumber === p.periodNumber);

      if (!masterPeriod) {
        // New Period
        classRoutine.periods.push({
          periodNumber: p.periodNumber,
          name: p.periodName,
          startTime: p.startTime,
          endTime: p.endTime,
          isBreak: p.isBreak ?? false
        });
      } else {
        // Update existing
        masterPeriod.name = p.periodName;
        masterPeriod.startTime = p.startTime;
        masterPeriod.endTime = p.endTime;
        masterPeriod.isBreak = p.isBreak ?? masterPeriod.isBreak;
      }

      // Ensure each day's routine has updated period
      classRoutine.routines.forEach(day => {
        let existing = day.periods.find(per => per.periodNumber === p.periodNumber);

        if (!existing) {
          day.periods.push({
            periodNumber: p.periodNumber,
            subjectId: null,
            subjectName: null,
            teacherId: null,
            startTime: p.startTime,
            endTime: p.endTime,
            isBreak: p.isBreak ?? false
          });
        } else {
          existing.startTime = p.startTime;
          existing.endTime = p.endTime;
          existing.isBreak = p.isBreak ?? existing.isBreak;
        }
      });
    }

    /* -------------------------------------------------------------
       STEP 3: ROUTINE UPDATE (Subjects & Teachers)
    ------------------------------------------------------------- */
    for (const r of routine) {
      const { day, periodNumber, subjectId, subjectName, teacherId, teacherName } = r;

      const dayRoutine = classRoutine.routines.find(
        d => d.day.toLowerCase() === day.toLowerCase()
      );

      if (!dayRoutine) {
        throw new AppError(httpStatus.BAD_REQUEST, `Day "${day}" does not exist`);
      }

      const period = dayRoutine.periods.find(p => p.periodNumber === periodNumber);

      if (!period) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Period ${periodNumber} not found on ${day}`
        );
      }

      // Update period subject + teacher
      period.subjectId = new mongoose.Types.ObjectId(subjectId);
      period.subjectName = subjectName;

      period.teacherId = teacherId ? new mongoose.Types.ObjectId(teacherId) : null;
      (period as any).teacherName = teacherName || null;

      /* ---------------------------------------------------------
         AUTO SYNC TEACHER ASSIGNMENT TABLE
      --------------------------------------------------------- */
      await assignTeacherToSubject(
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

    /* -------------------------------------------------------------
       STEP 4: ADD NEW STUDENTS
    ------------------------------------------------------------- */
    for (const stu of addedStudents) {
      await createStudent(stu, { role: "admin", schoolId }, session);
    }

    /* -------------------------------------------------------------
       STEP 5: REMOVE STUDENTS
    ------------------------------------------------------------- */
    for (const id of removedStudents) {
      await Student.findByIdAndUpdate(
        id,
        { isActive: false },
        { session }
      );
    }

    /* -------------------------------------------------------------
       SAVE + COMMIT
    ------------------------------------------------------------- */
    await classRoutine.save({ session });

    await session.commitTransaction();
    session.endSession();

    return classRoutine;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};
