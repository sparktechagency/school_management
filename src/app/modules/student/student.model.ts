import { model, Schema } from 'mongoose';
import { TStudent } from './student.interface';




// Subdocument schema for termination info
const terminationSchema = new Schema(
  {
    terminatedDays: { type: Number, required: true },
    terminateBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actionTime: { type: Date, default: Date.now },
    removedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    removedTime: { type: Date },
  },
  { _id: false }
);

// Summon history schema
const summonHistorySchema = new Schema(
  {
    summonedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    },
    summonedAt: { 
      type: Date, 
      default: Date.now 
    },
    actionTime: { type: Date, default: Date.now },
    removedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    removedTime: { type: Date },
  },
  { _id: false }
);


const studentSchema = new Schema<TStudent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    schoolName: {
      type: String,
      required: true,
      trim: true,
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
    fatherPhoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    motherPhoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    parentsMessage: {
      type: String,
      default: "",
      trim: true,
    },
    isTerminated: { 
      type: Boolean, 
      default: false 
    },
    termination: { 
      type: terminationSchema, 
      default: null 
    },
    // Summon system
    summoned: { 
      type: Boolean, 
      default: false 
    },
    lastSummonedAt: { 
      type: Date, 
      default: null 
    },
    totalSummoned: { 
      type: Number, 
      default: 0 
    },

    summonedHistory: { 
      type: [summonHistorySchema], 
      default: [] 
    },
  },
  {
    timestamps: true,
  },
);

const Student = model<TStudent>('Student', studentSchema);


export default Student;
