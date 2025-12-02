import { Schema, model } from "mongoose";
import { TPeriodAttendance, TPeriodStudent } from "./attendancePeriod.interface";

const studentSchema = new Schema<TPeriodStudent>({
  studentId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "Student",
  },
});

const PeriodAttendanceSchema = new Schema<TPeriodAttendance>(
  {
    schoolId: { 
        type: Schema.Types.ObjectId, 
        ref: "School", 
        required: true 
    },
    classId: { 
        type: Schema.Types.ObjectId, 
        ref: "Class", 
        required: true 
    },
    section: { 
        type: String, 
        required: true 
    },

    // From ClassRoutine
    day: { 
        type: String, 
        required: true 
    },              // monday, tuesday...
    date: { 
        type: Date, 
        required: true 
    },               // actual date
    periodNumber: { 
        type: Number, 
        required: true 
    },     // 1,2,3,4...
    startTime: { 
        type: String, 
        required: true 
    },
    endTime: { 
        type: String, 
        required: true 
    },

    subjectId: { 
        type: Schema.Types.ObjectId, 
        ref: "Subject", 
        default: null 
    },
    subjectName: { 
        type: String, 
        default: null 
    },
    teacherId: { 
        type: Schema.Types.ObjectId, 
        ref: "Teacher", 
        default: null 
    },

    isAttendance: { 
        type: Boolean, 
        default: false 
    },

    totalStudents: { 
        type: Number, 
        default: 0 
    },
    presentStudents: [studentSchema],
    absentStudents: [studentSchema],
  },
  { timestamps: true }
);

export const PeriodAttendance = model<TPeriodAttendance>(
  "PeriodAttendance",
  PeriodAttendanceSchema
);
