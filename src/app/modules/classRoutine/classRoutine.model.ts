import { Schema, model, Types } from "mongoose";
import { IClassRoutine, IPeriod, IDayRoutine, IDayPeriod } from "./classRoutine.interface";

// Master period schema
const PeriodSchema = new Schema<IPeriod>(
  {
    periodNumber: { type: Number, required: true },
    name: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    isBreak: { type: Boolean, default: false },
  },
  { _id: false }
);

// Per-day period schema (only subject and teacher)
const DayPeriodSchema = new Schema<IDayPeriod>(
  {
    periodNumber: { type: Number, required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", default: null },
    subjectName: {type: String, default: null},
    teacherId: { type: Schema.Types.ObjectId, ref: "Teacher", default: null },
    startTime: { type: String, required: true }, // new
    endTime: { type: String, required: true },   // new
    isBreak: { type: Boolean, default: false },
  },
  { _id: false }
);

// Per-day routine schema
const DayRoutineSchema = new Schema<IDayRoutine>(
  {
    day: { type: String, required: true },
    periods: { type: [DayPeriodSchema], default: [] },
  },
  { _id: false }
);

// ClassRoutine schema
const ClassRoutineSchema = new Schema<IClassRoutine>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    section: { type: String, required: true },
    periods: { type: [PeriodSchema], default: [] },    // Master period template
    routines: { type: [DayRoutineSchema], default: [] }, // Daily subject/teacher assignments
  },
  { timestamps: true }
);

export const ClassRoutine = model<IClassRoutine>("ClassRoutine", ClassRoutineSchema);
