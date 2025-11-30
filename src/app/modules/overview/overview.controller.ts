import { TAuthUser } from '../../interface/authUser';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { OverviewService } from './overview.service';

const OverviewController = {
  getTeacherHomePageOverview: catchAsync(async (req, res) => {

    const result = await OverviewService.getTeacherHomePageOverview(
      req.user as TAuthUser,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Teacher home page overview retrieved successfully',
      data: result,
    });

  }),

  getDailyWeeklyMonthlyAttendanceRate: catchAsync(async (req, res) => {
    const result = await OverviewService.getDailyWeeklyMonthlyAttendanceRate(
      req.user as TAuthUser,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Attendance rate retrieved successfully',
      data: result,
    });
  }),

  getAssignmentCount: catchAsync(async (req, res) => {
    
    const result = await OverviewService.getAssignmentCount(
      req.user as TAuthUser,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Assignment count retrieved successfully',
      data: result,
    });

  }),

  getStudentAttendance: catchAsync(async (req, res) => {
    const result = await OverviewService.getStudentAttendance(
      req.user as TAuthUser,
      req.query,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Student attendance retrieved successfully',
      data: result,
    });
  }),

  getStudentHomePageOverview: catchAsync(async (req, res) => {
    const result = await OverviewService.getStudentHomePageOverview(
      req.user as TAuthUser,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Student home page overview retrieved successfully',
      data: result,
    });
  }),

  getParentHomePageOverview: catchAsync(async (req, res) => {
    const result = await OverviewService.getParentHomePageOverview(
      req.user as TAuthUser,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Parent home page overview retrieved successfully',
      data: result,
    });
  }),

  getAdminHomePageOverview: catchAsync(async (req, res) => {
    const result = await OverviewService.getAdminHomePageOverview(
      req.user as TAuthUser,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Admin home page overview retrieved successfully',
      data: result,
    });
  }),

  getDailyWeeklyMonthlyAttendanceRateOfSpecificClassIdAndSection: catchAsync(async (req, res) => {

    const {classId, section} = req.query;

    const result = await OverviewService.getDailyWeeklyMonthlyAttendanceRateOfSpecificClassIdAndSection(
      classId as string, section as string
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Attendance overview (daily, weekly, monthly) of specific class and section retrieved successfully',
      data: result,
    });
  }),

  getDailyWeeklyMonthlyAttendanceRateOfSchool: catchAsync(async (req, res) => {

    console.log(req.user);
    const {mySchoolId} = req.user;

    const result = await OverviewService.getDailyWeeklyMonthlyAttendanceRateOfSchool(
      mySchoolId as string
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Attendance overview (daily, weekly, monthly) of specific school retrieved successfully',
      data: result,
    });
  }),

   getHomePageOnlyOverviewOfAdminWithinApp: catchAsync(async (req, res) => {
    const { schoolId } = req.user; // assuming school user is logged in

    const result =
      await OverviewService.getHomePageOnlyOverviewOfAdminWithinApp(
        schoolId as string
      );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Admin home dashboard overview retrieved successfully.',
      data: result,
    });
  }),


};

export default OverviewController;
