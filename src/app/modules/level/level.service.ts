/* eslint-disable @typescript-eslint/no-explicit-any */
import { TAuthUser } from '../../interface/authUser';
import { getSchoolIdFromUser } from '../../utils/getSchoolIdForManager';
import Class from '../class/class.model';
import { TLevel } from './level.interface';
import Level from './level.model';

const createLevel = async (payload: TLevel, user: TAuthUser) => {
  const schoolId = getSchoolIdFromUser(user);

  const result = await Level.create({
    ...payload,
    schoolId,
  });
  return result;
};

const getAllLevels = async (user: TAuthUser) => {
  const schoolId = getSchoolIdFromUser(user);

  const result = await Level.find({ schoolId });
  return result;
};

const updateLevel = async (id: string, payload: Partial<TLevel>) => {
  const result = await Level.findByIdAndUpdate(id, payload, { new: true });
  return result;
};

const deleteLevel = async (id: string) => {
  const findClass = await Class.find({ levelId: id });

  const result = await Level.findByIdAndDelete(id);

  if (result && findClass.length > 0) {
    await Class.deleteMany({ levelId: id });
  }
  return result;
};

const getLevelsWithClassesOfSchool =  async (schoolId: string) => {
    // 1. Get all levels of this school
    const levels = await Level.find({ schoolId })
      .select('_id levelName')
      .lean();

    if (!levels.length) {
      return [];
    }

    const levelIds = levels.map((l) => l._id);

    // 2. Get all classes from those levels
    const classes = await Class.find({ levelId: { $in: levelIds }, schoolId })
      .select('_id className levelId section')
      .lean();

    // 3. Group classes under their levels
    const response = levels.map((level) => ({
      levelId: level._id,
      levelName: level.levelName,
      classes: classes.filter((cls) => String(cls.levelId) === String(level._id)),
    }));

    return response;
  }



export const LevelService = {
  createLevel,
  getAllLevels,
  updateLevel,
  deleteLevel,
  getLevelsWithClassesOfSchool
};
