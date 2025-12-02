import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TAuthUser } from '../../interface/authUser';
import { StudentNoteService } from './studentNote.service';
import AppError from '../../utils/AppError';
import Student from '../student/student.model';

// ==========================
// ADD NOTE
// ==========================
const addNote = catchAsync(async (req, res) => {
  const { studentId, classId, section, text } = req.body;

  console.log("req.body", req.body);

  if (!studentId || !classId || !section || !text) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'StudentId, ClassId, Section, and Text are required'
    );
  }

  const isExistsStudent = await Student.findById(studentId);
  if (!isExistsStudent) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Student does not exist');
  }

  // Create payload
  const payload = {
    schoolId: isExistsStudent.schoolId,
    studentId,
    classId,
    section,
    text,
    noteBy: (req.user as TAuthUser).userId, // teacher id
  };

  const result = await StudentNoteService.addNote(payload);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Student note added successfully',
    data: result,
  });
});

// ==========================
// GET NOTES BY STUDENT ID
// ==========================
const getNotesByStudentId = catchAsync(async (req, res) => {
  const { studentId } = req.params;

  if (!studentId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'studentId is required');
  }

  const result = await StudentNoteService.getNotesByStudentId(studentId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Student notes fetched successfully',
    data: result,
  });
});

// ==============================================
// GET ALL NOTES BY CLASS ID AND SECTION
// ==============================================
const getAllNotesByClassIdAndSection = catchAsync(async (req, res) => {
  const { classId, section } = req.query;

  if (!classId || !section) {
    throw new AppError(httpStatus.BAD_REQUEST, 'classId and section are required');
  }

  const result = await StudentNoteService.getAllNotesByClassIdAndSection(
    classId as string,
    section as string
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'All student notes fetched successfully',
    data: result,
  });
});

// ==============================================
// GET ALL NOTES BY CLASS ID AND SECTION
// ==============================================
const getAllNotesBySchool = catchAsync(async (req, res) => {
  const { schoolId } = req.params;

  if (!schoolId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'schoolId are required');
  }

  const result = await StudentNoteService.getAllNotesBySchool(
    schoolId as string
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'All student notes of specific school fetched successfully',
    data: result,
  });
});

export const StudentNoteController = {
  addNote,
  getNotesByStudentId,
  getAllNotesByClassIdAndSection,
  getAllNotesBySchool
};
