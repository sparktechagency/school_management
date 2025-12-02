import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ClassPeriodService } from "./classPeriod.service";

const createClassPeriod = catchAsync(async (req, res) => {
  const result = await ClassPeriodService.createClassPeriod(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Class period created successfully",
    data: result,
  });
});


const addSinglePeriod = catchAsync(async (req, res) => {
  const { classId, section, period } = req.body;

  const result = await ClassPeriodService.addSinglePeriod(
    classId,
    section,
    period
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Period added successfully",
    data: result,
  });
});

const getClassPeriod = catchAsync(async (req, res) => {
    
  const { classId, section } = req.query;

  const result = await ClassPeriodService.getClassPeriod(classId as string, section as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Class period retrieved successfully",
    data: result,
  });
});

const updateClassPeriod = catchAsync(async (req, res) => {
  const { classId, section } = req.params;
  const { periods } = req.body;

  const result = await ClassPeriodService.updateClassPeriod(
    classId,
    section,
    periods
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Class period updated successfully",
    data: result,
  });
});

const deleteClassPeriod = catchAsync(async (req, res) => {
  const { classId, section } = req.params;

  const result = await ClassPeriodService.deleteClassPeriod(classId, section);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Class period deleted successfully",
    data: result,
  });
});

export const ClassPeriodController = {
  createClassPeriod,
  getClassPeriod,
  updateClassPeriod,
  deleteClassPeriod,
  addSinglePeriod
};
