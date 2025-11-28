import { Schema, model } from "mongoose";
import { TAssignedSubjectTeacher } from "./assignedSubjectTeacher.interface";

const AssignedSubjectTeacherSchema = new Schema<TAssignedSubjectTeacher>(
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
      required: true,
      trim: true,
    },

    section: {
      type: String,
      required: true,
      trim: true,
    },

    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    subjectName: {
      type: String,
      required: true,
      trim: true,
    },

    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },

    teacherName: {
      type: String,
      required: true,
      trim: true,
    },

    dateAssigned: {
      type: Date,
      default: Date.now,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const AssignedSubjectTeacher = model<TAssignedSubjectTeacher>(
  "AssignedSubjectTeacher",
  AssignedSubjectTeacherSchema
);

export default AssignedSubjectTeacher;
