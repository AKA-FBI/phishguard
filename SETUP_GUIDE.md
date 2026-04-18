# PhishGuard — Setup & Deployment Guide

## What This Is
PhishGuard is a web-based phishing simulation and awareness training platform for university students. It's built with React (frontend), Node.js/Express (backend), and Supabase (database + auth). This guide walks you through setting up everything from scratch.

---

## Prerequisites
Before you start, make sure you have:
- **Node.js** v18 or later installed ([download here](https://nodejs.org))
- **npm** (comes with Node.js)
- **Git** installed
- A **Supabase** account (free tier is fine — [sign up here](https://supabase.com))
- A code editor like **VS Code**

---

## Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com) and sign in
2. Click **"New Project"**
3. Give it a name like `phishguard`
4. Set a strong database password (save this somewhere — you won't need it often but don't lose it)
5. Choose the **closest region** to Nigeria (e.g., West EU or any available)
6. Wait for the project to finish provisioning (takes about 2 minutes)

### Get Your API Keys
Once the project is ready:
1. Go to **Settings → API** in the Supabase dashboard
2. Copy these three values (you'll need them shortly):
   - **Project URL** — looks like `https://abcdefghijkl.supabase.co`
   - **anon (public) key** — a long string starting with `eyJ...`
   - **service_role key** — another long string (⚠️ keep this secret, never put it in frontend code)

---

## Step 2: Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Open the file `database/schema.sql` from this project
4. Copy the entire contents and paste it into the SQL Editor
5. Click **"Run"** — you should see "Success" messages
6. Now open `database/seed.sql`
7. Copy and paste it into a new SQL query
8. Click **"Run"** — this creates all the phishing scenarios and training content

### Verify It Worked
Go to **Table Editor** in Supabase. You should see these tables:
- `profiles` (empty — users will appear when people register)
- `groups` (3 rows: Text-Based, Video-Based, Interactive)
- `training_modules` (3 rows, one per group)
- `phishing_scenarios` (20 rows — 10 for pre-assessment, 10 for post-assessment)
- `interaction_logs` (empty)
- `assessment_results` (empty)
- `user_progress` (empty)

---

## Step 3: Set Up the Backend

Open a terminal and navigate to the `server/` folder:

```bash
cd phishguard/server
```

### Install Dependencies
```bash
npm install
```

### Create Your .env File
```bash
cp .env.example .env
```

Now open `.env` in your code editor and fill in the values:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
PORT=4000
CLIENT_URL=http://localhost:5173
```

Replace the placeholder values with the real ones from Step 1.

### Start the Backend
```bash
npm run dev
```

You should see: `PhishGuard server running on port 4000`

Test it by opening `http://localhost:4000/api/health` in your browser. You should see:
```json
{"status":"ok","timestamp":"..."}
```

---

## Step 4: Set Up the Frontend

Open a **new terminal** (keep the backend running) and navigate to the `client/` folder:

```bash
cd phishguard/client
```

### Install Dependencies
```bash
npm install
```

### Create Your .env File
```bash
cp .env.example .env
```

The default value (`VITE_API_URL=http://localhost:4000/api`) should work for local development. If you've changed the backend port, update it here.

### Start the Frontend
```bash
npm run dev
```

You should see something like:
```
  VITE v5.x.x  ready in 500ms

  ➜  Local:   http://localhost:5173/
```

Open `http://localhost:5173` in your browser. You should see the PhishGuard login page.

---

## Step 5: Create an Admin Account

The first user you register through the platform will be a regular student. To create an admin account:

1. Register a new account through the platform at `http://localhost:5173/register`
2. Go to your Supabase dashboard → **Table Editor** → `profiles`
3. Find the row for the account you just created
4. Change the `role` field from `student` to `admin`
5. Save the change

Now log in with that account. You'll see an "Admin" button in the navigation bar.

---

## Step 6: Test the Full Flow

### As a Student:
1. Register a new account (use a different email from the admin account)
2. You'll be auto-assigned to one of the three groups
3. Complete the Pre-Training Assessment (10 emails)
4. Complete the Training Module (depends on your group)
5. Complete the Post-Training Assessment (10 emails)
6. View your Results page

### As an Admin:
1. Log in with the admin account
2. Go to the Admin dashboard
3. Check the Overview tab — you should see the student's data
4. Check the Participation tab — the student should show all checkmarks
5. Try the Export tab — download the CSV

---

## Step 7: Deploy to Production

### Deploy the Frontend to Vercel

1. Push your code to a GitHub repository
2. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub
3. Click **"Import Project"** and select your repo
4. Set the **Root Directory** to `client`
5. Vercel will auto-detect it's a Vite project
6. Add environment variable: `VITE_API_URL` = your backend URL (from Render, see below)
7. Deploy

### Deploy the Backend to Render

1. Go to [https://render.com](https://render.com) and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Set **Root Directory** to `server`
5. Set **Build Command** to `npm install`
6. Set **Start Command** to `node index.js`
7. Add all environment variables from your `.env` file:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PORT` = `4000`
   - `CLIENT_URL` = your Vercel URL (e.g., `https://phishguard.vercel.app`)
8. Deploy

### Update CORS
After deployment, update the `CLIENT_URL` environment variable on Render to match your actual Vercel URL, so CORS allows the frontend to talk to the backend.

### Update Frontend API URL
In Vercel's environment variables, set `VITE_API_URL` to your Render backend URL + `/api` (e.g., `https://phishguard-api.onrender.com/api`). Redeploy the frontend.

---

## Step 8: Prepare Video Content (Group B)

The video training module currently has placeholder URLs. To make it work:

1. Record 4 short screen-capture videos (2-4 minutes each) covering:
   - What is phishing?
   - Psychology of phishing attacks
   - How to spot red flags
   - What to do when you suspect phishing
2. Upload them to YouTube as **unlisted** videos (or use any video hosting)
3. Update the URLs in the `training_modules` table in Supabase:
   - Go to Table Editor → `training_modules`
   - Find the row where `content_type` = `video`
   - Edit the `content_body` JSON to replace the placeholder URLs with real ones

---

## Project Structure

```
phishguard/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── Layout.jsx     # Navigation and page wrapper
│   │   │   └── EmailPreview.jsx # Simulated email renderer
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Authentication state management
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── AssessmentPage.jsx
│   │   │   ├── TrainingPage.jsx
│   │   │   ├── ResultsPage.jsx
│   │   │   └── AdminPage.jsx
│   │   ├── utils/
│   │   │   └── api.js         # API client utility
│   │   ├── main.jsx           # App entry point with routing
│   │   └── index.css          # Tailwind CSS imports
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.example
│
├── server/                    # Node.js/Express backend
│   ├── routes/
│   │   ├── auth.js            # Registration, login, profile
│   │   ├── training.js        # Training module delivery
│   │   ├── simulation.js      # Phishing scenario delivery
│   │   ├── logs.js            # Interaction logging & results
│   │   └── admin.js           # Dashboard, participation, export
│   ├── middleware/
│   │   └── auth.js            # JWT verification & role checking
│   ├── utils/
│   │   └── supabase.js        # Supabase client setup
│   ├── index.js               # Express server entry point
│   ├── package.json
│   └── .env.example
│
└── database/
    ├── schema.sql             # Full database schema with RLS
    └── seed.sql               # Phishing scenarios & training content
```

---

## Troubleshooting

**"Invalid API key" errors**: Double-check that your `.env` files have the correct Supabase keys with no extra spaces or line breaks.

**CORS errors in browser**: Make sure `CLIENT_URL` in the backend `.env` matches exactly the URL your frontend is running on (including `http://` or `https://`).

**Registration fails with "User already registered"**: Each email and matric number must be unique. Use a different email/matric for each test account.

**Scenarios don't load**: Make sure you ran `seed.sql` after `schema.sql` in the Supabase SQL Editor.

**Admin dashboard shows no data**: At least one student needs to complete both assessments before the dashboard will show anything.

---

## Making an Admin Account for the Student Researcher

The simplest way: register normally, then in Supabase Table Editor, change that user's `role` from `student` to `admin`. This account will then see the Admin button and have access to the dashboard, participation tracking, and data export features.
