import { Types } from 'mongoose';

export interface IStudentReport {
  schoolId: Types.ObjectId;
  studentId: Types.ObjectId;
  reportId: Types.ObjectId;
  classId: Types.ObjectId;
  section: string;
  text: string;
  image?: string;
}
