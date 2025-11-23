import { Types } from 'mongoose';

export interface IStudentNote {
  schoolId: Types.ObjectId;
  studentId: Types.ObjectId;
  noteBy: Types.ObjectId; // teacher who added note
  classId: Types.ObjectId;
  section: string;
  text: string;
}
