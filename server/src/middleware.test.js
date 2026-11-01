import test from 'node:test';
import assert from 'node:assert/strict';
import { schemas } from './middleware.js';

test('registration rejects short passwords and malformed email', () => {
  assert.equal(schemas.register.safeParse({ name: 'Sam', email: 'bad', password: '123' }).success, false);
});
test('registration accepts a valid account payload', () => {
  assert.equal(schemas.register.safeParse({ name: 'Sam Lee', email: 'sam@college.edu', password: 'study-hard-123' }).success, true);
});
test('task input enforces supported priority values', () => {
  assert.equal(schemas.task.safeParse({ title: 'Read', dueDate: '2026-11-01', priority: 'urgent' }).success, false);
});
test('task input rejects invalid due dates', () => {
  assert.equal(schemas.task.safeParse({ title: 'Read', dueDate: 'not-a-date' }).success, false);
});
