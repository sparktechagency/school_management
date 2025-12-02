
import { model, Schema } from "mongoose";
import { TAttendance, TAttendanceStudent } from "./attendance.interface";

const studentSchema = new Schema<TAttendanceStudent>({
  studentId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "Student",
  },
});

const attendanceSchema = new Schema<TAttendance>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    className: { 
      type: String, 
      required: true 
    },
    section: { 
      type: String, 
      required: true 
    },

    day: {
      type: String,
      required: true,
      enum: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
    },

    date: { 
      type: Date,
      required: true 
    }, // store YYYY-MM-DD

    periodNumber: { 
      type: Number, 
      required: true 
    },

    subjectId: { 
      type: Schema.Types.ObjectId, 
      ref: "Subject", 
      default: null 
    },
    subjectName: { 
      type: String, 
      default: null 
    },

    takenBy: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      default: null 
    },
    takenByName: { 
      type: String, 
      default: null 
    },

    startTime: { 
      type: String, 
      required: true 
    },
    endTime: { 
      type: String, 
      required: true 
    },

    totalStudents: { 
      type: Number, 
      required: true 
    },

    isAttendance: { type: Boolean, default: false },

    presentStudents: [studentSchema],
    absentStudents: [studentSchema],
  },
  { timestamps: true }
);

const Attendance = model<TAttendance>("Attendance", attendanceSchema);

export default Attendance;








/// this is mahin vhai code

// import { model, Schema } from 'mongoose';
// import { TAttendance, TAttendanceStudent } from './attendance.interface';

// const studentSchema = new Schema<TAttendanceStudent>({
//   studentId: {
//     type: Schema.Types.ObjectId,
//     required: true,
//     ref: 'Student',
//   },
// });

// const attendanceSchema = new Schema<TAttendance>(
//   {
//     classScheduleId: {
//       type: Schema.Types.ObjectId,
//       required: true,
//       ref: 'ClassSchedule',
//     },
//     schoolId: {
//       type: Schema.Types.ObjectId,
//       required: true,
//       ref: 'School',
//     },
//     classId: {
//       type: Schema.Types.ObjectId,
//       required: true,
//       ref: 'Class',
//     },
//     isAttendance: {
//       type: Boolean,
//       default: false,
//     },
//     className: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     totalStudents: {
//       type: Number,
//       required: true,
//     },
//     section: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     days: {
//       type: String,
//       required: true,
//       enum: [
//         'monday',
//         'tuesday',
//         'wednesday',
//         'thursday',
//         'friday',
//         'saturday',
//         'sunday',
//       ],
//       trim: true,
//     },
//     presentStudents: [studentSchema],
//     absentStudents: [studentSchema],
//     date: {
//       type: Date,
//       required: true,
//     },
//   },
//   {
//     timestamps: true,
//   },
// );

// const Attendance = model<TAttendance>('Attendance', attendanceSchema);

// export default Attendance;
