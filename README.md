# TaskFlow — Project & Task Management App

A full-stack web app for managing projects and tasks with role-based access control (Admin/Member).

## Tech Stack
- **Frontend:** React 18, React Router v6, Axios, Vite → deployed on Vercel
- **Backend:** Node.js, Express, PostgreSQL → deployed on Render
- **Auth:** JWT tokens + bcrypt password hashing

## Features
- Signup/Login with role selection (Admin / Member)
- Role-Based Access: Admins create projects & manage teams; Members update their tasks
- Projects: create, invite members by email, manage
- Tasks: kanban board (To Do / In Progress / Done), priority, due dates, assignees
- Dashboard: stats, overdue alerts, recent activity

---

## 🌐 Deployment (Vercel + Render)

### Step 1 — Database (Neon — free PostgreSQL)
1. Go to https://neon.tech → create a free project
2. Copy the **Connection String**

### Step 2 — Backend on Render
1. New Web Service → connect your GitHub repo → Root: `backend`
2. Build: `npm install` | Start: `node server.js`
3. Environment variables:
   - `DATABASE_URL` = your Neon connection string
   - `JWT_SECRET` = any long secret string
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = (your Vercel URL — add after step 3)
4. Deploy → copy your Render URL

### Step 3 — Frontend on Vercel ⚠️
1. New Project → import repo → Root Directory: `frontend`
2. Add Environment Variable:
   - `VITE_API_URL` = `https://your-render-url.onrender.com/api`
3. Deploy

> **The `vercel.json` file fixes the 404 NOT_FOUND error.** Without it, Vercel doesn't know to serve index.html for React Router routes.

4. Go back to Render → set `FRONTEND_URL` = your Vercel URL → redeploy

---

## Local Development

```bash
# Backend
cd backend && npm install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET
npm run dev

# Frontend (new terminal)
cd frontend && npm install
# create .env with: VITE_API_URL=http://localhost:5000/api
npm run dev
```

## API Endpoints

### Auth
- `POST /api/auth/signup` — { name, email, password, role }
- `POST /api/auth/login` — { email, password }
- `GET  /api/auth/me`

### Projects
- `GET    /api/projects` — your projects
- `POST   /api/projects` — create project
- `GET    /api/projects/:id` — project + members
- `PUT    /api/projects/:id` — update (admin)
- `DELETE /api/projects/:id` — delete (admin)
- `POST   /api/projects/:id/members` — add member by email (admin)
- `DELETE /api/projects/:id/members/:userId` — remove member (admin)

### Tasks
- `GET    /api/projects/:id/tasks` — list with filters
- `POST   /api/projects/:id/tasks` — create task
- `PATCH  /api/projects/:id/tasks/:taskId` — update task
- `DELETE /api/projects/:id/tasks/:taskId` — delete (admin)

### Dashboard
- `GET /api/dashboard` — stats + overdue + recent tasks
