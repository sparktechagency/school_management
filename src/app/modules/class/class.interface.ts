import { ObjectId } from 'mongoose';

export type TClass = {
  levelId: ObjectId;
  schoolId: ObjectId;
  className: string;
  levelName: string;
  section: string[];
};
 export interface IClassSection {
  classId: string;
  className: string;
  levelName: string;
  section: string;
  totalStudents: number;
}

export interface ILevelClassesFlat {
  levelId: string;
  levelName: string;
  classes: {
    classId: string;
    className: string;
    section: string;
    totalStudents: number;
  }[];
}