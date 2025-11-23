import { StudentReport } from './studentReport.model';
import { IStudentReport } from './studentReport.interface';
import mongoose from 'mongoose';

// ==========================
// ADD REPORT
// ==========================
const addReport = async (payload: IStudentReport) => {
  console.log({payload})
  const result = await StudentReport.create(payload);

  return result;
};

// ==========================
// GET REPORTS BY STUDENT ID
// ==========================
const getReportsByStudentId = async (studentId: string) => {
  const reports = await StudentReport.find({ studentId: new mongoose.Types.ObjectId(studentId) })
    .populate({
      path: 'studentId',
      select: 'userId schoolName className section',
      populate: { path: 'userId', select: 'name' }, // fetch student name
    })
    .populate('reportId', 'name') // teacher info
    .sort({ createdAt: -1 });

  return reports;
};

// ==============================================
// GET ALL REPORTS BY CLASS ID AND SECTION
// ==============================================
const getAllReportsByClassIdAndSection = async (classId: string, section: string) => {
  const reports = await StudentReport.find({
    classId: new mongoose.Types.ObjectId(classId),
    section: section,
  })
    .populate({
      path: 'studentId',
      select: 'userId schoolName className section',
      populate: { path: 'userId', select: 'name' }, // fetch student name
    })
    .populate('reportId', 'name') // teacher info
    .sort({ createdAt: -1 });

  return reports;
};

// ==============================================
// GET ALL REPORTS BY SCHOOL 
// ==============================================
const getAllReportsBySchool = async (schoolId: string) => {

  const reports = await StudentReport.find({
    schoolId: new mongoose.Types.ObjectId(schoolId),
  })
    .populate({
      path: 'studentId',
      select: 'userId schoolName className section',
      populate: { path: 'userId', select: 'name' }, // fetch student name
    })
    .populate('reportId', 'name') // teacher info
    .sort({ createdAt: -1 });

  return reports;
};



export const StudentReportService = {
  addReport,
  getReportsByStudentId,
  getAllReportsByClassIdAndSection,
  getAllReportsBySchool
};
