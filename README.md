# TaskFlow — Project & Task Management App

A full-stack web app for managing projects and tasks with role-based access control (Admin/Member).

---

## 🌐 Live Project

🔹 Frontend (Vercel):  
https://task-flow-5j9k-g7m1rlbf5-vanshika-selfs-projects.vercel.app  

🔹 Backend (Render API):  
https://taskflow-itsn.onrender.com  

---

## Tech Stack
- **Frontend:** React 18, React Router v6, Axios, Vite → deployed on Vercel
- **Backend:** Node.js, Express, PostgreSQL → deployed on Render
- **Auth:** JWT tokens + bcrypt password hashing

---

## Features
- Signup/Login with role selection (Admin / Member)
- Role-Based Access: Admins create projects & manage teams; Members update their tasks
- Projects: create, invite members by email, manage
- Tasks: kanban board (To Do / In Progress / Done), priority, due dates, assignees
- Dashboard: stats, overdue alerts, recent activity

---

## 🚀 Deployment (Vercel + Render)

### Step 1 — Database (Neon — free PostgreSQL)
1. Go to https://neon.tech → create a free project
2. Copy the **Connection String**

---

### Step 2 — Backend on Render
1. New Web Service → connect GitHub repo → Root: `backend`
2. Build: `npm install` | Start: `node server.js`
3. Environment variables:
   - `DATABASE_URL` = Neon connection string
   - `JWT_SECRET` = any long secret string
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = your Vercel URL
4. Deploy → copy Render URL

---

### Step 3 — Frontend on Vercel
1. New Project → import repo → Root Directory: `frontend`
2. Add Environment Variable:
   - `VITE_API_URL` = `https://your-render-url.onrender.com/api`
3. Deploy

> The `vercel.json` file fixes routing issues in React apps.

4. Go back to Render → set `FRONTEND_URL` → redeploy backend

---

## 💻 Local Development

```bash
# Backend
cd backend && npm install
cp .env.example .env
npm run dev

# Frontend
cd frontend && npm install
# .env: VITE_API_URL=http://localhost:5000/api
npm run dev