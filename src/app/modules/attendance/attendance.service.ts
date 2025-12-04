/* eslint-disable @typescript-eslint/no-explicit-any */
import dayjs from 'dayjs';
import { JwtPayload, Secret } from 'jsonwebtoken';
import mongoose from 'mongoose';
import config from '../../../config';
import sendNotification from '../../../socket/sendNotification';
import { USER_ROLE } from '../../constant';
import { TAuthUser } from '../../interface/authUser';
import AggregationQueryBuilder from '../../QueryBuilder/aggregationBuilder';
import AppError from '../../utils/AppError';
import { decodeToken } from '../../utils/decodeToken';
import Class from '../class/class.model';
import ClassSchedule from '../classSchedule/classSchedule.model';
import { NOTIFICATION_TYPE } from '../notification/notification.interface';
import Student from '../student/student.model';
import { StudentService } from '../student/student.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { TeacherService } from '../teacher/teacher.service';
import {
    commonStageInAttendance,
    commonStageInAttendanceDetails,
} from './attendance.helper';
import { TAttendance, UpdateAttendancePayload } from './attendance.interface';
import Attendance from './attendance.model';
import httpStatus from 'http-status';

const createAttendance = async (
  payload: Partial<TAttendance>,
  user: TAuthUser
) => {
  // -----------------------------------
  // 1. Verify Teacher
  // -----------------------------------
  const teacher = await TeacherService.findTeacher(user);
  if (!teacher) throw new AppError(404, "Teacher not found");

  const schoolId = teacher.schoolId;

  // -----------------------------------
  // 2. Validate Required Fields
  // -----------------------------------
  if (!payload.className || !payload.section)
    throw new AppError(400, "className and section are required");

  if (!payload.day || !payload.periodNumber)
    throw new AppError(400, "day and periodNumber are required");

  if (!payload.subjectId)
    throw new AppError(400, "subjectId is required");

  // -----------------------------------
  // 3. Find Class
  // -----------------------------------
  const findClass = await Class.findOne({
    schoolId,
    className: payload.className,
    section: payload.section,
  });

  if (!findClass) throw new AppError(404, "Class not found");

  // -----------------------------------
  // 4. Total Students in Class
  // -----------------------------------
  const totalStudents = await Student.countDocuments({
    schoolId,
    classId: findClass._id,
    section: payload.section,
  });

  // -----------------------------------
  // 5. Normalize present/absent arrays
  // -----------------------------------
  const presentIds = (payload.presentStudents ?? []) as string[];
  const absentIds = (payload.absentStudents ?? []) as string[];

  // Remove duplicates from each list
  const uniquePresent = [...new Set(presentIds)];
  const uniqueAbsent = [...new Set(absentIds)];

  // Prevent same student in both lists
  const conflict = uniquePresent.filter(id => uniqueAbsent.includes(id));
  if (conflict.length > 0) {
    throw new AppError(
      400,
      `A student cannot be both present and absent. Conflicting IDs: ${conflict.join(", ")}`
    );
  }

  // Convert to objectId format
  const presentStudents = uniquePresent.map(id => ({
    studentId: new mongoose.Types.ObjectId(id),
  }));

  const absentStudents = uniqueAbsent.map(id => ({
    studentId: new mongoose.Types.ObjectId(id),
  }));

  // -----------------------------------
  // 6. Normalize Date (00:00 UTC)
  // -----------------------------------
  const attendanceDate = new Date(payload.date ?? new Date());
  attendanceDate.setUTCHours(0, 0, 0, 0);

  // -----------------------------------
  // 7. Prevent Duplicate Attendance
  // Same class, same period, same date
  // -----------------------------------
  const existingAttendance = await Attendance.findOne({
    schoolId,
    classId: findClass._id,
    section: payload.section,
    date: attendanceDate,
    periodNumber: payload.periodNumber,
    day: payload.day.toLowerCase(),
  });

  if (existingAttendance) {
    throw new AppError(409, "Attendance already marked for this period");
  }

  // -----------------------------------
  // 8. Create Attendance
  // -----------------------------------
  const attendance = await Attendance.create({
    schoolId,
    classId: findClass._id,
    className: payload.className,
    section: payload.section,

    day: payload.day.toLowerCase(),
    periodNumber: payload.periodNumber,
    periodName: payload.periodName,

    subjectId: payload.subjectId,
    subjectName: payload.subjectName,

    teacherId: payload.teacherId ?? teacher._id,
    teacherName: payload.teacherName ?? (teacher as any).name,

    startTime: payload.startTime,
    endTime: payload.endTime,

    totalStudents,
    presentStudents,
    absentStudents,

    date: attendanceDate,
    isAttendance: true,
  });

  // -----------------------------------
  // 9. Send Notification
  // -----------------------------------
  sendNotification(user, {
    senderId: user.userId,
    role: user.role,
    receiverId: user.mySchoolUserId,
    message: `${user.name} has marked attendance for ${payload.className} section ${payload.section}`,
    type: NOTIFICATION_TYPE.ATTENDANCE,
    linkId: attendance._id,
    senderName: user.name,
  });

  return attendance;
};


const createAttendanceMahin = async (
    payload: Partial<TAttendance>,
    user: TAuthUser,
) => {
    const findTeacher = await TeacherService.findTeacher(user);

    const findClass = await Class.findOne({
        className: payload.className,
    });

    const totalStudents = await Student.find({
        schoolId: findTeacher.schoolId,
        classId: findClass?._id,
        className: payload.className,
        section: payload.section,
    }).countDocuments();

    const presentStudents = payload.presentStudents!.map((studentId) => {
        return {
            studentId: studentId,
        };
    });

    const absentStudents = payload.absentStudents!.map((studentId) => {
        return {
            studentId: studentId,
        };
    });

    const attendanceDate = new Date();
    attendanceDate.setUTCHours(0, 0, 0, 0);

    const attendance = await Attendance.create({
        ...payload,
        totalStudents,
        presentStudents,
        absentStudents,
        schoolId: findTeacher.schoolId,
        date: attendanceDate,
        isAttendance: true,
    });

    await ClassSchedule.findByIdAndUpdate((payload as any).classScheduleId, { isAttendance: true }, { new: true })

    sendNotification(user, {
        senderId: user.userId,
        role: user.role,
        receiverId: user.mySchoolUserId,
        message: `${user.name} has marked attendance for ${payload.className} section ${payload.section}`,
        type: NOTIFICATION_TYPE.ATTENDANCE,
        linkId: attendance._id,
        senderName: user.name,
    });

    return attendance;
};



// const getAttendanceHistory = async (
//     user: TAuthUser,
//     query: Record<string, unknown>,
// ) => {
//     const { date } = query;

//     const targetDate = date ? new Date(date as string) : new Date();
//     targetDate.setUTCHours(0, 0, 0, 0);

//     const startOfDay = new Date(targetDate);
//     const endOfDay = new Date(targetDate);
//     endOfDay.setUTCHours(23, 59, 59, 999);

//     console.log(startOfDay);
//     const matchStage: any = {
//         $match: {
//             isAttendance: true,
//         },
//     };

//     if (user.role === USER_ROLE.school) {
//         matchStage.$match.schoolId = new mongoose.Types.ObjectId(
//             String(user.schoolId),
//         );
//     } else {
//         const findTeacher = await TeacherService.findTeacher(user);
//         if (!findTeacher) throw new Error('Teacher not found');

//         matchStage.$match.schoolId = new mongoose.Types.ObjectId(
//             String(findTeacher.schoolId),
//         );
//         matchStage.$match.date = {
//             $gte: startOfDay,
//             $lte: endOfDay,
//         };
//     }
//     const attendanceQuery = new AggregationQueryBuilder(query);
//     console.log(matchStage);

//     const result = await attendanceQuery
//         .customPipeline([
//             matchStage,
//             ...commonStageInAttendance,
//             {
//                 $project: {
//                     _id: 1,
//                     classId: 1,
//                     className: 1,
//                     section: 1,
//                     totalStudents: 1,
//                     presentStudents: { $size: '$presentStudents' },
//                     absentStudents: { $size: '$absentStudents' },
//                     startTime: '$classSchedule.selectTime',
//                     endTime: '$classSchedule.endTime',
//                     date: 1,
//                 },
//             },
//         ])
//         .sort()
//         .paginate()
//         .execute(Attendance);

//     const meta = await attendanceQuery.countTotal(Attendance);

//     return { meta, result };
// };


const getAttendanceHistory = async (user: TAuthUser, query: Record<string, unknown>) => {
    const { date } = query;

    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0);

    const startOfDay = new Date(targetDate);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const matchStage: any = {
        $match: {
            isAttendance: true,
            date: { $gte: startOfDay, $lte: endOfDay }, // ✅ moved outside role condition
        },
    };

    if (user.role === USER_ROLE.school) {
        matchStage.$match.schoolId = new mongoose.Types.ObjectId(String(user.schoolId));
    } else {
        const findTeacher = await TeacherService.findTeacher(user);
        if (!findTeacher) throw new Error('Teacher not found');

        matchStage.$match.schoolId = new mongoose.Types.ObjectId(String(findTeacher.schoolId));
    }

    const attendanceQuery = new AggregationQueryBuilder(query);

    const result = await attendanceQuery
        .customPipeline([
            matchStage,
            ...commonStageInAttendance,
            {
                $project: {
                    _id: 1,
                    classId: 1,
                    className: 1,
                    section: 1,
                    totalStudents: 1,
                    presentStudents: { $size: '$presentStudents' },
                    absentStudents: { $size: '$absentStudents' },
                    startTime: '$classSchedule.selectTime',
                    endTime: '$classSchedule.endTime',
                    date: 1,
                },
            },
        ])
        .sort()
        .paginate()
        .execute(Attendance);

    const meta = await attendanceQuery.countTotal(Attendance);

    return { meta, result };
};


const getMyAttendance = async (
    user: TAuthUser,
    query: Record<string, unknown>,
) => {
    const { token } = query;

    let decodedUser;

    if (token) {
        decodedUser = decodeToken(
            token as string,
            config.jwt.access_token as Secret,
        ) as JwtPayload;
    }

    if (decodedUser?.role === USER_ROLE.parents) {
        const subscription = await SubscriptionService.getMySubscription(
            decodedUser as TAuthUser,
        );

        if (
            Object.keys(subscription || {}).length === 0 ||
            subscription.isAttendanceEnabled === false
        ) {
            throw new AppError(
                700,
                'You need an active subscription to get attendance',
            );
        }
    }

    const findStudent = await StudentService.findStudent(user.studentId);

    const studentObjectId = new mongoose.Types.ObjectId(String(user.studentId));

    const attendanceQuery = new AggregationQueryBuilder(query);
    const commonStage = commonStageInAttendanceDetails(studentObjectId);
    const result = await attendanceQuery
        .customPipeline([
            {
                $match: {
                    className: findStudent.className,
                    section: findStudent.section,
                    schoolId: new mongoose.Types.ObjectId(String(findStudent.schoolId)),
                },
            },
            ...commonStage,
        ])
        .sort()
        .paginate()
        .execute(Attendance);

    const meta = await attendanceQuery.countTotal(Attendance);
    return { meta, result };
};


const getMyAttendanceThisMonth = async (
  user: TAuthUser,
  query: Record<string, unknown>
) => {


    const { token } = query;

    let decodedUser;

    if (token) {
        decodedUser = decodeToken(
            token as string,
            config.jwt.access_token as Secret,
        ) as JwtPayload;
    }

    if (decodedUser?.role === USER_ROLE.parents) {
        const subscription = await SubscriptionService.getMySubscription(
            decodedUser as TAuthUser,
        );

        if (
            Object.keys(subscription || {}).length === 0 ||
            subscription.isAttendanceEnabled === false
        ) {
            throw new AppError(
                700,
                'You need an active subscription to get attendance',
            );
        }
    }

//   if (user.role !== USER_ROLE.student) {
//     throw new AppError(httpStatus.FORBIDDEN, "Only students can access this");
//   }

  // 1️⃣ Fetch student info
  const student = await StudentService.findStudent(user.studentId);
  if (!student) throw new AppError(404, "Student not found");

  const studentObjectId = new mongoose.Types.ObjectId(String(user.studentId));
  const schoolId = new mongoose.Types.ObjectId(String(student.schoolId));

  // 2️⃣ Current month start & end
  const startOfMonth = dayjs().startOf("month").startOf("day").toDate();
  const endOfMonth = dayjs().endOf("month").endOf("day").toDate();

  // 3️⃣ Build aggregation
  const builder = new AggregationQueryBuilder(query);

  const attendanceData = await builder
    .customPipeline([
      {
        $match: {
          schoolId,
          classId: new mongoose.Types.ObjectId(String(student.classId)),
          section: student.section,
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },

      // Populate subject info
      {
        $lookup: {
          from: "subjects",
          localField: "subjectId",
          foreignField: "_id",
          as: "subject",
        },
      },
      { $unwind: { path: "$subject", preserveNullAndEmptyArrays: true } },

      // 4️⃣ Group by day
      {
        $group: {
          _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } } },
          periods: { $push: "$$ROOT" },
        },
      },

      // 5️⃣ Build daily history with period details
      {
        $project: {
          _id: 0,
          date: "$_id.date",
          history: {
            $map: {
              input: "$periods",
              as: "p",
              in: {
                periodNumber: "$$p.periodNumber",
                startTime: "$$p.startTime",
                endTime: "$$p.endTime",
                subjectName: { $ifNull: ["$$p.subject.subjectName", "$$p.subjectName"] },
                isPresent: {
                  $in: [studentObjectId, "$$p.presentStudents.studentId"],
                },
              },
            },
          },
        },
      },

      // 6️⃣ Count total periods and periods attended
      {
        $addFields: {
          totalPeriods: { $size: "$history" },
          totalPresentPeriods: {
            $size: {
              $filter: {
                input: "$history",
                as: "h",
                cond: { $eq: ["$$h.isPresent", true] },
              },
            },
          },
        },
      },

      // 7️⃣ Determine day-level presence
      {
        $addFields: {
          isPresent: {
            $cond: [
              {
                $gte: [
                  "$totalPresentPeriods",
                  { $ceil: { $divide: ["$totalPeriods", 2] } }, // at least half periods
                ],
              },
              true,
              false,
            ],
          },
        },
      },

      { $sort: { date: 1 } },
    ])
    .execute(Attendance);

  // 8️⃣ Monthly summary: totalPresents & totalAbsents are **days** based
  const totalPresents = attendanceData.filter((d: any) => d.isPresent).length;
  const totalAbsents = attendanceData.filter((d: any) => !d.isPresent).length;

  // 9️⃣ Return structured response
  return {
    month: dayjs().format("MMMM YYYY"),
    totalPresents,
    totalAbsents,
    attendanceHistory: attendanceData,
  };
};


const getMyAttendanceDetails = async (
    user: TAuthUser,
    query: Record<string, unknown>,
) => {
    const findStudent = await StudentService.findStudent(user.studentId);
    const dateConvert = new Date(query.date as string);
    const studentObjectId = new mongoose.Types.ObjectId(String(user.studentId));

    const result = await Attendance.aggregate([
        {
            $match: {
                date: dateConvert,
                schoolId: new mongoose.Types.ObjectId(String(findStudent.schoolId)),
            },
        },
        {
            $addFields: {
                status: {
                    $cond: {
                        if: {
                            $in: [
                                studentObjectId,
                                {
                                    $map: {
                                        input: '$presentStudents',
                                        as: 'student',
                                        in: '$$student.studentId',
                                    },
                                },
                            ],
                        },
                        then: 'present',
                        else: 'absent',
                    },
                },
            },
        },

        {
            $lookup: {
                from: 'classschedules',
                localField: 'classScheduleId',
                foreignField: '_id',
                as: 'classSchedule',
            },
        },

        {
            $unwind: {
                path: '$classSchedule',
                preserveNullAndEmptyArrays: true,
            },
        },

        {
            $lookup: {
                from: 'subjects',
                localField: 'classSchedule.subjectId',
                foreignField: '_id',
                as: 'subject',
            },
        },

        {
            $unwind: {
                path: '$subject',
                preserveNullAndEmptyArrays: true,
            },
        },

        {
            $project: {
                _id: 0,
                classScheduleId: 1,
                startTime: '$classSchedule.selectTime',
                subjectName: '$subject.subjectName',
                status: 1,
                date: 1,
            },
        },
    ]);

    return result;
};

const getAttendanceDetails = async (attendanceId: string, query: Record<string, unknown>) => {

    const { className, section, classId } = query;

    // Build filter conditions for students
    const filterConditions: any[] = [];

    if (className) {
        filterConditions.push({ $eq: ['$$student.className', className] });
    }

    if (section) {
        filterConditions.push({ $eq: ['$$student.section', section] });
    }

    if (classId) {
        filterConditions.push({
            $eq: ['$$student.classId', new mongoose.Types.ObjectId(String(classId))]
        });
    }

    const result = await Attendance.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(String(attendanceId)),
            },
        },
        ...commonStageInAttendance,

        // Filter students array based on query parameters before unwinding
        ...(filterConditions.length > 0
            ? [{
                $addFields: {
                    student: {
                        $filter: {
                            input: '$student',
                            as: 'student',
                            cond: filterConditions.length === 1
                                ? filterConditions[0]
                                : { $and: filterConditions }
                        }
                    }
                }
            }]
            : []
        ),

        // Unwind student array to lookup individually
        { $unwind: '$student' },

        // Lookup user info from users collection
        {
            $lookup: {
                from: 'users', // Replace with your actual collection name if different
                localField: 'student.userId',
                foreignField: '_id',
                as: 'userInfo',
            },
        },

        // Flatten userInfo array
        { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },

        // Rebuild the student object with merged user info
        {
            $addFields: {
                student: {
                    $mergeObjects: [
                        '$student',
                        {
                            name: '$userInfo.name',
                            image: '$userInfo.image',
                            email: '$userInfo.email', // optional, add more fields if needed
                        },
                    ],
                },
            },
        },

        // Re-group back the students into array
        {
            $group: {
                _id: '$_id',
                classId: { $first: '$classId' },
                className: { $first: '$className' },
                section: { $first: '$section' },
                totalStudents: { $first: '$totalStudents' },
                presentStudents: { $first: '$presentStudents' },
                absentStudents: { $first: '$absentStudents' },
                startTime: { $first: '$classSchedule.selectTime' },
                endTime: { $first: '$classSchedule.endTime' },
                date: { $first: '$date' },
                student: { $push: '$student' },
            },
        },

        // Final project
        {
            $project: {
                _id: 1,
                classId: 1,
                className: 1,
                section: 1,
                totalStudents: 1,
                presentStudents: { $size: '$presentStudents' },
                absentStudents: { $size: '$absentStudents' },
                startTime: 1,
                endTime: 1,
                date: 1,
                student: {
                    $map: {
                        input: '$student',
                        as: 'stu',
                        in: {
                            $mergeObjects: [
                                '$$stu',
                                {
                                    studentId: '$$stu._id',
                                    status: {
                                        $cond: [
                                            {
                                                $in: [
                                                    '$$stu._id',
                                                    {
                                                        $map: {
                                                            input: '$presentStudents',
                                                            as: 'p',
                                                            in: '$$p.studentId',
                                                        },
                                                    },
                                                ],
                                            },
                                            'present',
                                            'absent',
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                },
            },
        },
    ]);

    return result;
};

const getAttendanceStudentListWithCounts = async (attendanceId: string) => {
  if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
    throw new Error("Invalid attendanceId");
  }

  const objectId = new mongoose.Types.ObjectId(attendanceId);

  // -------------------------------
  // 1. Load attendance first
  // -------------------------------
  const attendance = await Attendance.findById(objectId);
  if (!attendance) throw new Error("Attendance not found");


  // -------------------------------
  // 2. Fetch students + their User info
  // -------------------------------
  const students = await Student.aggregate([
    {
      $match: {
        classId: attendance.classId,
        section: attendance.section,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userInfo",
      },
    },
    {
      $unwind: {
        path: "$userInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        userId: 1,
        studentName: "$userInfo.name",      // 👈 FETCHED FROM USER MODEL
        parentsMessage: 1,
        fatherPhoneNumber: 1,
        motherPhoneNumber: 1,
      },
    },
  ]);

  // -------------------------------
  // 3. Attach attendance flag
  // -------------------------------
  const studentList = students.map((student) => {
    const isPresent = attendance.presentStudents.some((s) =>
      (s as any).studentId.equals(student._id)
    );

    return {
      studentId: student._id,
      userId: student.userId,
      studentName: student.studentName || "Unknown",
      parentMessage: student.parentsMessage,
      fatherPhoneNumber: student.fatherPhoneNumber,
      motherPhoneNumber: student.motherPhoneNumber,
      isAttendance: isPresent,
    };
  });

  // -------------------------------
  // 4. Count data
  // -------------------------------
  const totalStudents = studentList.length;
  const totalPresentStudents = studentList.filter((s) => s.isAttendance).length;
  const totalAbsentStudents = totalStudents - totalPresentStudents;

  return {
    totalStudents,
    totalPresentStudents,
    totalAbsentStudents,
    studentList,
  };
};



const getAttendanceCount = async (
    user: TAuthUser,
    query: Record<string, unknown>,
) => {
    const findStudent = await StudentService.findStudent(user.studentId);
    const studentObjectId = new mongoose.Types.ObjectId(String(user.studentId));

    const attendanceQuery = new AggregationQueryBuilder(query);

    // Get the first and last day of the current month
    const startOfMonth = dayjs().startOf('month').toDate();
    const endOfMonth = dayjs().endOf('month').toDate();

    const commonStage = commonStageInAttendanceDetails(studentObjectId);

    const result = await attendanceQuery
        .customPipeline([
            {
                $match: {
                    className: findStudent.className,
                    section: findStudent.section,
                    schoolId: new mongoose.Types.ObjectId(String(findStudent.schoolId)),
                    date: {
                        $gte: startOfMonth,
                        $lte: endOfMonth,
                    },
                },
            },
            ...commonStage,
        ])
        .execute(Attendance);

    let totalPresent = 0;
    let totalAbsent = 0;

    for (const attendance of result) {
        totalPresent += attendance.presentClass;
        totalAbsent += attendance.totalClass - attendance.presentClass;
    }

    return {
        totalPresent: totalPresent || 0,
        totalAbsent: totalAbsent || 0,
    };
};


const updateAttendanceById = async (
  attendanceId: string,
  payload: UpdateAttendancePayload,
) => {
  if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
    throw new AppError(400, "Invalid attendance ID");
  }

  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) throw new AppError(404, "Attendance not found");

  // Convert string IDs to ObjectId for MongoDB
  const presentStudents = (payload.presentStudents || []).map((id) => ({
    studentId: new mongoose.Types.ObjectId(id),
  }));
  const absentStudents = (payload.absentStudents || []).map((id) => ({
    studentId: new mongoose.Types.ObjectId(id),
  }));

  // Update attendance fields
  attendance.presentStudents = presentStudents;
  attendance.absentStudents = absentStudents;
  attendance.isAttendance = true;

  // Optional: recalculate total students if needed
  const totalStudents = await Student.countDocuments({
    schoolId: attendance.schoolId,
    classId: attendance.classId,
    section: attendance.section,
  });

  attendance.totalStudents = totalStudents;

  await attendance.save();

  return attendance;
};

export const AttendanceService = {
    createAttendance,
    getAttendanceHistory,
    getMyAttendance,
    getMyAttendanceThisMonth,
    getMyAttendanceDetails,
    getAttendanceDetails,
    getAttendanceCount,
    getAttendanceStudentListWithCounts,
    updateAttendanceById
};
