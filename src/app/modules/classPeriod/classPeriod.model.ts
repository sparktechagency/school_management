import { Schema, model } from "mongoose";
import { IClassPeriod } from "./classPeriod.interface";

const PeriodSchema = new Schema(
  {
    periodNumber: { 
      type: Number, 
      required: true 
    },
    name: { 
      type: String, 
      required: true 
    },
    startTime: { 
      type: String, 
      required: true 
    },
    endTime: { 
      type: String, 
      required: true 
    },
  },
  { _id: false }
);

const ClassPeriodSchema = new Schema<IClassPeriod>(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    section: { type: String, required: true },
    periods: { type: [PeriodSchema], required: true },
  },
  { timestamps: true }
);

export const ClassPeriod = model<IClassPeriod>("ClassPeriod", ClassPeriodSchema);
