import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ClassSectionSupervisorService } from "./classSectionSupervisor.service";

const addOrUpdateSupervisor = catchAsync(async (req, res) => {

  const result = await ClassSectionSupervisorService.addOrUpdateSupervisor(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Supervisor added/updated successfully",
    data: result,
  });

});

const addMultipleSupervisors = catchAsync(async (req, res) => {

  const result = await ClassSectionSupervisorService.addMultipleSupervisors(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Supervisor added/updated successfully",
    data: result,
  });

})

const deleteManySupervisors = catchAsync(async (req, res) => {

  const result = await ClassSectionSupervisorService.removeManySupervisors(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Supervisor deleted successfully",
    data: result,
  });

});

const getMySupervisorsClasses = catchAsync(async (req, res) => {

    console.log(req.user)
  const result = await ClassSectionSupervisorService.getMySupervisorsClasses(
    req.user.teacherId // teacherId from auth middleware
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Supervisor classes fetched successfully",
    data: result,
  });

});

export const ClassSectionSupervisorController = {
  addOrUpdateSupervisor,
  addMultipleSupervisors,
  getMySupervisorsClasses,
  deleteManySupervisors
};