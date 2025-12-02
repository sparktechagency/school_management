import { Types } from "mongoose";

export type TPeriod = {
    periodNumber: number;
  name: string;        // Period 1, Break, etc.
  startTime: string;
  endTime: string;
};

export interface IClassPeriod {
  classId: Types.ObjectId;
  section: string;
  periods: TPeriod[];
}
