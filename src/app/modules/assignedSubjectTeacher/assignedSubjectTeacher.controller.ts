import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AssignedSubjectTeacherService } from "./assignedSubjectTeacher.service";


const assignSubjectTeacher = catchAsync(async (req, res) => {

    const result = await AssignedSubjectTeacherService.assignTeacherToSubject(
        req.body
    );

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Teacher assigned successfully',
        data: result,
    });
    
});


export const AssignedSubjectTeacherController = {
    assignSubjectTeacher
}