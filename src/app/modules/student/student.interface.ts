import { ObjectId } from 'mongoose';

type TTeacherNote = {
  teacherId: ObjectId;
  teacherName: string;
  message: string;
  addTime: Date;
};

// Termination info type
type TTermination = {
  terminatedDays: number;
  terminateBy: ObjectId;
  terminateReason?: string;
  actionTime: Date;
  removedBy?: ObjectId;
  removedTime?: Date;
};

export interface TerminateStudentPayload {
  studentId: string;
  terminateBy: string; // teacher/user ID
  terminatedDays: number;
}

export interface RemoveTerminationPayload {
  studentId: string;
  removedBy: string; // teacher or admin removing the termination
}


export interface SummonStudentPayload {
  studentId: string;
  summonedBy: string; // userId of the teacher/admin performing the action
}

export type TStudent = {
  userId: ObjectId;
  schoolId: ObjectId;
  classId: ObjectId;
  section: string;
  schoolName: string;
  className: string;
  fatherPhoneNumber: string;
  motherPhoneNumber: string;
  parentsMessage: string;
  isTerminated?: boolean;
  termination?: TTermination | null;
  summoned?: boolean;
  summonedBy?: ObjectId;
};

export type StudentRow = {
  name: string;
  phoneNumber: string;
  fatherPhoneNumber: string;
  motherPhoneNumber: string;
  className: string;
  schoolName: string;
  section: string;
  schoolId: string;
  classId: string;
};
