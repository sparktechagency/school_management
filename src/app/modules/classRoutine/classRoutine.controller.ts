import httpStatus from "http-status";
import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import { ClassRoutineService } from "./classRoutine.service";
import sendResponse from "../../utils/sendResponse";
import { Request, Response } from "express";

const getRoutineByClassAndSection = catchAsync(async (req: Request, res: Response) => {

    const {classId,section} = req.query;

    if(!classId || !section){
        throw new AppError(httpStatus.BAD_REQUEST, 'classId and section are required');
    }
    const routine = await ClassRoutineService.getRoutineByClassAndSection(
        classId,
        section
    );



    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Routine fetched successfully',
        data: routine,
    });
})


// Add period to all days
export const addPeriodToClassRoutine = catchAsync(async (req: Request, res: Response) => {
  const { classId, section, periodData } = req.body;

  if (!classId || !section || !periodData) {
    throw new AppError(httpStatus.BAD_REQUEST, "classId, section, and periodData are required");
  }

  const routine = await ClassRoutineService.addPeriodToClassRoutine(classId, section, periodData);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Period added successfully to all days`,
    data: routine,
  });
});

// Update period in all days
export const updatePeriodToClassRoutine = catchAsync(async (req: Request, res: Response) => {
  const { classId, section, periodNumber, updateData } = req.body;

  if (!classId || !section || periodNumber === undefined || !updateData) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "classId, section, periodNumber, and updateData are required"
    );
  }

  const routine = await ClassRoutineService.updatePeriodInClassRoutine(
    classId,
    section,
    Number(periodNumber),
    updateData
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Period ${periodNumber} updated successfully in all days`,
    data: routine,
  });


  
});


const removePeriodFromClassRoutine = catchAsync(async (req: Request, res: Response) => {
  const { classId, section, periodNumber } = req.body;

  if (!classId || !section || periodNumber === undefined) {
    throw new AppError(httpStatus.BAD_REQUEST, "classId, section, and periodNumber are required");
  }

  const result = await ClassRoutineService.removePeriodFromClassRoutine(
    classId,
    section,
    periodNumber
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Period ${periodNumber} removed successfully from class ${section}`,
    data: result,
  });
});


const addOrUpdateSubjectInRoutine = catchAsync(async (req, res) => {

    const {schoolId} = req.user
    req.body.schoolId = schoolId

    const payload = req.body;

    const result = await ClassRoutineService.addOrUpdateSubjectInRoutine(payload);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Subject updated in routine successfully",
      data: result,
    });
  }
);

const getUniqueSubjectsOfClassRoutine = catchAsync(

  async (req, res) => {

    const {schoolId} = req.user;
    console.log({schoolId});
    const { classId, section } = req.query;

     if (!schoolId || !classId || !section) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "schoolId, classId and section are required"
      );
    }


    const result = await ClassRoutineService.getUniqueSubjectsOfClassRoutine(schoolId as string, classId as string, section as string);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Unique subjects fetched successfully",
      data: result,
    });
  }
);


const getTodayUpcomingClasses = catchAsync(async (req: Request, res: Response) => {

      const result = await ClassRoutineService.getTodayUpcomingClasses(
        req.user,     // authenticated user
        req.query     // today + nowTime
      );

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Today's upcoming classes fetched successfully",
        data: result,
      });
    }
  );



  const addOrUpdateManySubjectsInRoutine = catchAsync(
  async (req: Request, res: Response) => {
    // Destructure the body
    const {
      schoolId,
      classId,
      className,
      section,
      periods = [],
      routine = [],
      addedStudents = [],
      superVisor = null
    } = req.body;

    if (!schoolId || !classId || !section) {
      return sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: "schoolId, classId, and section are required",
      });
    }

    const payload = {
      schoolId,
      classId,
      className,
      section,
      periods,
      routine,
      addedStudents,
      superVisor,
    };

    const updatedRoutine = await ClassRoutineService.addOrUpdateManySubjectsInRoutine(payload);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Class routine updated successfully",
      data: updatedRoutine,
    });
  }
);





export const ClassRoutineController = {
    getRoutineByClassAndSection,
    addPeriodToClassRoutine,
    updatePeriodToClassRoutine,
    removePeriodFromClassRoutine,
    addOrUpdateSubjectInRoutine,
    getUniqueSubjectsOfClassRoutine,
    getTodayUpcomingClasses,
    addOrUpdateManySubjectsInRoutine
}