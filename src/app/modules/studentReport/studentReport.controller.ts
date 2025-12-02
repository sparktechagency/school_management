import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TAuthUser } from '../../interface/authUser';
import { StudentReportService } from './studentReport.service';
import AppError from '../../utils/AppError';
import { MulterFiles } from '../user/user.controller';
import School from '../school/school.model';
import { isExists } from 'date-fns';
import Student from '../student/student.model';

// ==========================
// ADD REPORT
// ==========================
const addReport = catchAsync(async (req, res) => {


    if (req.file) {
    req.body.image = req.file.path;
  }


    const { studentId, classId, section, text } = req.body;

  if ( !studentId || !classId || !section || !text) {
    throw new AppError(httpStatus.BAD_REQUEST, ' StudentId, ClassId, Section and Text are required');
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
    reportId: req.user.userId, // teacher id
    image: req.body.image || '',
  };

  const result = await StudentReportService.addReport(payload as any);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Report added successfully',
    data: result,
  });
});

// ==========================
// GET REPORTS BY STUDENT ID
// ==========================
const getReportsByStudentId = catchAsync(async (req, res) => {
  const { studentId } = req.params;

  if (!studentId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'studentId is required');
  }

  const result = await StudentReportService.getReportsByStudentId(studentId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Reports fetched successfully',
    data: result,
  });
});

// ==============================================
// GET ALL REPORTS BY CLASS ID AND SECTION
// ==============================================
const getAllReportsByClassIdAndSection = catchAsync(async (req, res) => {
  
  const { classId, section } = req.query;

   if (!classId || !section) {
    throw new AppError(httpStatus.BAD_REQUEST, 'classId and section are required');
  }

  const result = await StudentReportService.getAllReportsByClassIdAndSection(classId as string, section as string);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Reports fetched successfully',
    data: result,
  });

});

// ==============================================
// GET ALL REPORTS BY SCHOOL
// ==============================================
const getAllReportsBySchool = catchAsync(async (req, res) => {
  
  const { schoolId } = req.params;

   if (!schoolId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'schoolId are required');
  }

  const result = await StudentReportService.getAllReportsBySchool(schoolId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Reports of school fetched successfully',
    data: result,
  });

});

export const StudentReportController = {
  addReport,
  getReportsByStudentId,
  getAllReportsByClassIdAndSection,
  getAllReportsBySchool
};
