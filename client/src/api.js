import { demoRequest } from './demo.js';
const API = import.meta.env.VITE_API_URL || '';
export function getToken() { return localStorage.getItem('studysync-token'); }
export function setSession(token, user) { localStorage.removeItem('studysync-demo-mode'); localStorage.setItem('studysync-token', token); localStorage.setItem('studysync-user', JSON.stringify(user)); }
export function clearSession() { localStorage.removeItem('studysync-token'); localStorage.removeItem('studysync-user'); localStorage.removeItem('studysync-demo-mode'); }
export function isDemoMode() { return localStorage.getItem('studysync-demo-mode') === 'true'; }
export async function api(path, options = {}) {
  if (isDemoMode()) return demoRequest(path, options);
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetch(`${API}/api${path}`, { ...options, headers: { ...(!isFormData ? { 'Content-Type': 'application/json' } : {}), ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}), ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}

export async function downloadPdf(noteId, filename) {
  const response = await fetch(`${API}/api/notes/${noteId}/pdf`, { headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {} });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Could not download this PDF.');
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'study-notes.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
