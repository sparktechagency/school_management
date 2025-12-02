import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AssignedSubjectTeacherService } from "./assignedSubjectTeacher.service";
import mongoose from "mongoose";


const assignSubjectTeacher = catchAsync(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await AssignedSubjectTeacherService.assignTeacherToSubject(
      req.body,
      session
    );

    await session.commitTransaction();
    session.endSession();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Teacher assigned successfully",
      data: result,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});


export const AssignedSubjectTeacherController = {
    assignSubjectTeacher
}