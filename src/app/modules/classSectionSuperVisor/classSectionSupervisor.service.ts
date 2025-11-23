import { IClassSectionSupervisor } from "./classSectionSupervisor.interface";
import { ClassSectionSupervisor } from "./classSectionSupervisor.model";
import mongoose, {  Types } from 'mongoose';


const addOrUpdateSupervisor = async (payload: {
  classId: string;
  className: string;
  section: string;
  teacherId: string;
  teacherName: string;
}): Promise<IClassSectionSupervisor> => {
  const { classId, className, section, teacherId, teacherName } = payload;

  // Convert string to ObjectId to match schema/interface
  const classObjectId = new Types.ObjectId(classId);
  const teacherObjectId = new Types.ObjectId(teacherId);
  // Check if supervisor already exists for this class + section
  const existingSupervisor = await ClassSectionSupervisor.findOne({
    classId: classObjectId,
    section,
  });

  if (existingSupervisor) {
    // Update existing supervisor
    existingSupervisor.teacherId = teacherObjectId ;
    existingSupervisor.teacherName = teacherName;
    await existingSupervisor.save();

    return existingSupervisor;
  }

  // Create new supervisor
  const newSupervisor = await ClassSectionSupervisor.create({
    classId,
    className,
    section,
    teacherId,
    teacherName,
  });

  return newSupervisor;
};

const getMySupervisorsClasses = async (teacherId: string) => {

    console.log({teacherId})

  const result = await ClassSectionSupervisor.aggregate([
    {
      $match: {
        teacherId: new mongoose.Types.ObjectId(teacherId),
      },
    },

    {
      $lookup: {
        from: "students",
        let: {
          classId: "$classId",
          section: "$section"
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$classId", "$$classId"] },
                  { $eq: ["$section", "$$section"] }
                ],
              },
            },
          },
        ],
        as: "students",
      },
    },

    {
      $addFields: {
        totalStudents: { $size: "$students" },
      },
    },

    {
      $project: {
        students: 0, // we don’t need the full list, only count
      },
    },
  ]);

  return result;
};

export const ClassSectionSupervisorService = { 
    addOrUpdateSupervisor,
    getMySupervisorsClasses
};
