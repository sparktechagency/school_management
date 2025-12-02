import mongoose from "mongoose";
import { ClassPeriod } from "../classPeriod/classPeriod.model";
import { ClassRoutine } from "../classRoutine/classRoutine.model";
import { ManyRoutinePayload } from "../classRoutine/classRoutine.interface";

export const defaultDays = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

export const sanitizeSections = (sections: string[] = []) => {
  // 1. Convert to uppercase
  const upperSections = sections.map((s) => s.toUpperCase().trim());

  // 2. Remove duplicates
  const uniqueSections = Array.from(new Set(upperSections));

  return uniqueSections;
};

// Generate routine for a specific class & section
export const generateRoutineForSection = async (classId: string, section: string, session: mongoose.ClientSession) => {
  const classPeriod = await ClassPeriod.findOne({ classId, section }).session(session);
  if (!classPeriod) throw new Error(`ClassPeriod not found for section ${section}`);

  const routines = defaultDays.map((day) => ({
    day,
    periods: classPeriod.periods.map((p) => ({
      periodNumber: p.periodNumber,
      name: p.name,
      startTime: p.startTime,
      endTime: p.endTime,
      subject: "",      // initially empty
      teacherId: null,  // initially empty
    })),
  }));

  return await ClassRoutine.create(
    [
      {
        classId,
        section,
        routines,
      },
    ],
    { session }
  );
};





