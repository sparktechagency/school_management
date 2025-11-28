
import { ClassPeriod } from "./classPeriod.model";
import { IClassPeriod, TPeriod } from "./classPeriod.interface";
import AppError from "../../utils/AppError";
import mongoose, { mongo } from "mongoose";

const createClassPeriod = async (payload: IClassPeriod) => {
  const exists = await ClassPeriod.findOne({
    classId: payload.classId,
    section: payload.section,
  });

  if (exists) {
    throw new AppError(400, "Class period already exists for this class & section");
  }

  const result = await ClassPeriod.create(payload);
  return result;
};

const addSinglePeriod = async (
  classId: string,
  section: string,
  period: TPeriod
) => {
  let exists = await ClassPeriod.findOne({ classId, section });

  // If NOT exists → create a new one with periodNumber = 1
  if (!exists) {
    const newPeriod = {
      ...period,
      periodNumber: 1,
    };

    exists = await ClassPeriod.create({
      classId,
      section,
      periods: [newPeriod],
    });

    return exists;
  }

  // If exists → auto-assign next period number
  const nextPeriodNumber = exists.periods.length + 1;

  const newPeriod = {
    ...period,
    periodNumber: nextPeriodNumber,
  };

  exists.periods.push(newPeriod);
  await exists.save();

  return exists;
};

const getClassPeriod = async (classId: string, section: string) => {
  const result = await ClassPeriod.findOne({ classId: new mongoose.Types.ObjectId(classId), section });
  if (!result) throw new AppError(404, "Class period structure not found");
  return result;
};

const updateClassPeriod = async (
  classId: string,
  section: string,
  periods: TPeriod[]
) => {
  const result = await ClassPeriod.findOneAndUpdate(
    { classId, section },
    { periods },
    { new: true }
  );

  if (!result) throw new AppError(404, "Class period data not found");

  return result;
};

const deleteClassPeriod = async (classId: string, section: string) => {
  const result = await ClassPeriod.findOneAndDelete({ classId, section });

  if (!result) throw new AppError(404, "Class period not found");

  return result;
};

export const ClassPeriodService = {
  addSinglePeriod,
  createClassPeriod,
  getClassPeriod,
  updateClassPeriod,
  deleteClassPeriod,
};
