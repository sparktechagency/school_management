/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { USER_ROLE } from '../../constant';
import { TAuthUser } from '../../interface/authUser';
import QueryBuilder from '../../QueryBuilder/queryBuilder';
import { getSchoolIdFromUser } from '../../utils/getSchoolIdForManager';
import School from '../school/school.model';
import { TeacherService } from '../teacher/teacher.service';
import { TSubject } from './subject.interface';
import Subject from './subject.model';
import Teacher from '../teacher/teacher.model';
import { get } from 'http';

const createSubject = async (payload: Partial<TSubject>, user: TAuthUser) => {
  const schoolId = getSchoolIdFromUser(user);

  const result = await Subject.create({ ...payload, schoolId });
  return result;
};

const getSubject = async (user: TAuthUser, query: Record<string, unknown>) => {
  let schoolId = user.schoolId;

  if (user.role === USER_ROLE.teacher) {
    const findTeacher = await TeacherService.findTeacher(user);
    schoolId = findTeacher?.schoolId as any;
  } else if (user.role === USER_ROLE.manager) {
    schoolId = getSchoolIdFromUser(user);
  } else if (user.role === USER_ROLE.supperAdmin) {
    const findSchool = await School.findOne({
      _id: query.schoolId,
    });

    schoolId = findSchool?._id as any;
  }

  const subjectQuery = new QueryBuilder(
    Subject.find({
      schoolId: schoolId,
    }),
    query,
  );
  const result = await subjectQuery.sort().paginate().search(['subjectName'])
    .queryModel;

  const meta = await subjectQuery.countTotal();
  return { meta, result };
};

const updateSubject = async (
  payload: Partial<TSubject> & { subjectId: string },
  user: TAuthUser,
) => {
  const result = await Subject.findOneAndUpdate(
    { _id: payload.subjectId, schoolId: user.schoolId },
    payload,
    { new: true },
  );
  return result;
};

const deleteSubject = async (id: string, user: TAuthUser) => {
  const result = await Subject.findOneAndDelete({
    _id: id,
    schoolId: user.schoolId,
  });
  return result;
};


const getSubjectsWithTeachersOfSchool = async (schoolId: string) => {
  const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

  // 1. Get all subjects of the school
  const subjects = await Subject.find({ schoolId: schoolObjectId })
    .select('schoolId subjectName')
    .populate('schoolId', 'schoolName')
    .lean();

  if (!subjects.length) return [];

  const subjectIds = subjects.map(sub => sub._id);

  // 2. Get all teachers related to these subjects in ONE query
  const teachers = await Teacher.find({
    schoolId: schoolObjectId,
    subjectId: { $in: subjectIds },
  })
    .select('userId subjectId subjectName')
    .populate('userId', 'name phoneNumber image role')
    .lean();

  // 3. Group teachers by subjectId efficiently
  const teacherMap = new Map<string, any[]>();

  for (const t of teachers) {
    const key = t.subjectId.toString();
    if (!teacherMap.has(key)) teacherMap.set(key, []);
    teacherMap.get(key)?.push(t);
  }

  // 4. Merge subjects with teacher list
  return subjects.map(sub => ({
    subjectId: sub._id,
    subjectName: sub.subjectName,
    schoolId: (sub.schoolId as any)?._id,
    schoolName: (sub.schoolId as any)?.schoolName,
    teachers: teacherMap.get(sub._id.toString()) || [],
  }));
};

export const SubjectService = {
  createSubject,
  getSubject,
  updateSubject,
  deleteSubject,
  getSubjectsWithTeachersOfSchool
};
