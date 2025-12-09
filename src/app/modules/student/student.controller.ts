import httpStatus from 'http-status';
import { TAuthUser } from '../../interface/authUser';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { MulterFile } from '../user/user.controller';
import { StudentService } from './student.service';
import AppError from '../../utils/AppError';
import { Request, Response } from 'express';

const createStudent = catchAsync(async (req, res) => {
  const result = await StudentService.createStudent(
    req.body,
    req.user as TAuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Student created successfully',
    data: result,
  });
});

const getAllStudents = catchAsync(async (req, res) => {
  const result = await StudentService.getAllStudents(
    req.user as TAuthUser,
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Students fetched successfully',
    data: result,
  });
});



const getAllStudentsListOfSpecificClassIdAndSection = catchAsync(async (req, res) => {
  const { classId, section } = req.query;

  // Validate query params
  if (!classId || !section) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Missing required query parameter(s): classId and section are required'
    );
  }

  const result = await StudentService.getAllStudentsListOfSpecificClassIdAndSection(classId as string, section as string) as any;

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `All students from class: ${result?.className} and section: "${section}" fetched successfully`,
    data: result,
  });
});

const getMyChildren = catchAsync(async (req, res) => {
  const result = await StudentService.getMyChildren(req.user as TAuthUser);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Students fetched successfully',
    data: result,
  });
});

const selectChild = catchAsync(async (req, res) => {
  const result = await StudentService.selectChild(req.params.userId);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Students fetched successfully',
    data: result,
  });
});

const editStudent = catchAsync(async (req, res) => {
  const result = await StudentService.editStudent(
    req.params.studentId,
    req.body,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Students fetched successfully',
    data: result,
  });
});

const deleteStudent = catchAsync(async (req, res) => {
  const result = await StudentService.deleteStudent(req.params.studentId);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Students fetched successfully',
    data: result,
  });
});

const getParentsList = catchAsync(async (req, res) => {
  const result = await StudentService.getParentsList(
    req.user as TAuthUser,
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Students fetched successfully',
    data: result,
  });
});

const getParentsDetails = catchAsync(async (req, res) => {
  const result = await StudentService.getParentsDetails(
    req.params.parentUserId,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Students fetched successfully',
    data: result,
  });
});

const createStudentUsingXlsx = catchAsync(async (req, res) => {
  const result = await StudentService.createStudentWithXlsx(
    req.file as MulterFile,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Students created successfully using xlsx',
    data: result,
  });
});


// ==========================
// TERMINATE STUDENT BY TEACHER
// ==========================
const terminateStudentByTeacher = catchAsync(async (req, res) => {
  const { studentId, terminatedDays } = req.body;

  if (!studentId || !terminatedDays) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'studentId and terminatedDays are required'
    );
  }

  const payload = {
    studentId,
    terminatedDays,
    terminateBy: (req.user as TAuthUser).userId, // teacher id
  };

  const result = await StudentService.terminateStudentByTeacher(req.user, payload);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Student has been terminated for ${terminatedDays} day(s) successfully`,
    data: result,
  });

});


// ==========================
// REMOVE TERMINATION
// ==========================
const removeTermination = catchAsync(async (req, res) => {
  const { studentId } = req.params;

  if (!studentId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'studentId is required');
  }

  // removedBy will be the current user (teacher/admin)
  const removedBy = (req.user as TAuthUser).userId;

  const result = await StudentService.removeTermination({
    studentId,
    removedBy,
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Student termination removed successfully',
    data: result,
  });
});

// ==========================
// SUMMON STUDENT
// ==========================
const summonStudent = catchAsync(async (req, res) => {
  const { studentId } = req.body;

  if (!studentId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'studentId is required');
  }

  const payload = {
    studentId,
    summonedBy: (req.user as TAuthUser).userId, // teacher/admin performing the action
  };

  const result = await StudentService.summonStudent(req.user,payload);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Student has been summoned successfully',
    data: result,
  });
});


const removeSummoned = catchAsync(async (req, res) => {
  const { studentId } = req.params;

  if (!studentId) {
    throw new AppError(httpStatus.BAD_REQUEST, "studentId is required");
  }

  // removedBy = logged-in teacher/admin
  const removedBy = (req.user as TAuthUser).userId;

  const result = await StudentService.removeSummoned({
    studentId,
    removedBy,
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Student summon removed successfully",
    data: result,
  });
});

const getTerminatedStudentsBySchool = catchAsync(async (req: Request, res: Response) => {
    
    const { schoolId } = req.user;

    if (!schoolId || typeof schoolId !== 'string') {
      return sendResponse(res, {
        statusCode: 400,
        success: false,
        message: 'schoolId is required and must be a string',
      });
    }

    const terminatedStudents = await StudentService.getAllTerminatedStudentsBySchool(schoolId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Terminated students retrieved successfully',
      data: terminatedStudents,
    });
  }
);

const getAllSummonedStudentBySchool = catchAsync(async (req: Request, res: Response) => {
    
    const { schoolId } = req.user;

    if (!schoolId || typeof schoolId !== 'string') {
      return sendResponse(res, {
        statusCode: 400,
        success: false,
        message: 'schoolId is required and must be a string',
      });
    }

    const terminatedStudents = await StudentService.getAllSummonedStudentBySchool(schoolId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Summoned students retrieved successfully',
      data: terminatedStudents,
    });
  }
);



const getSpecificStudentReport = catchAsync(async (req: Request, res: Response) => {
  const { studentId } = req.params;
  const result = await StudentService.getSpecificStudentReport(studentId);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Students fetched successfully',
    data: result,
  });
})

export const StudentController = {
  createStudent,
  getMyChildren,
  selectChild,
  getAllStudents,
  editStudent,
  deleteStudent,
  getParentsList,
  getParentsDetails,
  createStudentUsingXlsx,
  getAllStudentsListOfSpecificClassIdAndSection,
  terminateStudentByTeacher,
  removeTermination,
  summonStudent,
  getTerminatedStudentsBySchool,
  getAllSummonedStudentBySchool,
  getSpecificStudentReport,
  removeSummoned
};
