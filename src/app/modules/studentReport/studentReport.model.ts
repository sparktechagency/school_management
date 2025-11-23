import { Schema, model } from 'mongoose';
import { IStudentReport } from './studentReport.interface';

const studentReportSchema = new Schema<IStudentReport>(
  {
    
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },

    reportId: {
      type: Schema.Types.ObjectId,
      ref: 'User', // teacher who gave report
      required: true,
    },

    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },

    section: {
      type: String,
      required: true,
      trim: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
        type: String,    
    }
    
  },
  { 
    timestamps: true 
  }
);

export const StudentReport = model<IStudentReport>(
  'StudentReport',
  studentReportSchema
);
