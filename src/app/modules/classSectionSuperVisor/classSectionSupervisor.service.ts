import { IClassSectionSupervisor } from "./classSectionSupervisor.interface";
import { ClassSectionSupervisor } from "./classSectionSupervisor.model";
import mongoose, {  ClientSession, Types } from 'mongoose';


const addOrUpdateSupervisor = async (payload: {
  classId: string;
  className: string;
  section: string;
  teacherId: string;
  teacherName: string;
}): Promise<IClassSectionSupervisor> => {

console.log("payload===>>>  ",payload);

  const { classId, className, section, teacherId, teacherName } = payload;

  // Convert string to ObjectId to match schema/interface
  const classObjectId = new Types.ObjectId(classId);

  const teacherObjectId = new Types.ObjectId(teacherId);
  
  // Check if supervisor already exists for this class + section
  const existingSupervisor = await ClassSectionSupervisor.findOne({
    classId: classObjectId,
    section,
  });

console.log("existingSupervisor===>>> ",existingSupervisor);

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

  console.log("newSupervisor===>>> ",newSupervisor);

  return newSupervisor;
};

const addMultipleSupervisors = async (
  payload: {
    classId: string;
    className: string;
    section: string;
    superVisors: Array<{
      teacherId: string;
      teacherName: string;
    }>;
    removeSupervisors?: [string];
  },
  session?: ClientSession
): Promise<IClassSectionSupervisor[]> => {

  const { classId, className, section, superVisors } = payload;

  console.log("payload===>>>  ",payload);

    // REMOVE MULTIPLE SUPERVISORS
    if (payload.removeSupervisors && payload.removeSupervisors.length > 0) {
      await ClassSectionSupervisor.deleteMany(
        {
          classId,
          className,
          section,
          teacherId: { $in: payload.removeSupervisors.map(id => new mongoose.Types.ObjectId(id)) }
        },
        { session }
      );
    }

  if (!superVisors || superVisors.length === 0) {
    return [];
  }

  // Prepare bulk data
  const insertDocs = superVisors.map(sup => ({
    classId: new Types.ObjectId(classId),
    className,
    section: section.trim(),
    teacherId: new Types.ObjectId(sup.teacherId),
    teacherName: sup.teacherName.trim(),
  }));

  // Insert many in one query
  const result = await ClassSectionSupervisor.insertMany(
    insertDocs,
    session ? { session } : {}
  );

  return result;
};



const removeSupervisor = async (payload: {
  classId: string;
  section: string;
  teacherId: string;
}) => {
  const { classId, section, teacherId } = payload;

  const classObjectId = new mongoose.Types.ObjectId(classId);

  const updated = await ClassSectionSupervisor.findOneAndUpdate(
    {
      classId: classObjectId,
      section,
    },
    {
      $pull: { supervisors: { teacherId: new mongoose.Types.ObjectId(teacherId) } },
    },
    { new: true }
  );

  return updated;
};

const removeManySupervisors = async (payload: {
  classId: string;
  section: string;
  teacherIds?: string[];
}) => {

  const { classId, section, teacherIds } = payload;

  // If no teacherIds → do nothing
  if (!teacherIds || teacherIds.length === 0) {
    return { deletedCount: 0, message: "No teacherIds provided" };
  }

  const deleteResult = await ClassSectionSupervisor.deleteMany({
    classId: new mongoose.Types.ObjectId(classId),
    section: section.toUpperCase(),
    teacherId: { 
      $in: teacherIds.map(id => new mongoose.Types.ObjectId(id)) 
    }
  });

  return deleteResult;
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
    removeSupervisor,
    getMySupervisorsClasses,
    addMultipleSupervisors,
    removeManySupervisors
};
