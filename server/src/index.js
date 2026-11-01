import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { User, Task, Note, Quiz } from './models.js';
import { requireAuth, validate, schemas } from './middleware.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 }));
app.use('/api/ai', rateLimit({ windowMs: 60 * 60 * 1000, limit: 25 }));

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const tokenFor = user => jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const userPublic = user => ({ id: user.id, name: user.name, email: user.email, theme: user.theme });
const pdfUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 }, fileFilter: (_req, file, callback) => {
  if (file.mimetype !== 'application/pdf' || !file.originalname.toLowerCase().endsWith('.pdf')) return callback(new Error('Choose a PDF file.'));
  callback(null, true);
} });
function receivePdf(req, res, next) {
  pdfUpload.single('file')(req, res, error => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'PDFs must be 8 MB or smaller.' });
    return res.status(400).json({ message: error.message || 'Could not read that PDF upload.' });
  });
}
async function extractPdfText(buffer) {
  const loading = getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, isEvalSupported: false });
  const pdf = await loading.promise;
  try {
    if (pdf.numPages > 150) { const error = new Error('PDFs can have up to 150 pages.'); error.status = 400; throw error; }
    const pages = [];
    let length = 0;
    for (let index = 1; index <= pdf.numPages && length < 30000; index++) {
      const page = await pdf.getPage(index);
      const { items } = await page.getTextContent();
      const text = items.map(item => typeof item.str === 'string' ? item.str : '').filter(Boolean).join(' ');
      pages.push(text);
      length += text.length;
      page.cleanup();
    }
    const content = pages.join('\n\n').replace(/[ \t]+/g, ' ').trim().slice(0, 30000);
    if (content.replace(/\s/g, '').length < 20) { const error = new Error('No selectable text was found. This may be a scanned PDF; OCR is not supported yet.'); error.status = 422; throw error; }
    return { content, pages: pdf.numPages };
  } finally {
    await loading.destroy();
  }
}
function safeNote(note) {
  return { _id: note._id, title: note.title, course: note.course, content: note.content, summary: note.summary, pdfFilename: note.pdfFilename, pdfSize: note.pdfSize, pdfPages: note.pdfPages, createdAt: note.createdAt, updatedAt: note.updatedAt };
}

app.get('/api/health', (_req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.post('/api/auth/register', validate(schemas.register), asyncRoute(async (req, res) => {
  const email = req.body.email.toLowerCase();
  if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists.' });
  const user = await User.create({ name: req.body.name, email, passwordHash: await bcrypt.hash(req.body.password, 12) });
  res.status(201).json({ token: tokenFor(user), user: userPublic(user) });
}));
app.post('/api/auth/login', validate(schemas.login), asyncRoute(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect.' });
  res.json({ token: tokenFor(user), user: userPublic(user) });
}));
app.get('/api/auth/me', requireAuth, asyncRoute(async (req, res) => {
  const user = await User.findById(req.userId); if (!user) return res.status(401).json({ message: 'Account not found.' }); res.json({ user: userPublic(user) });
}));
app.patch('/api/auth/theme', requireAuth, asyncRoute(async (req, res) => {
  const parsed = z.object({ theme: z.enum(['light','dark']) }).safeParse(req.body); if (!parsed.success) return res.status(400).json({ message: 'Choose light or dark mode.' });
  await User.findByIdAndUpdate(req.userId, { theme: parsed.data.theme }); res.json({ theme: parsed.data.theme });
}));

app.get('/api/tasks', requireAuth, asyncRoute(async (req, res) => {
  const tasks = await Task.find({ user: req.userId }).sort({ dueDate: 1 }); res.json(tasks);
}));
app.post('/api/tasks', requireAuth, validate(schemas.task), asyncRoute(async (req, res) => {
  const task = await Task.create({ ...req.body, user: req.userId }); res.status(201).json(task);
}));
app.patch('/api/tasks/:id', requireAuth, validate(schemas.task), asyncRoute(async (req, res) => {
  const task = await Task.findOneAndUpdate({ _id: req.params.id, user: req.userId }, req.body, { new: true, runValidators: true });
  if (!task) return res.status(404).json({ message: 'Task not found.' }); res.json(task);
}));
app.delete('/api/tasks/:id', requireAuth, asyncRoute(async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.userId }); if (!task) return res.status(404).json({ message: 'Task not found.' }); res.json({ ok: true });
}));

app.get('/api/notes', requireAuth, asyncRoute(async (req, res) => res.json(await Note.find({ user: req.userId }).sort({ updatedAt: -1 }))));
app.post('/api/notes/upload-pdf', requireAuth, receivePdf, asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Choose a PDF file to upload.' });
  if (req.file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') return res.status(400).json({ message: 'That file does not look like a valid PDF.' });
  const course = typeof req.body.course === 'string' ? req.body.course.trim() : 'General';
  if (course.length > 60) return res.status(400).json({ message: 'Course name must be 60 characters or fewer.' });
  const filename = path.basename(req.file.originalname).replace(/[^\w. ()-]/g, '_').slice(0, 180) || 'study-notes.pdf';
  const parsed = await extractPdfText(req.file.buffer);
  const title = (typeof req.body.title === 'string' && req.body.title.trim() ? req.body.title.trim() : filename.replace(/\.pdf$/i, '')).slice(0, 140);
  const note = await Note.create({ user: req.userId, title, course: course || 'General', content: parsed.content, pdfFilename: filename, pdfSize: req.file.size, pdfPages: parsed.pages, pdfData: req.file.buffer });
  res.status(201).json(safeNote(note));
}));
app.get('/api/notes/:id/pdf', requireAuth, asyncRoute(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, user: req.userId }).select('+pdfData');
  if (!note || !note.pdfData) return res.status(404).json({ message: 'PDF attachment not found.' });
  res.set({ 'Content-Type': 'application/pdf', 'Content-Length': note.pdfData.length, 'Content-Disposition': `attachment; filename="${note.pdfFilename.replace(/"/g, '')}"`, 'X-Content-Type-Options': 'nosniff' });
  res.send(note.pdfData);
}));
app.post('/api/notes', requireAuth, validate(schemas.note), asyncRoute(async (req, res) => res.status(201).json(await Note.create({ ...req.body, user: req.userId }))));
app.patch('/api/notes/:id', requireAuth, validate(schemas.note), asyncRoute(async (req, res) => {
  const note = await Note.findOneAndUpdate({ _id: req.params.id, user: req.userId }, req.body, { new: true, runValidators: true }); if (!note) return res.status(404).json({ message: 'Note not found.' }); res.json(note);
}));
app.delete('/api/notes/:id', requireAuth, asyncRoute(async (req, res) => {
  const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.userId }); if (!note) return res.status(404).json({ message: 'Note not found.' }); res.json({ ok: true });
}));

async function aiCompletion(messages, json = false) {
  if (!process.env.AI_API_KEY) { const error = new Error('AI is not configured yet. Add AI_API_KEY to server/.env.'); error.status = 503; throw error; }
  const response = await fetch(process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.AI_API_KEY}` },
    body: JSON.stringify({ model: process.env.AI_MODEL || 'gpt-4o-mini', messages, ...(json ? { response_format: { type: 'json_object' } } : {}), temperature: 0.5 })
  });
  if (!response.ok) { const error = new Error('The AI service could not complete that request. Try again shortly.'); error.status = 502; throw error; }
  const data = await response.json(); return data.choices?.[0]?.message?.content || '';
}
app.post('/api/ai/summarize/:noteId', requireAuth, asyncRoute(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.noteId, user: req.userId }); if (!note) return res.status(404).json({ message: 'Note not found.' });
  const summary = await aiCompletion([{ role: 'system', content: 'Summarize study notes into a concise, accurate outline. Use headings and bullet points. Do not invent facts.' }, { role: 'user', content: note.content }]);
  note.summary = summary.slice(0, 6000); await note.save(); res.json({ summary: note.summary });
}));
app.post('/api/ai/quizzes', requireAuth, asyncRoute(async (req, res) => {
  const parsed = z.object({ noteId: z.string().optional(), topic: z.string().max(300).optional(), count: z.number().int().min(3).max(10).default(5) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Choose a topic or note and a quiz size from 3 to 10.' });
  let context = parsed.data.topic || '';
  let course = 'General';
  if (parsed.data.noteId) { const note = await Note.findOne({ _id: parsed.data.noteId, user: req.userId }); if (!note) return res.status(404).json({ message: 'Note not found.' }); context = `${note.title}\n${note.content}`; course = note.course; }
  if (!context.trim()) return res.status(400).json({ message: 'Enter a topic or select a note.' });
  const raw = await aiCompletion([{ role: 'system', content: `Create exactly ${parsed.data.count} useful multiple-choice questions from the study material. Return JSON: {"title":"...","questions":[{"prompt":"...","options":["...","...","...","..."],"answerIndex":0,"explanation":"..."}]}. answerIndex is zero-based. Keep options concise.` }, { role: 'user', content: context.slice(0, 12000) }], true);
  let generated; try { generated = JSON.parse(raw); } catch { const error = new Error('AI returned an unreadable quiz. Please try again.'); error.status = 502; throw error; }
  const questions = (generated.questions || []).slice(0, parsed.data.count).filter(q => typeof q.prompt === 'string' && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < 4).map(q => ({ prompt: q.prompt.slice(0,500), options: q.options.map(o => String(o).slice(0,300)), answerIndex: q.answerIndex, explanation: String(q.explanation || '').slice(0,800) }));
  if (questions.length < 3) { const error = new Error('AI could not create enough valid questions. Try different notes.'); error.status = 502; throw error; }
  const quiz = await Quiz.create({ user: req.userId, title: String(generated.title || 'Study quiz').slice(0,120), course, questions, dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
  res.status(201).json({ id: quiz.id, title: quiz.title, course, dueAt: quiz.dueAt, questions: questions.map(({ prompt, options }) => ({ prompt, options })) });
}));
app.get('/api/quizzes', requireAuth, asyncRoute(async (req, res) => {
  const quizzes = await Quiz.find({ user: req.userId }).sort({ createdAt: -1 }).select('-questions.answerIndex -questions.explanation'); res.json(quizzes);
}));
app.get('/api/quizzes/:id', requireAuth, asyncRoute(async (req, res) => {
  const quiz = await Quiz.findOne({ _id: req.params.id, user: req.userId }).select('-questions.answerIndex -questions.explanation'); if (!quiz) return res.status(404).json({ message: 'Quiz not found.' }); res.json(quiz);
}));
app.post('/api/quizzes/:id/submit', requireAuth, asyncRoute(async (req, res) => {
  const parsed = z.object({ answers: z.array(z.number().int().min(0).max(3)).max(10) }).safeParse(req.body); if (!parsed.success) return res.status(400).json({ message: 'Submit one answer for each question.' });
  const quiz = await Quiz.findOne({ _id: req.params.id, user: req.userId }).select('+questions.answerIndex +questions.explanation');
  if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
  if (quiz.completedAt) return res.status(409).json({ message: 'This quiz has already been submitted.' });
  if (parsed.data.answers.length !== quiz.questions.length) return res.status(400).json({ message: 'Submit one answer for each question.' });
  let correct = 0; const feedback = quiz.questions.map((q, i) => { const isCorrect = parsed.data.answers[i] === q.answerIndex; if (isCorrect) correct++; return { correct: isCorrect, correctIndex: q.answerIndex, explanation: q.explanation }; });
  quiz.score = Math.round(correct / quiz.questions.length * 100); quiz.completedAt = new Date(); await quiz.save();
  res.json({ score: quiz.score, correct, total: quiz.questions.length, feedback });
}));

app.get('/api/dashboard', requireAuth, asyncRoute(async (req, res) => {
  const [tasks, quizzes] = await Promise.all([Task.find({ user: req.userId }), Quiz.find({ user: req.userId }).sort({ createdAt: -1 }).limit(20)]);
  const now = new Date(); const week = new Date(now); week.setDate(week.getDate() + 7);
  const active = tasks.filter(t => t.status !== 'done'); const high = { high: 0, medium: 1, low: 2 };
  active.sort((a,b) => high[a.priority] - high[b.priority] || a.dueDate - b.dueDate);
  const reminders = quizzes.filter(q => !q.completedAt && q.dueAt && q.dueAt <= week).map(q => ({ id: q.id, title: q.title, dueAt: q.dueAt }));
  const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const activity = dayLabels.map((day, i) => ({ day, count: tasks.filter(t => { const d = new Date(t.updatedAt).getDay(); return d === ((i + 1) % 7) && t.status === 'done'; }).length }));
  res.json({ stats: { total: tasks.length, completed: tasks.filter(t => t.status === 'done').length, upcoming: tasks.filter(t => t.status !== 'done' && t.dueDate >= now && t.dueDate <= week).length, focusHours: Math.max(0, Math.round(tasks.filter(t => t.status === 'done').length * 1.4 * 10) / 10) }, tasks: tasks.sort((a,b) => a.dueDate - b.dueDate), recommended: active[0] || null, reminders, activity, quizzes: quizzes.map(q => ({ id: q.id, title: q.title, course: q.course, score: q.score, completedAt: q.completedAt })) });
}));

app.use((err, _req, res, _next) => { console.error(err); res.status(err.status || 500).json({ message: err.status ? err.message : 'Something went wrong. Please try again.' }); });
app.use((_req, res) => res.status(404).json({ message: 'Route not found.' }));

const port = process.env.PORT || 4000;
if (!process.env.JWT_SECRET) { console.error('Set JWT_SECRET before starting the API.'); process.exit(1); }
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studysync').then(() => {
  app.listen(port, () => console.log(`StudySync API listening on ${port}`));
}).catch(error => { console.error('MongoDB connection failed:', error.message); process.exit(1); });

export { app };
