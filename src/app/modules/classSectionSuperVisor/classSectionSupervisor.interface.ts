import { Types } from 'mongoose';

export interface IClassSectionSupervisor {
  classId: Types.ObjectId;
  className: string;
  section: string;
  teacherId: Types.ObjectId;
  teacherName: string;
}