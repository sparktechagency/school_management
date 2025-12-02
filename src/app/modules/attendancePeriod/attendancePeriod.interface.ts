import { Types } from "mongoose";

export type TPeriodStudent = {
  studentId: Types.ObjectId;
};

export type TPeriodAttendance = {
  schoolId: Types.ObjectId;
  classId: Types.ObjectId;
  section: string;

  // Day & Date information
  day: string;  // monday, tuesday, ...
  date: Date;   // actual date (YYYY-MM-DD)

  // Period information
  periodNumber: number;
  startTime: string;
  endTime: string;

  // Subject / Teacher information
  subjectId: Types.ObjectId | null;
  subjectName: string | null;
  teacherId: Types.ObjectId | null;

  // Attendance data
  isAttendance: boolean;
  totalStudents: number;
  presentStudents: TPeriodStudent[];
  absentStudents: TPeriodStudent[];
};
