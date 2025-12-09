import { Schema, model, Types } from 'mongoose';
import { IClassSectionSupervisor } from './classSectionSupervisor.interface';


const classSectionSupervisorSchema = new Schema<IClassSectionSupervisor>(
  {
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    className: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      required: true,
      trim: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    teacherName: {
      type: String,
      required: true,
      trim: true,
    }
  },
  {
    timestamps: true,
  }
);

export const ClassSectionSupervisor = model<IClassSectionSupervisor>(
  'ClassSectionSupervisor',
  classSectionSupervisorSchema
);
