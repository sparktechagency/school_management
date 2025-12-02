import { TAuthUser } from '../../interface/authUser';
import catchAsync from '../../utils/catchAsync';
import { TeacherService } from './teacher.service';

const createTeacher = catchAsync(async (req, res) => {
  const result = await TeacherService.createTeacher(
    req.body,
    req.user as TAuthUser,
  );
  res.status(201).json({
    success: true,
    statusCode: 201,
    message: 'Teacher created successfully',
    data: result,
  });
});

const getBaseOnStudent = catchAsync(async (req, res) => {
  const result = await TeacherService.getBaseOnStudent(req.user as TAuthUser);
  res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'Teacher fetched successfully',
    data: result,
  });
});

const getTeacherList = catchAsync(async (req, res) => {
  const result = await TeacherService.getTeacherList(
    req.user as TAuthUser,
    req.query,
  );
  res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'Teacher fetched successfully',
    data: result,
  });
});

const getAllTeachersOfSchool = catchAsync(async (req, res) => {
  const result = await TeacherService.getAllTeachersOfSchool(req.params.schoolId);
  res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'Teacher all fetched successfully',
    data: result,
  });
});



const getTeachersBySpecificClassAndSection = catchAsync(async (req, res) => {
  
  const {studentId} = req.user;

  console.log({studentId})

  const result = await TeacherService.getTeachersBySpecificClassAndSection(studentId);

  res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'get all teachers of specific class and section fetched successfully',
    data: result,
  });
  
})

const editTeacher = catchAsync(async (req, res) => {
  const result = await TeacherService.editTeacher(
    req.params.teacherUserId,
    req.body,
  );
  res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'Teacher updated successfully',
    data: result,
  });
});

const deleteTeacher = catchAsync(async (req, res) => {
  const result = await TeacherService.deleteTeacher(req.params.teacherUserId);
  res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'Teacher deleted successfully',
    data: result,
  });
});

export const TeacherController = {
  createTeacher,
  getBaseOnStudent,
  getTeacherList,
  getAllTeachersOfSchool,
  editTeacher,
  deleteTeacher,
  getTeachersBySpecificClassAndSection
};
