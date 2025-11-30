import { ObjectId } from "mongoose";
import { TDays } from "../classSchedule/classSchedule.interface";

export type TAssignedSubjectTeacher = {
  schoolId: ObjectId;
  classId: ObjectId;
  className: string;

  section: string;

  subjectId: ObjectId;
  subjectName: string;

  teacherId: ObjectId;
  teacherName: string;

  dateAssigned: Date;
  isActive: boolean;
};



export interface AssignTeacherPayload {
  schoolId: string;
  classId: string;
  className: string;
  section: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName?: string;
}