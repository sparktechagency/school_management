import { Schema, model } from 'mongoose';
import { IStudentNote } from './studentNote.interface';

const studentNoteSchema = new Schema<IStudentNote>(
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

    noteBy: {
      type: Schema.Types.ObjectId,
      ref: 'User', // teacher
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
    
  },
  {
    timestamps: true,
  }
);

export const StudentNote = model<IStudentNote>('StudentNote', studentNoteSchema);
