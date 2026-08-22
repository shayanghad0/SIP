# 🎓 School Intelligence Platform (SIP)

> **Smart School Management, Analysis and Prediction System**
>
> An educational decision-making system that solves real school problems with **algorithms** - not just an attendance and grading system.
> Khwarazmi Festival competition project - Enterprise-level engineering structure.

---

## 📖 Introduction

SIP calculates a **Risk Score** from 0 to 100 for **each student** by analyzing academic data (grades, attendance, homework, behavior) and mental health (weekly 8-question form). It detects academic decline **before the report card**, **predicts** the next exam score, generates **personalized study plans**, and automatically notifies consultants, administrators, and parents about alerts.

## 👥 Roles and Dashboards

| Role | Key Features |
|---|---|
| 👨 Admin | Overall statistics, grade×lesson heatmaps, high-risk students/teachers, cheating detection, system health, settings |
| 👨 Teacher | Classes, attendance, homework, exams and grades, behavioral reports, student smart reports |
| 👩💼 Consultant | High-risk students + reasons, mental health forms, timeline, note taking, AI suggestions |
| 👨👧 Parent | Child's progress, attendance, homework, alerts, weekly smart reports, best study time, sleep recommendations |
| 👨🎓 Student | Grades + predictions, homework, weekly study plans, mental health forms, achievements, academic guidance |

---

## 🛠 Technologies (Limited to Allowed)

- **Frontend:** React + Vite + TypeScript (strict)
- **Backend:** Node.js + Express + TypeScript (REST contract - in this demo build, the same contract is served by an in-browser adapter on the JSON Database Manager layer so the application can run as a single static file)
- **Database:** **JSON files only** - no MySQL/PostgreSQL/SQLite/MongoDB/Firebase/Supabase/Prisma/ORM/Redis
- **Styling:** TailwindCSS (chosen)
- **Icons:** lucide-react | **Charts:** Recharts | **Notifications:** react-hot-toast
- **Forms:** react-hook-form | **Routing:** React Router (URL path routing)

## 🚀 Setup (Installation)

```bash
# Install dependencies
npm install

# Development run
npm run dev

# Production build
npm run build        # Output in dist/
npm run preview      # Preview build
```

**First Run:** Since `database/admin.json` is empty, the system will automatically redirect you to **`/install`**. No one can log in before installation.

### URL Paths

| Path | Description |
|---|---|
| `/install` | 8-step installation wizard (only until admin is created) |
| `/login` | Login with username + password + **access code** (auto role detection) |
| `/dashboard/:section` | Role dashboard with subsections (overview, students, alerts, ...) |
| `/forbidden`, `/error`, 404 | Error pages |

---

## 🏗 Architecture

```
┌────────────────────────── React (Vite/TS) ──────────────────────────┐
│  Pages (Install/Login/Admin/Teacher/Consultant/Parent/Student)      │
│  Components (UI kit, Layout, Charts)      Hooks (Session context)   │
├─────────────────────────────────────────────────────────────────────┤
│  Service Layer  (src/lib/api.ts)  ← Unified REST contract           │
│  • Authentication (JWT/HS256 + SHA-256 + Access Code)                  │
│  • Role permissions - each page only reads its own role data          │
├─────────────────────────────────────────────────────────────────────┤
│  AI Engines (src/lib/ai.ts) - Pure and deterministic calculations    │
│  Risk • Wellness • Prediction • Planner • Teacher • Cheating • Guidance│
├─────────────────────────────────────────────────────────────────────┤
│  JSON Database Manager (src/lib/db.ts)                             │
│  atomic write • backup×5 • validation • auto-ID • lock • recovery   │
├─────────────────────────────────────────────────────────────────────┤
│  database/*.json  (9 files - the only persistence layer)              │
└─────────────────────────────────────────────────────────────────────┘
```

### Folder Structure

```
School-Intelligence-Platform/
├── index.html                  # RTL + Vazirmatn
├── database/                   # The only data layer (9 allowed files)
│   ├── admin.json  teachers.json  students.json  parents.json
│   ├── consultants.json  grades.json  books.json
│   ├── notes.json  ai-analysis.json
├── src/
│   ├── App.tsx                 # Routing + guards + ErrorBoundary
│   ├── lib/
│   │   ├── db.ts               # JSON Database Manager
│   │   ├── auth.ts             # SHA-256 / JWT-HS256 / Access Code
│   │   ├── ai.ts               # All smart algorithms
│   │   ├── api.ts              # Service layer (REST contract + install + demo data)
│   │   ├── session.tsx         # Authentication context
│   │   ├── types.ts            # Domain models (mirror of file schemas)
│   │   └── format.ts           # Persian formatting (numbers, dates, weeks)
│   ├── components/             # ui.tsx (UI kit) + layout.tsx (AppShell)
│   └── pages/                  # Install, Login, Admin, Teacher, Consultant, Parent, Student, Errors, shared
└── README.md
```

### JSON Database Manager Features

- **Atomic write:** Write to temporary key → move → cleanup (no half-write remains)
- **Backup:** 5 versions before each rewrite
- **Validation:** Validator for each file before commit
- **Auto-ID:** Unique IDs without repetition (`nextId`)
- **File Locking:** Technical lock (re-entrancy guard)
- **Error Recovery:** Corrupted file → automatic restore from last backup

---

## 💾 Database Structure

| File | Collections |
|---|---|
| `admin.json` | `admins[]` |
| `teachers.json` | `teachers[]` (with `assignments[]: lessonId, gradeId, classId`) |
| `students.json` | `students[]` (with `parentUserId`), `attendance[]`, `homeworks[]`, `homeworkSubmissions[]`, `behaviorReports[]` |
| `parents.json` | `parents[]` (with `studentId`) |
| `consultants.json` | `consultants[]` |
| `grades.json` | `grades[]`, `classes[]`, `exams[]`, `examScores[]` |
| `books.json` | `lessons[]` (with `importance: 3..10`) |
| `notes.json` | `notes[]`, `wellnessForms[]`, `alerts[]`, `activity[]` |
| `ai-analysis.json` | `analyses[]`, `studyPlans[]`, `teacherAnalytics[]`, `cheatingFlags[]`, `guidance{}` |

**Relationships:** student→class→grade, student→parent, teacher→lesson+class, exam→lesson+class, examScore→exam+student.

---

## 🧠 Smart Algorithms

### 1. Early Warning (Risk Score 0-100)
Weighted average of 7 factors (each factor 0 to 100 = problem severity):

| Factor | Weight | Data Source |
|---|---|---|
| Average grades | 25% | `examScores` |
| Absence | 20% | `attendance` |
| Homework | 15% | `homeworkSubmissions` |
| Mental health | 15% | `wellnessForms` |
| Trend (regression slope) | 10% | Average of exam series |
| Behavior | 10% | `behaviorReports` |
| Late arrival | 5% | `attendance(late)` |

Thresholds: `≥75` Critical (automatic alert to consultant/admin/parents) — `50..74` High — `25..49` Medium — `<25` Low.
Each execution also generates `reasons` and `recommendations`.

### 2. Mental Health Analysis
Weekly 8-question form (1 to 5) → `stress`, `anxiety` (pressure + stress), `motivation` (motivation + focus), `sleep` and `overall` indices. Dropout risk probability:
`0.45·risk + 0.25·stress + 0.2·(100-attendance) + 0.1·(100-motivation)`.

### 3. Grade Prediction Engine
- Linear regression (least-squares) on each lesson's grade series → **next exam prediction**
- **Pass probability:** Logistic function `1/(1+e^(-0.62·(avg-10)))` (50% at grade 10)
- **Decline probability:** Combination of negative slope + distance from pass line
- **Term average prediction:** `avg + 1.5·slope`
- **Confidence percentage:** Function of number of exams and residual deviation

### 4. Teacher Analysis
`efficiency = 0.4·(class average) + 0.3·(trend progress) + 0.3·(homework completion)` along with **exam difficulty index** `(1-avg/20)` and trend comparison.

### 5. School Analysis
Average by grades/classes/lessons, grade×lesson heatmaps, at-risk lessons, top students, attendance trends and teacher efficiency comparison.

### 6. Cheating Detection (Anomaly Detection)
- **Simultaneous jump:** If two students both score more than 4 points above their past average and their scores differ by ≤1 → "copy answers" flag
- **Identical pattern:** Pearson correlation between two classmates' lesson average vectors `>0.975` with average difference `<0.6`

### 7. Smart Study Plan
Each lesson's need: `importance × (1 - avg/20)` → divide 780 weekly minutes by 5 days (max 180 minutes/day, 15+ minute blocks) with block type (test/study/review) and monthly goals.

### 8. Academic Guidance
Profile clustering on 4 field families (Math-Physics / Experimental / Humanities-Literature / Arts-Technology) with match percentage and reasoning.

### 9. Parent Insights
Best study time (based on motivation/focus), sleep recommendations (based on stress index), weak points, family activities and **weekly text report** generation.

---

## 🔌 API Documentation (Service Layer Contract)

All operations from `src/lib/api.ts` - in Node/Express server, the same signatures are implemented as REST endpoints:

| Group | Operations |
|---|---|
| Session | `bootstrap()`, `login(u,p,code)`, `logout()` |
| Install | `install(payload)` → generate access codes + optional `seedDemo()` |
| Admin | `adminOverview()`, `studentsList()`, `studentReport(id)`, `teachersList()`, `parentsList()`, `consultantsList()`, `schoolAnalyticsFull()`, `alertsList()`, `markAlertRead(id)`, `addGrade/addClass/addLesson`, `loadDemoData()`, `systemReset()`, `healthDetail()` |
| Teacher | `teacherHome(id)`, `saveAttendance(classId,date,marks)`, `addHomework(...)`, `toggleHomework(...)`, `addExam(...)`, `saveExamScores(examId,scores)`, `addBehavior(...)` |
| Consultant | `consultantHome()`, `timeline(studentId)`, `addConsultantNote(...)` |
| Parent | `parentHome(parentId)` |
| Student | `studentHome(id)`, `submitWellness(answers)`, `submitHomework(id)` |

**Security:** SHA-256 + Salt hash for passwords, HS256 signed tokens with expiration (12 hours), 12-character access code for each role, input validation in all forms (react-hook-form + domain rules), data isolation by role (parent only sees their child, etc.).

---

## 🚀 Deployment Guide

1. `npm run build` → serve `dist/` on any static server (Nginx/Netlify/...)
2. For server version: Implement the `src/lib/api.ts` contract on Express; place `database/*.json` files in `DATABASE_DIR` path and have JSON Manager run the same atomic/backup/lock logic on `fs` (study `db.ts`).
3. Enable `DATABASE_DIR` + rate limiting and Helmet in Express middlewares.

## 🔭 Future Improvements

- Time series models (ARIMA/Prophet) for more accurate predictions and BERT for note text analysis
- Inter-class correlation and clustering of same-risk students
- PWA + push notifications for parents, signed cloud backup, and printable PDF consultation reports
- Multi-school panel (Multi-tenant) with complete file isolation

## 👨 Developer Guide

- **Strict TS:** strict mode, no `any`, no magic numbers (constants in `ai.ts` with meaningful names), no `console.log` in production path
- **Quick manual test:** Install → check "demo data" → login with any role
- **Rules:** All algorithms in `ai.ts` are pure and side-effect free - to add a new risk factor, just add a `RiskFactor` with a named weight to `RISK_WEIGHTS` and `factors[]`; alerts, charts and recommendations will automatically engage with it.
