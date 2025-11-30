
import { Types } from "mongoose";

export type TAttendanceStudent = {
  studentId: Types.ObjectId;
};

export type TAttendance = {
  _id?: Types.ObjectId;

  schoolId: Types.ObjectId;
  classId: Types.ObjectId;

  className: string;
  section: string;

  day: string;               // lowercase: monday, tuesday...
  date: Date;              // "YYYY-MM-DD"

  periodNumber: number;
  periodName: string;

  subjectId: Types.ObjectId | null;
  subjectName: string | null;

  takenBy: Types.ObjectId | null;
  takenByName: string | null;

  startTime: string;
  endTime: string;

  totalStudents: number;

  isAttendance: boolean;

  presentStudents: TAttendanceStudent[] | string[];
  absentStudents: TAttendanceStudent[] | string[];
};

export interface UpdateAttendancePayload {
  presentStudents?: string[]; // array of studentIds as string
  absentStudents?: string[];  // array of studentIds as string
}



// this is mahin vhai code

// import { ObjectId } from 'mongoose';
// import { TDays } from '../classSchedule/classSchedule.interface';

// export type TAttendanceStudent = {
//   studentId: ObjectId;
// };

// export type TAttendance = {
//   classScheduleId: ObjectId;
//   schoolId: ObjectId;
//   classId: ObjectId;
//   className: string;

//   days: TDays;
//   section: string;
//   totalStudents: number;
//   presentStudents: TAttendanceStudent[];
//   absentStudents: TAttendanceStudent[];
//   date: Date;
//   isAttendance: boolean;
// };
