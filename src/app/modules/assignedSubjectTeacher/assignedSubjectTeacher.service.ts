import httpStatus from "http-status";
import AppError from "../../utils/AppError";
import { AssignTeacherPayload } from "./assignedSubjectTeacher.interface";
import mongoose from "mongoose";
import AssignedSubjectTeacher from "./assignedSubjectTeacher.model";
import { ClassRoutine } from "../classRoutine/classRoutine.model";



const assignTeacherToSubject = async (payload: AssignTeacherPayload, session: mongoose.ClientSession) => {
  const {
    schoolId,
    classId,
    className,
    section,
    subjectId,
    subjectName,
    teacherId,
    teacherName,
  } = payload;

  if (!schoolId || !classId || !section || !subjectId || !teacherId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "schoolId, classId, section, subjectId and teacherId are required"
    );
  }

  // const session = await mongoose.startSession();
  // session.startTransaction();

  try {
    const schoolObjectId = new mongoose.Types.ObjectId(schoolId);
    const classObjectId = new mongoose.Types.ObjectId(classId);
    const subjectObjectId = new mongoose.Types.ObjectId(subjectId);
    const teacherObjectId = new mongoose.Types.ObjectId(teacherId);

    // ----------------------------
    // Check/Create or Update AssignedSubjectTeacher
    // ----------------------------
    let assignedTeacher = await AssignedSubjectTeacher.findOne({
      schoolId: schoolObjectId,
      classId: classObjectId,
      section,
      subjectId: subjectObjectId,
      isActive: true,
    }).session(session) as any;

    if (assignedTeacher) {
      assignedTeacher.teacherId = teacherObjectId as any;
      assignedTeacher.teacherName = teacherName;
      assignedTeacher.dateAssigned = new Date();
      await assignedTeacher.save({ session });
    } else {
      assignedTeacher = await AssignedSubjectTeacher.create(
        [
          {
            schoolId: schoolObjectId,
            classId: classObjectId,
            className,
            section,
            subjectId: subjectObjectId,
            subjectName,
            teacherId: teacherObjectId,
            teacherName,
            dateAssigned: new Date(),
          },
        ],
        { session }
      );
    }

    // ----------------------------
    // Update ClassRoutine periods
    // ----------------------------
    const routine = await ClassRoutine.findOne({ classId: classObjectId, section }).session(session);

    if (!routine) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        `Routine not found for classId "${classId}" and section "${section}"`
      );
    }

    for (const dayRoutine of routine.routines) {
      for (const period of dayRoutine.periods) {
        if (period.subjectId?.toString() === subjectId) {
          period.teacherId = teacherObjectId; // assign teacher
        }
      }
    }

    await routine.save({ session });



    return routine;
  } catch (error) {
    throw error;
  }
};

export const AssignedSubjectTeacherService = {
  assignTeacherToSubject,
};