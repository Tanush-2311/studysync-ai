# StudySync AI — Project Guide

This file explains the project, its features, setup requirements, how to run it from VS Code on Windows, and how the main parts fit together. The entire application lives in this one project folder.

## 1. Project overview

StudySync AI is a full-stack college study planner. Students can plan deadlines, keep class notes, save text-based PDFs, turn study material into summaries and practice quizzes, and see their progress. The application can run against a MongoDB database or in a browser-only demo mode for presentations.

### Technology

- **Frontend:** React, Vite, Tailwind CSS, Recharts, Lucide icons
- **Backend:** Node.js, Express
- **Database:** MongoDB with Mongoose
- **Security and validation:** password hashing with bcrypt, JWT authentication, Helmet, API rate limiting, Zod request validation, authenticated user-scoped queries
- **AI:** OpenAI-compatible chat-completions API called by the Express server

## 2. Folder map

```text
study sync/
├── client/                 React/Vite frontend
│   └── src/                App, styles, API client, browser demo data
├── server/                 Express API and Mongoose models
│   └── src/                Routes, middleware, seed script, tests
├── PROJECT_GUIDE.md        This project and setup guide
├── README.md               Short project entry point
├── package.json            Root workspace commands
└── package-lock.json       Locked dependency versions
```

Dependencies in `node_modules/` and generated frontend files in `client/dist/` are created locally. They are not source files and should not be committed.

## 3. Features

### Accounts and saved work

- Register and sign in with an email and password.
- Passwords are stored as bcrypt hashes; the API returns a signed JWT for authenticated requests.
- Tasks, notes, quizzes, and theme preference belong to the signed-in account.
- API input is validated and protected by security middleware and rate limits.

### Tasks and deadlines

- Add, edit, complete, and delete assignments, exams, and study sessions.
- Set course, due date, priority, status, and optional notes.
- Filter tasks and sort by priority and deadline.
- The overview recommends a next task and shows upcoming work and summary statistics.

### Study notes, PDFs, and AI

- Create, edit, view, and delete study notes.
- Upload and save text-based PDFs as notes. The server extracts their text for study tools and retains the original PDF for download.
- Current PDF limits: 8 MB and 150 pages. Scanned/image-only PDF OCR is not included.
- Request an AI summary for a note. AI credentials stay on the server and are never sent to the browser.
- Without a configured AI key, live AI endpoints cannot generate output.

### Quizzes and reminders

- Generate multiple-choice quizzes from a saved note or a topic.
- Correct answers and explanations stay server-side while the quiz is in progress. The API calculates the score after submission.
- View past quizzes, completion status, and average score.
- Upcoming quiz reminders appear through the in-app notification bell and dashboard reminder count.

### Dashboard and appearance

- Dashboard statistics, activity chart, weekly progress, deadlines, and recommended next task.
- Light and dark appearance modes.
- Responsive layout for narrower screens.
- Study shortcuts, course-filter controls, and links to OpenStax, Khan Academy, and MDN Web Docs.
- Color theme based on the supplied palette: midnight navy, indigo, teal (`#2D7495`), and soft citron yellow.

### Browser-only presentation demo

Choose **Try interactive demo** on the sign-in screen. This mode uses sample tasks and notes stored in that browser's local storage, and can demonstrate task/notes editing and quiz scoring without MongoDB or an API server. Summaries and generated quiz content in this mode are sample outputs, not live AI. PDF upload requires the real backend. Sign out of demo mode to return to the regular sign-in screen.

## 4. Requirements

- VS Code
- Node.js 22 or newer recommended (the PDF text extraction dependency may require a recent Node version)
- npm (included with Node.js)
- For persistent data: local MongoDB or a MongoDB Atlas cluster
- Optional for live summaries and quiz generation: an API key for an OpenAI-compatible chat-completions service

## 5. Run the UI demo (no database required)

In VS Code, open the `study sync` folder. Choose **Terminal → New Terminal**, then run:

```powershell
npm install
npm run dev -w client
```

Open the local URL printed by Vite, normally `http://localhost:5173`, and click **Try interactive demo**. Keep the terminal open while presenting. Stop the dev server with **Ctrl+C**.

## 6. Configure MongoDB, API, and AI

### Create the local environment file

From the VS Code PowerShell terminal at the project root:

```powershell
Copy-Item .\server\.env.example .\server\.env
code .\server\.env
```

Edit `server/.env` locally. Do not paste credentials into chat or commit this file. The example contains the variable names and local defaults:

```dotenv
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/studysync
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_ORIGIN=http://localhost:5173
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=
AI_MODEL=gpt-4o-mini
```

Use either a local MongoDB URI or an Atlas connection URI for `MONGODB_URI`. Do not type `MONGODB_URI=...` as a PowerShell command; these lines belong inside `server/.env`.

### MongoDB Atlas checklist

1. In Atlas, create a database user and set its password.
2. Under **Network Access**, allow your current IP address for development.
3. Copy the Node.js connection URI and replace its password placeholder. URL-encode special characters in the password.
4. Add the database name, for example `/studysync`, before any query string if it is not already present.
5. Save the complete URI in `server/.env` as `MONGODB_URI=...`.

If your IP changes (for example when switching Wi-Fi or using a mobile hotspot), Atlas may need the new IP added. Avoid allowing access from every IP except as a temporary deliberate choice.

### Optional AI setup

Set `AI_API_KEY` in `server/.env` for the OpenAI-compatible API configured by `AI_API_URL` and `AI_MODEL`. Keep the key on the server. Do not put it in a `VITE_*` variable, since frontend variables are visible to users. Restart the backend after editing the file.

## 7. Seed data and start both services

At the project root, install dependencies and seed the database:

```powershell
npm install
npm run seed
npm run dev
```

The seed script creates a sample account and sample tasks, notes, and one quiz:

- Email: `demo@studysync.edu`
- Password: `StudySync123!`

The seed script replaces the seeded account's existing tasks, notes, and quizzes each time it runs. Do not run it against real user data. It does not replace the seeded account if it already exists, including its password.

Vite normally runs at `http://localhost:5173`; Express listens on port `4000`. Leave both terminal processes running. The root `npm run dev` command starts them together.

## 8. Commands

Run these from the project root:

| Command | Purpose |
| --- | --- |
| `npm install` | Install workspace dependencies |
| `npm run dev` | Start the Express API and Vite frontend |
| `npm run dev -w client` | Start only the frontend (useful for demo mode) |
| `npm run seed` | Load or reset sample records in MongoDB |
| `npm run build` | Create a production frontend build in `client/dist/` |
| `npm test` | Run server and client automated tests |

## 9. API map

API routes are under `/api`. The main route groups are:

- `/api/auth` — registration, login, current user, appearance preference
- `/api/tasks` — task CRUD
- `/api/notes` — notes CRUD, PDF upload/download
- `/api/ai/summarize/:noteId` — note summary generation
- `/api/ai/quizzes` — quiz generation from a note or topic
- `/api/quizzes` — quiz list, retrieval, and secure answer submission
- `/api/dashboard` — statistics, recommended task, and upcoming reminders

The browser sends requests to the Express API; it never connects directly to MongoDB.

## 10. Troubleshooting

- **`ECONNREFUSED 127.0.0.1:27017`:** local MongoDB is not running. Start its service, or switch `MONGODB_URI` to your Atlas URI.
- **Atlas IP / server-selection error:** add your current public IP under Atlas Network Access; check that the cluster is running and the URI/database-user password are correct.
- **Atlas TLS or certificate error:** check the system clock, Node.js version, and whether the current network/firewall allows Atlas traffic. Try a different trusted network if the network blocks database ports.
- **Port 4000 or 5173 is busy:** stop the other process using it, then restart the project.
- **Frontend opens but sign-in fails:** confirm the API terminal says it is listening on port 4000, and check the API log for a MongoDB connection error.
- **AI actions say setup is required:** add a valid `AI_API_KEY` to `server/.env` and restart the API.
- **PDF upload fails:** use a text-based PDF within the 8 MB / 150-page limits; scanned PDFs are not OCR-processed.
- **The demo has different data:** demo data is local to the browser profile and stored in local storage; it is separate from MongoDB.

## 11. Deployment notes

Deploy the `server` as a Node.js service and the `client` as a static Vite site. Set the server's `MONGODB_URI`, a new strong `JWT_SECRET`, `CLIENT_ORIGIN`, and optional AI settings in the hosting provider's secret/environment settings. Set the frontend `VITE_API_URL` to the deployed API origin when frontend and API are on separate origins. Configure CORS for the exact deployed frontend URL and use HTTPS. Never use development credentials in production.

## 12. Security reminder

Never commit `server/.env`, database passwords, JWT secrets, or AI API keys. The repository ignore rules exclude environment files. A database password or signing secret that has been shared or exposed should be rotated, then updated in the local environment file and deployment secret store.
