/* eslint-disable @typescript-eslint/no-explicit-any */
import { Secret } from 'jsonwebtoken';
import mongoose, { mongo } from 'mongoose';
import config from '../../../config';
import { USER_ROLE } from '../../constant';
import { TAuthUser } from '../../interface/authUser';
import AggregationQueryBuilder from '../../QueryBuilder/aggregationBuilder';
import generateToken from '../../utils/generateToken';
import generateUID from '../../utils/generateUID';
import { transactionWrapper } from '../../utils/transactionWrapper';
import Parents from '../parents/parents.model';
import School from '../school/school.model';
import { MulterFile } from '../user/user.controller';
import User from '../user/user.model';
import { RemoveTerminationPayload, StudentRow, SummonStudentPayload, TerminateStudentPayload, TStudent } from './student.interface';
import Student from './student.model';
import {
  createStudentWithProfile,
  handleParentUserCreation,
  parseStudentXlsxData,
} from './students.helper';
import AppError from '../../utils/AppError';
import httpStatus from 'http-status';
import dayjs from 'dayjs';
import Attendance from '../attendance/attendance.model';
import { StudentNote } from '../studentNote/studentNote.model';
import { StudentReport } from '../studentReport/studentReport.model';
import { NOTIFICATION_TYPE } from '../notification/notification.interface';
import sendNotification from '../../../socket/sendNotification';

const createStudent = async (
  payload: Partial<TStudent> & { phoneNumber: string; name?: string },
  user: TAuthUser | { role: string; schoolId: string },
  mongoSession?: any
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (user.role === USER_ROLE.school) {
      const findSchool = await School.findById(user.schoolId);
      if (!findSchool) throw new Error('School not found');
      payload.schoolId = user.schoolId as any;
      payload.schoolName = findSchool?.schoolName;
    }

    const generateData = {
      className: payload?.className,
      section: payload?.section,
    } as any;
    // Pre-generate all UIDs that might be needed
    const studentUID = await generateUID(generateData);

    const student = (await createStudentWithProfile(
      {
        phoneNumber: payload.phoneNumber,
        data: payload,
        uid: studentUID,
      },
      session,
    )) as any;

    await handleParentUserCreation(
      payload,
      student,
      session,
      // { fatherUID, motherUID } // Pass pre-generated UIDs
    );

    await session.commitTransaction();
    session.endSession();
    return student;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const findStudent = async (id: string) => {
  console.log(id, '======> id in student service');
  const student = await Student.findById(id);
  if (!student) throw new Error('Student not found');
  return student;
};

const getMyChildren = async (user: TAuthUser) => {
  const result = await Parents.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(String(user.userId)),
      },
    },

    {
      $lookup: {
        from: 'students',
        localField: 'childId',
        foreignField: '_id',
        as: 'student',
      },
    },

    {
      $unwind: {
        path: '$student',
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $lookup: {
        from: 'users',
        localField: 'student.userId',
        foreignField: '_id',
        as: 'children',
      },
    },

    {
      $unwind: {
        path: '$children',
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        children: {
          _id: '$children._id',
          uid: '$children.uid',
          name: '$children.name',
          role: '$children.role',
          status: '$children.status',
          isDeleted: '$children.isDeleted',
          createdAt: '$children.createdAt',
          updatedAt: '$children.updatedAt',
          phoneNumber: '$children.phoneNumber',
          image: '$children.image',
          studentId: '$student._id',
          parentsMessage: '$student.parentsMessage',
          section: '$student.section',
          className: '$student.className',
          schoolName: '$student.schoolName',
        },
      },
    },
  ]);
  return result;
};

const selectChild = async (id: string) => {
  const findUser = await User.findById(id);

  if (!findUser) {
    throw new Error('User not found');
  }

  const student = await Student.findOne(findUser.studentId);
  const school = await School.findById(student?.schoolId);

  const userData = {
    userId: findUser._id,
    studentId: findUser.studentId,
    parentsId: findUser.parentsId,
    schoolId: findUser.schoolId,
    teacherId: findUser.teacherId,
    phoneNumber: findUser.phoneNumber,
    role: findUser.role,
    name: findUser.name,
    image: findUser.image,
    mySchoolUserId: school?.userId,
    mySchoolId: school?._id,
  };

  const tokenGenerate = generateToken(
    userData,
    config.jwt.access_token as Secret,
    config.jwt.access_expires_in as string,
  );

  const refreshToken = generateToken(
    userData,
    config.jwt.refresh_token as Secret,
    config.jwt.refresh_expires_in as string,
  );

  return {
    accessToken: tokenGenerate,
    refreshToken,
    user: findUser,
    mySchoolUserId: school?.userId,
  };
};

const getAllStudents = async (
  user: TAuthUser,
  query: Record<string, unknown>,
) => {
  const sudentQuery = new AggregationQueryBuilder(query);

  const result = await sudentQuery
    .customPipeline([
      {
        $match: {
          role: USER_ROLE.student,
        },
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          pipeline: [
            {
              $lookup: {
                from: 'schools',
                localField: 'schoolId',
                foreignField: '_id',
                as: 'school',
              },
            },
            {
              $unwind: {
                path: '$school',
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
          foreignField: 'userId',
          as: 'student',
        },
      },
      {
        $unwind: {
          path: '$student',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          student: 1,
          name: 1,
          image: 1,
          status: 1,
          createdAt: 1,
          phoneNumber: 1,
        },
      },
    ])
    .sort()
    .search(['name'])
    .paginate()
    .execute(User);

  const meta = await sudentQuery.countTotal(User);

  return { meta, result };
};


//created this funbtion by me
const getAllStudentsListOfSpecificClassIdAndSection = async (
  classId: string,
  section: string,
) => {
  // Convert classId to ObjectId
  const classObjectId = new mongoose.Types.ObjectId(classId);

  // Query students and populate user info
  const students = await Student.find({
    classId: classObjectId,
    section,
  })
    .select('userId schoolId classId schoolName className section fatherPhoneNumber motherPhoneNumber parentsMessage isTerminated')
    .populate({
      path: 'userId',
      select: 'name email', // select only the fields you need
    })
    .sort({ createdAt: -1 }); // latest students first

  return students;
};

const getAllStudentsListOfSchool = async (
  classId: string,
  section: string,
) => {
  // Convert classId to ObjectId
  const classObjectId = new mongoose.Types.ObjectId(classId);

  // Query students and populate user info
  const students = await Student.find({
    classId: classObjectId,
    section,
  })
    .select('userId schoolId classId schoolName className section fatherPhoneNumber motherPhoneNumber isTerminated')
    .populate({
      path: 'userId',
      select: 'name email', // select only the fields you need
    })
    .sort({ createdAt: -1 }); // latest students first

  return students;

};

const editStudent = async (id: string, payload: any) => {
  const student = await Student.findById(id);
  if (!student) throw new Error('Student not found');

  const sudentData = {
    schoolId: payload.schoolId,
    classId: payload.classId,
    section: payload.section,
    schoolName: payload.schoolName,
    className: payload.className,
    fatherPhoneNumber: payload.fatherPhoneNumber,
    motherPhoneNumber: payload.motherPhoneNumber,
  };
  const studentUserData = {
    phoneNumber: payload.phoneNumber,
    name: payload.name,
  };

  const result = transactionWrapper(async (session) => {
    const updateStudent = await Student.findOneAndUpdate(
      { _id: id },
      sudentData,
      { new: true, session },
    );

    if (!updateStudent) throw new Error('Student not update');

    await User.findOneAndUpdate({ studentId: id }, studentUserData, {
      new: true,
      session,
    });
    return updateStudent;
  });

  return result;
};

const deleteStudent = async (id: string) => {
  const result = transactionWrapper(async (session) => {
    const student = await Student.findByIdAndDelete(id, { session });
    if (!student) throw new Error('Student not found');

    await User.findOneAndDelete({ studentId: id }, { session });

    return student;
  });
  return result;
};

const getParentsList = async (
  user: TAuthUser,
  query: Record<string, unknown>,
) => {
  const parentsListQuery = new AggregationQueryBuilder(query);

  const result = await parentsListQuery
    .customPipeline([
      {
        $match: {
          role: USER_ROLE.parents,
        },
      },
      {
        $lookup: {
          from: 'parents',
          localField: 'parentsId',
          pipeline: [
            {
              $lookup: {
                from: 'students',
                localField: 'childId',
                foreignField: '_id',
                as: 'student',
              },
            },
            {
              $unwind: {
                path: '$student',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: 'student.userId',
                foreignField: '_id',
                as: 'studentUser',
              },
            },
            {
              $unwind: {
                path: '$studentUser',
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
          foreignField: '_id',
          as: 'parents',
        },
      },

      {
        $unwind: {
          path: '$parents',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: 'mysubscriptions',
          localField: '_id',
          foreignField: 'userId',
          as: 'subscription',
        },
      },
      {
        $unwind: {
          path: '$subscription',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'subscriptions',
          localField: 'subscription.subscriptionId',
          foreignField: '_id',
          as: 'subscriptionDetails',
        },
      },
      {
        $unwind: {
          path: '$subscriptionDetails',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 1,
          phoneNumber: 1,
          name: 1,
          role: 1,
          status: 1,
          parents: 1,
          subscriptionDetails: 1,
        },
      },
    ])
    .sort()
    .search(['name'])
    .paginate()
    .execute(User);

  const meta = await parentsListQuery.countTotal(User);

  return { meta, result };
};

const getParentsDetails = async (id: string) => {
  const result = await Parents.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(String(id)),
      },
    },

    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'parentsInfo',
      },
    },
    {
      $unwind: {
        path: '$parentsInfo',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'students',
        localField: 'childId',
        foreignField: '_id',
        as: 'student',
      },
    },

    {
      $unwind: {
        path: '$student',
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $lookup: {
        from: 'users',
        localField: 'student.userId',
        foreignField: '_id',
        as: 'studentUser',
      },
    },
    {
      $unwind: {
        path: '$studentUser',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        studentName: '$studentUser.name',
        studentClass: '$student.className',
        studentSection: '$student.section',
        studentSchoolName: '$student.schoolName',
        parentsInfo: 1,
      },
    },
  ]);

  return result;
};

const createStudentWithXlsx = async (file: MulterFile) => {
  const data = (await parseStudentXlsxData(file)) as StudentRow[];

  const session = await mongoose.startSession();
  session.startTransaction();

  const createdStudents = [];

  for (const payload of data) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const generateData = {
        className: payload.className,
        section: payload.section,
      };

      const studentUID = await generateUID(generateData);

      const student = await createStudentWithProfile(
        {
          phoneNumber: payload.phoneNumber,
          data: payload,
          uid: studentUID,
        },
        session,
      );

      await handleParentUserCreation(payload, student, session);

      await session.commitTransaction();
      session.endSession();

      createdStudents.push(student);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error; // Or continue if you want partial success
    }
  }

  return createdStudents;
};


// ==========================
// TERMINATE STUDENT
// ==========================
const terminateStudentByTeacher = async (user: any, payload: TerminateStudentPayload) => {
  const { studentId, terminateBy, terminatedDays} = payload;

 

  // Validate inputs
  if (!studentId || !terminateBy || !terminatedDays) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'studentId, terminateBy, and terminatedDays are required'
    );
  }

  // Convert to ObjectId
  const studentObjectId = new mongoose.Types.ObjectId(studentId);
  const terminateByObjectId = new mongoose.Types.ObjectId(terminateBy);

  // Find student
  const student = await Student.findById(studentObjectId);
  if (!student) {
    throw new AppError(httpStatus.NOT_FOUND, 'Student not found');
  }

  // Update student termination info
  student.isTerminated = true;
  student.termination = {
    terminatedDays,
    terminateBy: terminateBy as any,
    actionTime: new Date(),
  };

  await student.save();

     
  const notificationData = {
    message: `Your student status has been terminated. Kindly visit the school administration for details.`,
    role: user.role,
    type: NOTIFICATION_TYPE.TERMINATE,
    senderId: user.userId,
    receiverId: student.userId,
    senderName: user?.name || 'Unknown',
  };

  await sendNotification(user as TAuthUser, notificationData);

  return student;
};


// ==========================
// REMOVE TERMINATION
// ==========================
const removeTermination= async (user: any, payload: RemoveTerminationPayload) => {
  const { studentId, removedBy } = payload;

  // Validate input
  if (!studentId || !removedBy) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'studentId and removedBy are required'
    );
  }

  // Convert to ObjectId
  const studentObjectId = new mongoose.Types.ObjectId(studentId);
  const removedByObjectId = new mongoose.Types.ObjectId(removedBy);

  // Find student
  const student = await Student.findById(studentObjectId);
  if (!student) {
    throw new AppError(httpStatus.NOT_FOUND, 'Student not found');
  }

  // Remove termination
  student.isTerminated = false;
  if (student.termination) {
    student.termination.removedBy = removedByObjectId as any;
    student.termination.removedTime = new Date();
  }
  student.termination = null;

  await student.save();

     
  const notificationData = {
    message: `Your termination has been removed. Your enrollment is now active again.`,
    role: user.role,
    type: NOTIFICATION_TYPE.TERMINATE,
    senderId: user.userId,
    receiverId: student.userId,
    senderName: user?.name || 'Unknown',
  };

  await sendNotification(user as TAuthUser, notificationData);

  return student;
};


// ==========================
// SUMMON STUDENT
// ==========================
const summonStudent = async (user: any,payload: SummonStudentPayload) => {

  const { studentId, summonedBy } = payload;

  // Validate inputs
  if (!studentId || !summonedBy) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'studentId and summonedBy are required'
    );
  }

  // Convert studentId to ObjectId
  const studentObjectId = new mongoose.Types.ObjectId(studentId);

  // Find the student
  const student = await Student.findById(studentObjectId);
  if (!student) {
    throw new AppError(httpStatus.NOT_FOUND, 'Student not found');
  }

  const now = new Date();

  // Update summon fields
  student.summoned = true;
  student.lastSummonedAt = now;

  // Increment total summons
  student.totalSummoned = (student.totalSummoned || 0) + 1;

  // Push to summon history
  student.summonedHistory.push({
    summonedBy: new mongoose.Types.ObjectId(summonedBy) as any,
    summonedAt: now,
  });

  // Save updated student
  await student.save();

   
  const notificationData = {
    message: `${user?.name} has summoned you. Please come to the office immediately.`,
    role: user.role,
    type: NOTIFICATION_TYPE.SUMMONED,
    senderId: user.userId,
    receiverId: student.userId,
    senderName: user?.name || 'Unknown',
  };

  await sendNotification(user as TAuthUser, notificationData);

  return student;
};


const removeSummoned = async (payload: RemoveTerminationPayload) => {
  const { studentId, removedBy } = payload;

  // Validate input
  if (!studentId || !removedBy) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "studentId and removedBy are required"
    );
  }

  console.log("removeSummoned",{removedBy});

  const studentObjectId = new mongoose.Types.ObjectId(studentId);
  const removedByObjectId = new mongoose.Types.ObjectId(removedBy);

  console.log({studentObjectId, removedByObjectId});
  // Find student
  const student = await Student.findById(studentObjectId);

  console.log("student", {student});

  if (!student) {
    throw new AppError(httpStatus.NOT_FOUND, "Student not found");
  }

  // If not summoned, no need to remove
  if (!student.summoned) {
    return student;
  }

  // Mark summon removed
  student.summoned = false;

  // Update last summon history
  const history = student.summonedHistory;

  console.log("history  ",{history});

  if (history.length > 0) {
    const lastRecord = history[history.length - 1];
    lastRecord.removedBy = removedByObjectId as any;
    lastRecord.removedTime = new Date();
  }

  await student.save();

  return student;
};


const getAllTerminatedStudentsBySchool = async (schoolId: string) => {
  // Convert schoolId string to ObjectId
  const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

  const terminatedStudents = await Student.find({
      isTerminated: true,
      schoolId: schoolObjectId, // filter by school
    })
    .sort({ 'termination.actionTime': -1 }) // latest terminated first
    .populate('userId', 'name') // populate student name
    .populate('termination.terminateBy', 'name') // populate who terminated
    .lean();

  return terminatedStudents.map((student) => ({
    studentId: student._id,
    studentName: (student.userId as any)?.name || 'N/A',
    terminatedBy: (student.termination?.terminateBy as any)?.name || 'N/A',
    terminatedAt: student.termination?.actionTime || null,
  }));
};
const getAllSummonedStudentBySchool = async (schoolId: string) => {
  // Convert schoolId to ObjectId
  const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

  // Fetch summoned students
  const summonedStudents = await Student.find({
      summoned: true,
      schoolId: schoolObjectId,
    })
    .sort({ lastSummonedAt: -1 }) // latest summoned first
    .populate('userId', 'name') // populate student name
    .populate('summonedHistory.summonedBy', 'name') // populate who summoned
    .lean();

  return summonedStudents.map((student) => {
    // Get last summon record
    const lastHistory =
      student.summonedHistory?.[student.summonedHistory.length - 1];

    return {
      studentId: student._id,
      studentName: (student.userId as any)?.name || 'N/A',
      lastSummonedBy: (lastHistory?.summonedBy as any)?.name || 'N/A',
      lastSummonedAt: student.lastSummonedAt || null,
      totalSummoned: student.totalSummoned || 0,
    };
  });
};


const getSpecificStudentReport = async (studentId: string) => {
  // 1. Find student + populate user info
  const student = await Student.findById(studentId)
    .populate("userId", " uid name image")
    .lean();

  if (!student) throw new Error("Student not found");

    // --- Fetch Student Notes ---
  const notes = await StudentNote.find({
    studentId: new mongoose.Types.ObjectId(studentId),
  })
    .populate("noteBy", "name").select("noteBy text createdAt")
    .sort({ createdAt: -1 })
    .lean()  || [];

  // --- Fetch Student Reports ---
  const reports = await StudentReport.find({
    studentId: new mongoose.Types.ObjectId(studentId),
  })
    .populate("reportId", "name").select("reportId text createdAt")
    .sort({ createdAt: -1 })
    .lean() || [];

  const { classId, section, schoolId } = student;

  // 2. Auto detect current month
  const startOfMonth = dayjs().startOf("month").startOf("day").toDate();
  const endOfMonth = dayjs().endOf("month").endOf("day").toDate();

  // 3. Fetch all attendance records for this month
  const attendanceRecords = await Attendance.find({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    classId: new mongoose.Types.ObjectId(classId),
    section: section,
    date: { $gte: startOfMonth, $lte: endOfMonth },
  })
    .populate("presentStudents.studentId")
    .populate("absentStudents.studentId")
    .lean();

  if (!attendanceRecords.length) {
    return {
      studentUid: (student?.userId as any)?.uid,
      studentId,
      name: student.userId?.name || "",
      image: student.userId?.image || "",
      totalSummoned: student.totalSummoned || 0,
      isTerminated: student.isTerminated || false,
      classId,
      section,
      month: dayjs().format("MMMM YYYY"),
      totalDays: 0,
      totalPresentDays: 0,
      totalAbsentDays: 0,
      dayList: [],
      studentNotes: notes || [],
      studentReports: reports || [],
    };
  }

  // 4. Group attendance by date
  const groupedByDate: Record<string, any[]> = {};

  attendanceRecords.forEach((rec) => {
    const dateKey = dayjs(rec.date).format("YYYY-MM-DD");
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(rec);
  });

  // 5. Build daily report
  const dayList: any[] = [];

  for (const dateKey of Object.keys(groupedByDate)) {
    const dayRecords = groupedByDate[dateKey];

    // Count present periods
    let presentCount = 0;

    dayRecords.forEach((period) => {
      const isPresent = period.presentStudents.some(
        (std: any) => String(std.studentId?._id) === String(studentId)
      );
      if (isPresent) presentCount++;
    });

    // Total periods of the day
    const totalValidPeriods = dayRecords.length;

    // NEW LOGIC:
    // Student is present if presentCount >= half of total periods
    const minimumForPresent = Math.ceil(totalValidPeriods / 2);
    const isPresentToday = presentCount >= minimumForPresent;

    dayList.push({
      date: dateKey,
      day: dayjs(dateKey).format("dddd").toLowerCase(),

      presentPeriods: presentCount,
      totalPeriods: totalValidPeriods,
      requiredForPresent: minimumForPresent,

      isPresent: isPresentToday,
    });
  }

  // 6. Summary counts
  const totalPresentDays = dayList.filter((d) => d.isPresent).length;
  const totalAbsentDays = dayList.filter((d) => !d.isPresent).length;


  // 7. Final response
  return {
    studentId,
    studentUid: (student?.userId as any)?.uid,
    name: (student.userId as any).name || "",
    image: (  student.userId as any)?.image || "",
    totalSummoned: student.totalSummoned || 0,
    isTerminated: student.isTerminated || false,

    classId,
    className: student.className  || "N/A",
    section,
    month: dayjs().format("MMMM YYYY"),

    totalDays: dayList.length,
    totalPresentDays,
    totalAbsentDays,

    dayList,
    studentNotes: notes || [],
      studentReports: reports || [],
  };
};



export const StudentService = {
  createStudent,
  findStudent,
  getMyChildren,
  selectChild,
  getAllStudents,
  editStudent,
  deleteStudent,
  getParentsList,
  getParentsDetails,
  createStudentWithXlsx,
  getAllStudentsListOfSpecificClassIdAndSection,
  terminateStudentByTeacher,
  removeTermination,
  summonStudent,
  removeSummoned,
  getAllStudentsListOfSchool,
  getAllTerminatedStudentsBySchool,
  getAllSummonedStudentBySchool,
  getSpecificStudentReport
};
