# Smart Schedule

Smart Schedule is a web-based timetable management system designed to simplify and automate academic timetable scheduling for colleges.

## 🌐 Live Demo

[**Smart Schedule**](https://bvcoewsmart-schedule.netlify.app/)

## ✨ Features

- Automatic timetable generation
- Teacher and classroom clash prevention
- Student, teacher, and admin dashboards
- Role-scoped timetable access (students see their own division; teachers see their assigned sessions)
- Timetable download as a PNG image or PDF
- Downloaded timetable files can be shared through WhatsApp or other apps
- Manual timetable modification
- Substitute teacher suggestions
- Notifications for timetable changes

## 🛠️ Tech Stack

- React.js
- Vite
- Node.js
- Express.js
- MongoDB

## ⚙️ Installation

### Configure the API

The frontend uses `http://localhost:5000/api` by default for local development.
For the live Netlify site, deploy the backend and set the Netlify environment
variable `VITE_API_URL` to the backend API base URL, including `/api`
(for example, `https://your-backend.example.com/api`). Set the backend
environment variable `CLIENT_ORIGIN` to
`https://bvcoewsmart-schedule.netlify.app`, plus any other frontend origins as
a comma-separated list. Redeploy the Netlify site after changing its variable.

The backend also requires a reachable MongoDB database and a secure
`JWT_SECRET`. In development, seed the sample data with `npm run seed` from
`backend`; this creates demo accounts with password `password123`. Never run
the demo seed against production. Bootstrap the first production admin using
the secure `create-admin` script described in `backend/README.md`. After that,
admins create student and teacher accounts and assign their division or
teacher profile from the admin dashboard. Public registration is disabled.
The demo shortcuts in the frontend open read-only sample timetables; real
account logins require the deployed API.

### 1. Clone the repository

```bash
git clone <repository-url>
cd smart-schedule
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Start the development server

```bash
npm run dev
```

The application will be available at the local development URL shown in the terminal.

## 📌 Project

Smart Schedule is developed as an academic project to provide an efficient and automated solution for college timetable management.
