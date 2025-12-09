import { Types } from "mongoose";

// Single period template
export interface IPeriod {
  periodNumber: number;
  name: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  isBreak: boolean;
}

// Per-day period assignment
export interface IDayPeriod {
  periodNumber: number;
  subjectId: Types.ObjectId | null;
  subjectName: string | null;
  teacherId: Types.ObjectId | null;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  isBreak: boolean;
}

// Routine for each day
export interface IDayRoutine {
  day: string; // "saturday", "sunday", etc.
  periods: IDayPeriod[];
}

// ClassRoutine document
export interface IClassRoutine {
  schoolId: Types.ObjectId;
  classId: Types.ObjectId;
  section: string;
  periods: IPeriod[];       // Master period template
  routines: IDayRoutine[];  // Daily assignments
}

export interface ISubjectWithTeachers {
  subjectId: string;
  subjectName: string;
  assignedTeacher: { teacherId: string; teacherName: string } | null;
  teacherList: { teacherId: string; teacherName: string }[];
}

export interface AddSubjectPayload {
  classId: string;
  section: string;
  day: string;
  periodNumber: number;
  subjectId: string;
}


interface RoutineItem {
  day: string;
  periodNumber: number;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
}



export interface AddSubjectToRoutinePayload {
  schoolId: string;
  classId: string;
  section: string;
  day: string;
  periodNumber: number;
  subjectId: string;
  subjectName: string;
}

export interface ManyRoutinePayload {
  schoolId: string;
  classId: string;
  className: string;
  section: string;
  periods?: {
    periodNumber: number;
    periodName: string;
    startTime: string;
    endTime: string;
    isBreak?: boolean;
  }[];
  routine?: {
    day: string;
    periodNumber: number;
    subjectId: string;
    subjectName: string;
    teacherId?: string;
    teacherName?: string;
  }[];
  addedStudents?: {
    name: string;
    phoneNumber: string;
    gender: string;
    fatherPhoneNumber: string;
    motherPhoneNumber: string;
  }[];
  superVisors?: [{
    teacherId: string;
    teacherName: string;
  } ] | null;
  removeSupervisors?: [
    string
  ] | null
}
