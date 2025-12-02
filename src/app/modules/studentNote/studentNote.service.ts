import { StudentNote } from './studentNote.model';
import { IStudentNote } from './studentNote.interface';
import mongoose from 'mongoose';

// ADD NOTE
const addNote = async (payload: any) => {
  const result = await StudentNote.create(payload);
  return result;
};

// GET NOTES BY STUDENT ID
const getNotesByStudentId = async (studentId: string) => {
  const notes = await StudentNote.find({
    studentId: new mongoose.Types.ObjectId(studentId),
  })
    .populate({
      path: 'studentId',
      select: 'userId schoolName className section',
      populate: { path: 'userId', select: 'name' },
    })
    .populate('noteBy', 'name') // teacher info
    .sort({ createdAt: -1 });

  return notes;
};

// GET ALL NOTES BY CLASS + SECTION
const getAllNotesByClassIdAndSection = async (
  classId: string,
  section: string
) => {
  const notes = await StudentNote.find({
    classId: new mongoose.Types.ObjectId(classId),
    section: section,
  })
    .populate({
      path: 'studentId',
      select: 'userId schoolName className section',
      populate: { path: 'userId', select: 'name' },
    })
    .populate('noteBy', 'name')
    .sort({ createdAt: -1 });

  return notes;
};

// GET ALL NOTES BY School
const getAllNotesBySchool = async (
  schoolId: string
) => {
  const notes = await StudentNote.find({
    schoolId: new mongoose.Types.ObjectId(schoolId),
  })
    .populate({
      path: 'studentId',
      select: 'userId schoolName className section',
      populate: { path: 'userId', select: 'name' },
    })
    .populate('noteBy', 'name')
    .sort({ createdAt: -1 });

  return notes;
};

export const StudentNoteService = {
  addNote,
  getNotesByStudentId,
  getAllNotesByClassIdAndSection,
  getAllNotesBySchool
};
