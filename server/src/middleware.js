import jwt from 'jsonwebtoken';
import { z } from 'zod';

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });
  try { req.userId = jwt.verify(token, process.env.JWT_SECRET).sub; next(); }
  catch { return res.status(401).json({ message: 'Your session expired. Please sign in again.' }); }
}

export function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || 'Invalid input.' });
    req.body = parsed.data; next();
  };
}

export const schemas = {
  register: z.object({ name: z.string().trim().min(2).max(80), email: z.string().email().max(254), password: z.string().min(8).max(100) }),
  login: z.object({ email: z.string().email(), password: z.string().min(1).max(100) }),
  task: z.object({ title: z.string().trim().min(1).max(140), course: z.string().max(60).optional(), description: z.string().max(1000).optional(), dueDate: z.string().min(1).refine(value => !Number.isNaN(Date.parse(value)), 'Enter a valid due date.'), priority: z.enum(['low','medium','high']).optional(), status: z.enum(['todo','in-progress','done']).optional(), kind: z.enum(['assignment','study','exam']).optional() }).partial({ priority: true, status: true, kind: true }),
  note: z.object({ title: z.string().trim().min(1).max(140), course: z.string().max(60).optional(), content: z.string().min(1).max(30000) })
};
