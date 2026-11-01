import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  theme: { type: String, enum: ['light', 'dark'], default: 'light' }
}, { timestamps: true });

const taskSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  course: { type: String, trim: true, maxlength: 60, default: 'General' },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  dueDate: { type: Date, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
  kind: { type: String, enum: ['assignment', 'study', 'exam'], default: 'assignment' }
}, { timestamps: true });

const noteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  course: { type: String, trim: true, maxlength: 60, default: 'General' },
  content: { type: String, required: true, maxlength: 30000 },
  summary: { type: String, maxlength: 6000, default: '' },
  pdfFilename: { type: String, default: null },
  pdfSize: { type: Number, default: null },
  pdfPages: { type: Number, default: null },
  pdfData: { type: Buffer, select: false, default: undefined }
}, { timestamps: true });

const quizSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  course: { type: String, default: 'General' },
  questions: [{ prompt: String, options: [String], answerIndex: { type: Number, select: false }, explanation: { type: String, select: false } }],
  score: { type: Number, default: null },
  completedAt: { type: Date, default: null },
  dueAt: { type: Date, default: null }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
export const Task = mongoose.model('Task', taskSchema);
export const Note = mongoose.model('Note', noteSchema);
export const Quiz = mongoose.model('Quiz', quizSchema);
