import { ClassRoutine } from "./classRoutine.model";
import normalSchoolPeriods from "../../../data/normalSchoolPeriods.json";
import { defaultDays } from "../class/class.utils";
import mongoose from "mongoose";

export const generateRoutineForSection = async (schoolId: string, classId: any, section: string, session: mongoose.ClientSession) => {
  // 1. Master periods (full info)
  const masterPeriods = normalSchoolPeriods.map(p => ({
    periodNumber: p.periodNumber,
    name: p.name,
    startTime: p.startTime,
    endTime: p.endTime,
    isBreak: p.isBreak ?? false,
  }));

  // 2. Daily routines (only periodNumber + placeholders for subject/teacher)
  const routines = defaultDays.map(day => ({
    day: day.toLowerCase(),
    periods: masterPeriods.map(p => ({
      periodNumber: p.periodNumber,
      subjectId: null,
      teacherId: null,
      startTime: p.startTime,
      endTime: p.endTime,
      isBreak: p.isBreak ?? false,
    })),
  }));

  // 3. Create ClassRoutine document
  const result = await ClassRoutine.create({
    schoolId,
    classId,
    section,
    periods: masterPeriods,
    routines,
  });

  return result;
};



