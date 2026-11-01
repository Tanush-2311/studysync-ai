# StudySync AI

StudySync AI is a college study planner and learning workspace built as a two-person full-stack project. It combines a React/Vite interface, an Express API, MongoDB/Mongoose persistence, and server-side AI helpers.

## Start here

Read [PROJECT_GUIDE.md](PROJECT_GUIDE.md) for the project explanation, folder map, features, database and AI setup, Windows PowerShell steps, demo mode, deployment notes, and troubleshooting.

## Quick start

- **Show the UI without a database:** run `npm run dev -w client`, open `http://localhost:5173`, then choose **Try interactive demo**.
- **Run with the database/API:** create `server/.env` from `server/.env.example`, configure MongoDB Atlas or local MongoDB, then run `npm install`, `npm run seed`, and `npm run dev` from this project folder.
- **Share the sample demo:** a GitHub Pages workflow publishes the frontend from `main`. Set the repository's Pages source to **GitHub Actions** under **Settings → Pages**.

Never commit `.env` files. Use the guide's setup section to configure credentials safely.
