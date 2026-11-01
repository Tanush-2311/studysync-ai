import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Task, Note, Quiz } from './models.js';

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studysync');
const email = 'demo@studysync.edu';
let user = await User.findOne({ email });
if (!user) user = await User.create({ name: 'Alex Morgan', email, passwordHash: await bcrypt.hash('StudySync123!', 12) });
await Promise.all([Task.deleteMany({ user: user.id }), Note.deleteMany({ user: user.id }), Quiz.deleteMany({ user: user.id })]);
const at = days => new Date(Date.now() + days * 86400000);
await Task.insertMany([
  { user: user.id, title: 'Research paper: social learning theory', course: 'Psychology 204', description: 'Gather three peer-reviewed sources and outline the argument.', dueDate: at(2), priority: 'high', kind: 'assignment', status: 'in-progress' },
  { user: user.id, title: 'Problem set 6: integration', course: 'Calculus II', dueDate: at(3), priority: 'high', kind: 'assignment' },
  { user: user.id, title: 'Review lecture 8 and make flashcards', course: 'Biology 110', dueDate: at(5), priority: 'medium', kind: 'study' },
  { user: user.id, title: 'Read chapters 4–5', course: 'World History', dueDate: at(7), priority: 'low', kind: 'study' },
  { user: user.id, title: 'Midterm: data structures', course: 'Computer Science 210', dueDate: at(11), priority: 'high', kind: 'exam' },
  { user: user.id, title: 'Lab report: enzyme kinetics', course: 'Biology 110', dueDate: at(-2), priority: 'medium', status: 'done', kind: 'assignment' }
]);
const notes = await Note.insertMany([
  { user: user.id, title: 'Social Learning Theory', course: 'Psychology 204', content: 'Albert Bandura developed social learning theory, emphasizing that people learn by observing others. Learning can occur without a change in behavior. Key processes include attention, retention, reproduction, and motivation. The Bobo doll experiments demonstrated observational learning in children. Modeling is more likely when the model is perceived as similar, prestigious, or rewarded. Reciprocal determinism describes the interaction of personal factors, behavior, and environment. Self-efficacy is a person’s belief in their capacity to perform a behavior and influences persistence.' },
  { user: user.id, title: 'Cellular Respiration', course: 'Biology 110', content: 'Cellular respiration converts chemical energy in glucose into ATP. Glycolysis occurs in the cytoplasm and produces two pyruvate, two net ATP, and NADH per glucose. In aerobic conditions pyruvate is converted to acetyl-CoA, which enters the citric acid cycle in the mitochondrial matrix. The cycle releases carbon dioxide and generates NADH, FADH2, and ATP. The electron transport chain in the inner mitochondrial membrane uses electrons to pump protons. ATP synthase uses the proton gradient to phosphorylate ADP. Oxygen is the final electron acceptor and forms water. Fermentation regenerates NAD+ when oxygen is absent.' },
  { user: user.id, title: 'Fundamental Theorem of Calculus', course: 'Calculus II', content: 'The Fundamental Theorem of Calculus links differentiation and integration. Part 1: if f is continuous and F(x) is the integral from a to x of f(t) dt, then F prime of x equals f(x). Part 2: if F is an antiderivative of f on [a,b], then the integral from a to b of f(x) dx equals F(b) minus F(a). For substitution, identify an inner function and its derivative, transform bounds for definite integrals, and evaluate the antiderivative at the new bounds.' }
]);
await Quiz.create({ user: user.id, title: 'Social Learning quick check', course: 'Psychology 204', dueAt: at(1), questions: [{ prompt: 'Which sequence names Bandura’s processes for observational learning?', options: ['Attention, retention, reproduction, motivation', 'Stimulus, response, reward, extinction', 'Encoding, storage, retrieval, rehearsal', 'Modeling, priming, shaping, transfer'], answerIndex: 0, explanation: 'Bandura described attention, retention, reproduction, and motivation.' }] });
console.log(`Seeded ${email} with ${notes.length} study notes. Password: StudySync123!`);
await mongoose.disconnect();
