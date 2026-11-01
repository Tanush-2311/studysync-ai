const STORAGE_KEY = 'studysync-demo-data';
const DEMO_USER = { id: 'demo-user', name: 'Alex Morgan', email: 'demo@studysync.edu', theme: 'light' };
const dateIn = days => { const value = new Date(); value.setDate(value.getDate() + days); return value.toISOString(); };

function initialData() {
  return {
    tasks: [
      { _id: 'demo-task-1', title: 'Research paper: social learning theory', course: 'Psychology 204', description: 'Gather three peer-reviewed sources and outline the argument.', dueDate: dateIn(2), priority: 'high', status: 'in-progress', kind: 'assignment', updatedAt: dateIn(-1) },
      { _id: 'demo-task-2', title: 'Problem set 6: integration', course: 'Calculus II', description: '', dueDate: dateIn(3), priority: 'high', status: 'todo', kind: 'assignment', updatedAt: dateIn(-2) },
      { _id: 'demo-task-3', title: 'Review lecture 8 and make flashcards', course: 'Biology 110', description: '', dueDate: dateIn(5), priority: 'medium', status: 'todo', kind: 'study', updatedAt: dateIn(-3) },
      { _id: 'demo-task-4', title: 'Lab report: enzyme kinetics', course: 'Biology 110', description: '', dueDate: dateIn(-1), priority: 'medium', status: 'done', kind: 'assignment', updatedAt: dateIn(0) }
    ],
    notes: [
      { _id: 'demo-note-1', title: 'Social Learning Theory', course: 'Psychology 204', content: 'Albert Bandura developed social learning theory, emphasizing that people learn by observing others. Learning can occur without a change in behavior. Key processes include attention, retention, reproduction, and motivation. The Bobo doll experiments demonstrated observational learning in children. Reciprocal determinism describes the interaction of personal factors, behavior, and environment. Self-efficacy is a person’s belief in their capacity to perform a behavior and influences persistence.', summary: '', createdAt: dateIn(-4), updatedAt: dateIn(-1) },
      { _id: 'demo-note-2', title: 'Cellular Respiration', course: 'Biology 110', content: 'Cellular respiration converts chemical energy in glucose into ATP. Glycolysis occurs in the cytoplasm and produces two pyruvate, two net ATP, and NADH per glucose. The citric acid cycle takes place in the mitochondrial matrix. The electron transport chain uses electrons to pump protons across the inner mitochondrial membrane. ATP synthase uses the proton gradient to phosphorylate ADP. Oxygen is the final electron acceptor in aerobic respiration.', summary: '', createdAt: dateIn(-6), updatedAt: dateIn(-2) },
      { _id: 'demo-note-3', title: 'Fundamental Theorem of Calculus', course: 'Calculus II', content: 'The Fundamental Theorem of Calculus links differentiation and integration. If F(x) is the integral from a to x of a continuous function f(t), then F prime of x equals f(x). If F is an antiderivative of f on [a,b], then the integral from a to b of f(x) dx equals F(b) minus F(a). For substitution, identify an inner function and its derivative, transform bounds for definite integrals, and evaluate the antiderivative at the new bounds.', summary: '', createdAt: dateIn(-8), updatedAt: dateIn(-3) }
    ],
    quizzes: [],
    user: DEMO_USER
  };
}

function readData() {
  try { const data = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (data?.tasks && data?.notes && data?.quizzes) return data; } catch { /* create fresh demo data */ }
  const data = initialData(); localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return data;
}
function writeData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function jsonBody(body) { try { return body ? JSON.parse(body) : {}; } catch { return {}; } }
function safeQuiz(quiz) { return { ...quiz, questions: quiz.questions.map(({ prompt, options }) => ({ prompt, options })) }; }

const quizTemplates = {
  'demo-note-1': [
    { prompt: 'Which sequence names Bandura’s processes for observational learning?', options: ['Attention, retention, reproduction, motivation', 'Stimulus, response, reward, extinction', 'Encoding, storage, retrieval, rehearsal', 'Modeling, priming, shaping, transfer'], answerIndex: 0, explanation: 'Bandura described attention, retention, reproduction, and motivation.' },
    { prompt: 'What did the Bobo doll experiments demonstrate?', options: ['Classical conditioning in adults', 'Observational learning in children', 'Memory decay over time', 'The effect of sleep on recall'], answerIndex: 1, explanation: 'The experiments showed children can learn behaviors by observing a model.' },
    { prompt: 'What is reciprocal determinism?', options: ['A fixed sequence of developmental stages', 'A reward schedule for repeated behavior', 'Interaction among personal factors, behavior, and environment', 'A method for measuring short-term memory'], answerIndex: 2, explanation: 'These three factors influence one another.' },
    { prompt: 'Self-efficacy is a person’s belief in their ability to…', options: ['Remember every observed detail', 'Control other people’s behavior', 'Avoid learning from experience', 'Perform a particular behavior'], answerIndex: 3, explanation: 'Self-efficacy concerns confidence in carrying out a behavior.' },
    { prompt: 'Learning through observation can happen…', options: ['Only after a reward', 'Without an immediate change in behavior', 'Only in childhood', 'Only through direct instruction'], answerIndex: 1, explanation: 'Learning can occur even when behavior does not change immediately.' }
  ],
  'demo-note-2': [
    { prompt: 'Where does glycolysis take place?', options: ['Mitochondrial matrix', 'Cytoplasm', 'Inner mitochondrial membrane', 'Nucleus'], answerIndex: 1, explanation: 'Glycolysis occurs in the cytoplasm.' },
    { prompt: 'What is the main energy-carrying product made by cellular respiration?', options: ['DNA', 'Oxygen', 'ATP', 'Chlorophyll'], answerIndex: 2, explanation: 'Cellular respiration transfers energy into ATP.' },
    { prompt: 'What does ATP synthase use to make ATP?', options: ['A proton gradient', 'Glucose directly', 'Carbon dioxide', 'Light energy'], answerIndex: 0, explanation: 'The proton gradient powers ATP synthase.' },
    { prompt: 'What is the final electron acceptor in aerobic respiration?', options: ['Carbon dioxide', 'NADH', 'Glucose', 'Oxygen'], answerIndex: 3, explanation: 'Oxygen accepts electrons at the end of the chain.' },
    { prompt: 'Where is the electron transport chain located?', options: ['Cytoplasm', 'Inner mitochondrial membrane', 'Ribosome', 'Cell wall'], answerIndex: 1, explanation: 'The chain is embedded in the inner mitochondrial membrane.' }
  ],
  'demo-note-3': [
    { prompt: 'The Fundamental Theorem of Calculus connects which operations?', options: ['Differentiation and integration', 'Addition and multiplication', 'Limits and matrices', 'Probability and statistics'], answerIndex: 0, explanation: 'The theorem describes the inverse relationship between differentiation and integration.' },
    { prompt: 'If F(x) is the integral of f(t) from a to x, what is F′(x)?', options: ['The integral of f', 'f(x)', 'F(x) + f(x)', 'Zero'], answerIndex: 1, explanation: 'The derivative of the accumulated integral is the integrand.' },
    { prompt: 'If F is an antiderivative of f, the definite integral from a to b equals…', options: ['F(a) + F(b)', 'F(a) − F(b)', 'F(b) − F(a)', 'f(b) − f(a)'], answerIndex: 2, explanation: 'Evaluate the antiderivative at the upper bound and subtract its value at the lower bound.' },
    { prompt: 'For substitution, what should you look for?', options: ['A matrix inverse', 'A constant remainder', 'A graph intercept only', 'An inner function and its derivative'], answerIndex: 3, explanation: 'Substitution works by pairing an inner function with its derivative.' },
    { prompt: 'For a definite integral after substitution, what should happen to the bounds?', options: ['Transform them to the new variable', 'Always leave them unchanged', 'Set both equal to zero', 'Remove the bounds'], answerIndex: 0, explanation: 'Change the bounds to match the substituted variable.' }
  ]
};

export function demoUser() { return readData().user || DEMO_USER; }
export function demoRequest(path, options = {}) {
  const data = readData();
  const method = (options.method || 'GET').toUpperCase();
  const body = jsonBody(options.body);
  if (path === '/auth/me' && method === 'GET') return { user: data.user || DEMO_USER };
  if (path === '/auth/theme' && method === 'PATCH') { data.user = { ...(data.user || DEMO_USER), theme: body.theme }; writeData(data); return { theme: body.theme }; }
  if (path === '/dashboard' && method === 'GET') {
    const now = new Date(); const week = new Date(); week.setDate(week.getDate() + 7);
    const active = data.tasks.filter(task => task.status !== 'done').sort((a,b) => ({high:0,medium:1,low:2}[a.priority]-({high:0,medium:1,low:2}[b.priority]) || new Date(a.dueDate)-new Date(b.dueDate)));
    const completed = data.tasks.filter(task => task.status === 'done').length;
    return { stats: { total: data.tasks.length, completed, upcoming: data.tasks.filter(task => task.status !== 'done' && new Date(task.dueDate) >= now && new Date(task.dueDate) <= week).length, focusHours: Math.round(completed * 1.4 * 10) / 10 }, tasks: data.tasks, recommended: active[0] || null, reminders: [], activity: [{day:'Mon',count:1},{day:'Tue',count:0},{day:'Wed',count:2},{day:'Thu',count:1},{day:'Fri',count:0},{day:'Sat',count:0},{day:'Sun',count:0}], quizzes: data.quizzes.map(q => ({ id:q.id,title:q.title,course:q.course,score:q.score,completedAt:q.completedAt })) };
  }
  if (path === '/tasks' && method === 'GET') return data.tasks;
  if (path === '/tasks' && method === 'POST') { const task={...body,_id:`demo-task-${Date.now()}`,updatedAt:new Date().toISOString()};data.tasks.push(task);writeData(data);return task; }
  let match = path.match(/^\/tasks\/([^/]+)$/);
  if (match && method === 'PATCH') { const i=data.tasks.findIndex(t=>t._id===match[1]);if(i<0)throw new Error('Task not found.');data.tasks[i]={...data.tasks[i],...body,updatedAt:new Date().toISOString()};writeData(data);return data.tasks[i]; }
  if (match && method === 'DELETE') { data.tasks=data.tasks.filter(t=>t._id!==match[1]);writeData(data);return {ok:true}; }
  if (path === '/notes' && method === 'GET') return data.notes.slice().sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  if (path === '/notes' && method === 'POST') { const note={...body,_id:`demo-note-${Date.now()}`,summary:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};data.notes.push(note);writeData(data);return note; }
  if (path === '/notes/upload-pdf' && method === 'POST') throw new Error('PDF upload is disabled in offline demo mode. Use the sample notes to demonstrate summaries and quizzes.');
  match = path.match(/^\/notes\/([^/]+)$/);
  if (match && method === 'PATCH') { const i=data.notes.findIndex(n=>n._id===match[1]);if(i<0)throw new Error('Note not found.');data.notes[i]={...data.notes[i],...body,updatedAt:new Date().toISOString()};writeData(data);return data.notes[i]; }
  if (match && method === 'DELETE') { data.notes=data.notes.filter(n=>n._id!==match[1]);writeData(data);return {ok:true}; }
  match = path.match(/^\/ai\/summarize\/([^/]+)$/);
  if (match && method === 'POST') { const note=data.notes.find(n=>n._id===match[1]);if(!note)throw new Error('Note not found.');note.summary=`DEMO SUMMARY\n\n${note.content.split(/(?<=[.!?])\s+/).slice(0,3).join('\n\n')}\n\nThis sample summary is generated locally for presentation; connect an AI key for live summaries.`;note.updatedAt=new Date().toISOString();writeData(data);return {summary:note.summary}; }
  if (path === '/ai/quizzes' && method === 'POST') {
    let note=body.noteId?data.notes.find(n=>n._id===body.noteId):null;
    if(body.noteId&&!note)throw new Error('Note not found.');
    if(!note&&!String(body.topic||'').trim())throw new Error('Enter a topic or select a note.');
    const templates=quizTemplates[note?._id] || quizTemplates['demo-note-1'];
    const quiz={id:`demo-quiz-${Date.now()}`,title:`${note?.title||String(body.topic).slice(0,60)} — Sample Quiz`,course:note?.course||'General',dueAt:dateIn(1),score:null,completedAt:null,questions:templates.slice(0,body.count||5)};
    data.quizzes.unshift(quiz);writeData(data);return safeQuiz(quiz);
  }
  if (path === '/quizzes' && method === 'GET') return data.quizzes.map(q=>({...q,questions:q.questions.map(({prompt,options})=>({prompt,options}))}));
  match=path.match(/^\/quizzes\/([^/]+)$/);
  if(match&&method==='GET'){const quiz=data.quizzes.find(q=>q.id===match[1]);if(!quiz)throw new Error('Quiz not found.');return safeQuiz(quiz);}
  match=path.match(/^\/quizzes\/([^/]+)\/submit$/);
  if(match&&method==='POST'){const quiz=data.quizzes.find(q=>q.id===match[1]);if(!quiz)throw new Error('Quiz not found.');if(quiz.completedAt)throw new Error('This quiz has already been submitted.');if(!Array.isArray(body.answers)||body.answers.length!==quiz.questions.length)throw new Error('Submit one answer for each question.');let correct=0;const feedback=quiz.questions.map((q,i)=>{const right=body.answers[i]===q.answerIndex;if(right)correct++;return{correct:right,correctIndex:q.answerIndex,explanation:q.explanation};});quiz.score=Math.round(correct/quiz.questions.length*100);quiz.completedAt=new Date().toISOString();writeData(data);return{score:quiz.score,correct,total:quiz.questions.length,feedback};}
  throw new Error('This action is not available in offline demo mode.');
}
