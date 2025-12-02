import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AttendancePeriodService } from "./attendancePeriod.service";
import dayjs from "dayjs";


const createTodayPeriodAttendance = catchAsync(
  async (req, res) => {
    const { schoolId } = req.params;

    const result = await AttendancePeriodService.createTodayPeriodAttendance(
      schoolId as string
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Today’s period attendance created successfully",
      data: result,
    });
  }
);


const getAttendanceStatsBySchool = catchAsync(async (req, res) => {
  const { schoolId } = req.params;

  if (!schoolId) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: "schoolId is required",
    });
  }

  const result = await AttendancePeriodService.getAttendanceStatsBySchool(
    schoolId as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attendance stats of school fetched successfully",
    data: result,
  });
});


const getTodayPendingAttendance = catchAsync(
  async (req, res) => {
    const { schoolId } = req.params;

    if (!schoolId) {
      return sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: "schoolId is required",
      });
    }

    const result =
      await AttendancePeriodService.getTodayPendingAttendance(
        schoolId as string
      );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Today's pending attendance fetched successfully",
      data: result,
    });
  }
);


const getAttendanceHistoryBySchool = catchAsync(async (req, res) => {
  const { schoolId } = req.params;
  let { date } = req.query; // date might be undefined

  // ✅ If date not provided, assign today
  if (!date) {
    date = dayjs().format("YYYY-MM-DD");
  }

  const result = await AttendancePeriodService.getAttendanceHistoryBySchool(
    schoolId as string,
    date as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attendance history fetched successfully",
    data: result, // can contain { date, records } from service
  });
});


export const AttendancePeriodController = {
  createTodayPeriodAttendance,
  getAttendanceStatsBySchool,
  getTodayPendingAttendance,
  getAttendanceHistoryBySchool
};