# 🎓 School Intelligence Platform (SIP)

> **سامانه هوشمند مدیریت، تحلیل و پیش‌بینی وضعیت دانش‌آموز**
>
> یک سامانه تصمیم‌یار آموزشی که مشکلات واقعی مدارس را با **الگوریتم** حل می‌کند؛ نه صرفاً یک سیستم حضور و غیاب و ثبت نمره.
> پروژه‌ی مسابقه‌ی **جشنواره خوارزمی** — ساختار مهندسی سطح سازمانی (Enterprise).

---

## 📖 معرفی

SIP با تحلیل داده‌های تحصیلی (نمرات، حضور، تکالیف، رفتار) و سلامت روان (فرم هفتگی ۸ سؤالی) برای **هر دانش‌آموز** یک **Risk Score** از ۰ تا ۱۰۰ محاسبه می‌کند، افت تحصیلی را **قبل از کارنامه** تشخیص می‌دهد، نمره‌ی آزمون بعدی را **پیش‌بینی** می‌کند، **برنامه مطالعاتی شخصی** تولید می‌کند و به‌طور خودکار مشاور، مدیر و والدین را در جریان هشدارها قرار می‌دهد.

## 👥 نقش‌ها و داشبوردها

| نقش | امکانات کلیدی |
|---|---|
| 👨‍ مدیر | آمار کل، نمادهارت پایه×درس، دانش‌آموزان/دبیران پرخطر، تشخیص تقلب، سلامت سیستم، تنظیمات |
| 👨‍ دبیر | کلاس‌ها، حضور و غیاب، تکالیف، آزمون و نمرات، گزارش رفتاری، گزارش هوشمند دانش‌آموز |
| 👩‍💼 مشاور | دانش‌آموزان پرخطر + دلایل، فرم‌های سلامت روان، تایم‌لاین، ثبت یادداشت، پیشنهادهای AI |
| 👨‍‍👧 والدین | پیشرفت فرزند، حضور، تکالیف، هشدارها، گزارش هفتگی هوشمند، بهترین زمان مطالعه، توصیه خواب |
| 👨‍🎓 دانش‌آموز | نمرات + پیش‌بینی، تکالیف، برنامه مطالعاتی هفتگی، فرم سلامت روان، دستاوردها، هدایت تحصیلی |

---

## 🛠 فناوری‌ها (محدود به موارد مجاز)

- **Frontend:** React + Vite + TypeScript (سخت‌گیرانه)
- **Backend:** Node.js + Express + TypeScript (قرارداد REST — در این بیلد نمایشی، همان قرارداد توسط آداپتور داخل‌مرورگر روی لایه‌ی JSON Database Manager سرو می‌شود تا اپلیکیشن به‌صورت یک فایل استاتیک قابل اجرا باشد)
- **پایگاه داده:** **فقط فایل‌های JSON** — بدون MySQL/PostgreSQL/SQLite/MongoDB/Firebase/Supabase/Prisma/ORM/Redis
- **Styling:** TailwindCSS (مورد انتخاب)
- **Icons:** lucide-react | **Charts:** Recharts | **Notifications:** react-hot-toast
- **Forms:** react-hook-form | **Routing:** React Router (مسیریابی با URL path)

## 🚀 راه‌اندازی (Installation)

```bash
# نصب وابستگی‌ها
npm install

# اجرای توسعه
npm run dev

# بیلد تولید
npm run build        # خروجی در dist/
npm run preview      # پیش‌نمایش بیلد
```

**اولین اجرا:** چون `database/admin.json` خالی است، سامانه شما را به‌طور خودکار به **`/install`** می‌برد. قبل از نصب هیچ‌کس نمی‌تواند وارد شود.

### مسیرهای URL

| مسیر | توضیح |
|---|---|
| `/install` | دستیار نصب ۸ مرحله‌ای (فقط تا قبل از ساخت مدیر) |
| `/login` | ورود با نام کاربری + رمز + **کد دسترسی** (تشخیص خودکار نقش) |
| `/dashboard/:section` | داشبورد هر نقش با زیربخش‌ها (overview, students, alerts, …) |
| `/forbidden` ، `/error` ، ۴۰ | صفحات خطا |

---

## 🏗 معماری (Architecture)

```
┌────────────────────────── React (Vite/TS) ──────────────────────────┐
│  Pages (Install/Login/Admin/Teacher/Consultant/Parent/Student)      │
│  Components (UI kit, Layout, Charts)      Hooks (Session context)   │
├─────────────────────────────────────────────────────────────────────┤
│  Service Layer  (src/lib/api.ts)  ← قرارداد REST یکپارچه           │
│  • احراز هویت (JWT/HS256 + SHA-256 + Access Code)                  │
│  • مجوز نقش‌ها — هر صفحه فقط داده‌های نقش خود را می‌خواند          │
├─────────────────────────────────────────────────────────────────────┤
│  AI Engines (src/lib/ai.ts) — محاسبات خالص و دترمینیستی            │
│  Risk • Wellness • Prediction • Planner • Teacher • Cheating • Guidance│
├─────────────────────────────────────────────────────────────────────┤
│  JSON Database Manager (src/lib/db.ts)                             │
│  atomic write • backup×5 • validation • auto-ID • lock • recovery   │
├─────────────────────────────────────────────────────────────────────┤
│  database/*.json  (۹ فایل — تنها لایه‌ی ماندگاری)                  │
└─────────────────────────────────────────────────────────────────────┘
```

### ساختار پوشه‌ها

```
School-Intelligence-Platform/
├── index.html                  # RTL + Vazirmatn
├── database/                   # تنها لایه‌ی داده (۹ فایل مجاز)
│   ├── admin.json  teachers.json  students.json  parents.json
│   ├── consultants.json  grades.json  books.json
│   ├── notes.json  ai-analysis.json
├── src/
│   ├── App.tsx                 # روتینگ + گاردها + ErrorBoundary
│   ├── lib/
│   │   ├── db.ts               # JSON Database Manager
│   │   ├── auth.ts             # SHA-256 / JWT-HS256 / Access Code
│   │   ├── ai.ts               # تمام الگوریتم‌های هوشمند
│   │   ├── api.ts              # سرویس‌لایر (قرارداد REST + نصب + داده نمونه)
│   │   ├── session.tsx         # بافت احراز هویت
│   │   ├── types.ts            # مدل‌های دامنه (آینه‌ی schema فایل‌ها)
│   │   └── format.ts           # فرمت فارسی (اعداد، تاریخ، هفته)
│   ├── components/             # ui.tsx (UI kit) + layout.tsx (AppShell)
│   └── pages/                  # Install, Login, Admin, Teacher, Consultant, Parent, Student, Errors, shared
└── README.md
```

### ویژگی‌های JSON Database Manager

- **Atomic write:** نگارش در کلید موقت → جابه‌جایی → پاک‌سازی (نیمه‌نگارش باقی نمی‌ماند)
- **پشتیبان‌گیری:** ۵ نسخه قبل از هر بازنویسی
- **اعتبارسنجی:** validator برای هر فایل پیش از commit
- **Auto-ID:** شناسه‌های یکتا بدون تکرار (`nextId`)
- **File Locking:** قفل تک‌نویس (re-entrancy guard)
- **بازیابی خطا:** فایل خراب → بازگردانی خودکار از آخرین backup

---

## 💾 ساختار پایگاه داده (Database Structure)

| فایل | کلکشن‌ها |
|---|---|
| `admin.json` | `admins[]` |
| `teachers.json` | `teachers[]` (با `assignments[]: lessonId, gradeId, classId`) |
| `students.json` | `students[]` (با `parentUserId`)، `attendance[]`، `homeworks[]`، `homeworkSubmissions[]`، `behaviorReports[]` |
| `parents.json` | `parents[]` (با `studentId`) |
| `consultants.json` | `consultants[]` |
| `grades.json` | `grades[]`، `classes[]`، `exams[]`، `examScores[]` |
| `books.json` | `lessons[]` (با `importance: 3..10`) |
| `notes.json` | `notes[]`، `wellnessForms[]`، `alerts[]`، `activity[]` |
| `ai-analysis.json` | `analyses[]`، `studyPlans[]`، `teacherAnalytics[]`، `cheatingFlags[]`، `guidance{}` |

**رابطه‌ها:** student→class→grade، student→parent، teacher→lesson+class، exam→lesson+class، examScore→exam+student.

---

## 🧠 الگوریتم‌های هوشمند (Algorithms)

### ۱. هشدار زودهنگام (Risk Score 0–100)
میانگین وزنی ۷ عامل (هر عامل ۰ تا ۱۰۰ = شدت مشکل):

| عامل | وزن | منبع داده |
|---|---|---|
| میانگین نمرات | ۲۵٪ | `examScores` |
| غیبت | ۲۰٪ | `attendance` |
| تکالیف | ۱۵٪ | `homeworkSubmissions` |
| سلامت روان | ۱۵٪ | `wellnessForms` |
| روند (شیب رگرسیون) | ۱۰٪ | میانگین سری آزمون‌ها |
| رفتار | ۱۰٪ | `behaviorReports` |
| دیررس | ۵٪ | `attendance(late)` |

آستانه‌ها: `≥75` بحرانی (هشدار خودکار به مشاور/مدیر/والدین) — `50..74` بالا — `25..49` متوسط — `<25` پایین.
مدل هر اجرا `reasons` (دلایل) و `recommendations` (توصیه‌های اجرایی) هم تولید می‌کند.

### ۲. تحلیل سلامت روان
فرم هفتگی ۸ سؤالی (۱ تا ۵) → شاخص‌های `stress`، `anxiety` (فشار + استرس)، `motivation` (انگیزه + تمرکز)، `sleep` و `overall`. احتمال ترک/افت:
`0.45·risk + 0.25·stress + 0.2·(100-حضور) + 0.1·(100-motivation)`.

### ۳. پیش‌بینی نمرات (Prediction Engine)
- رگرسیون خطی (least-squares) بر سری نمرات هر درس → **پیش‌بینی آزمون بعد**
- **احتمال قبولی:** تابع لوجستیک `1/(1+e^(-0.62·(avg-10)))` (۵۰٪ در نمره ۱۰)
- **احتمال افت:** ترکیب شیب منفی + فاصله از خط قبولی
- **پیش‌بینی میانگین ترم:** `avg + 1.5·slope`
- **درصد اطمینان:** تابع تعداد آزمون‌ها و انحراف باقیمانده‌ها

### ۴. تحلیل دبیر
`efficiency = 0.4·(میانگین کلاس) + 0.3·(پیشرفت روند) + 0.3·(انجام تکالیف)` به‌همراه **شاخص سختی آزمون** `(1-avg/20)` و مقایسه‌ی روند.

### ۵. تحلیل مدرسه
میانگین پایه‌ای/کلاسی/درسی، نمادهارت پایه×درس، دروس در معرض افت، برترین‌ها، روند حضور و مقایسه‌ی کارآموزی دبیران.

### ۶. تشخیص تقلب (Anomaly Detection)
- **پرش هم‌زمان:** اگر دو دانش‌آموز هر دو بیش از ۴ نمره بالاتر از میانگین گذشته‌شان بیایند و نمره‌شان اختلاف ≤۱ داشته باشد ← پرچم «کپی پاسخ‌ها»
- **الگوی یکسان:** همبستگی پیرسون میان بردار میانگین‌درس‌های دو همکلاسی `>0.975` با اختلاف میانگین `<0.6`

### ۷. برنامه مطالعاتی هوشمند
نیاز هر درس: `importance × (1 - avg/20)` → تقسیم ۷۸۰ دقیقه هفتگی بر ۵ روز (سقف ۱۸۰ دقیقه/روز، بلوک‌های ۱۵+ دقیقه‌ای) با نوع بلوک (تست/مطالعه/مرور) و اهداف ماهانه.

### ۸. هدایت تحصیلی
پوش‌سازی پروفایل درسی روی ۴ خانواده رشته (ریاضی-فیزیک / تجربی / انسانی-ادبی / هنر-فناوری) با درصد تطابق و دلیل.

### ۹. بینش والدین
بهترین زمان مطالعه (بر اساس انگیزه/تمرکز)، توصیه خواب (بر اساس شاخص استرس)، نقاط ضعف، فعالیت‌های خانوادگی و **گزارش هفتگی متنی** تولیدشده.

---

## 🔌 مستندات API (قرارداد سرویس‌لایر)

همه‌ی عملیات از `src/lib/api.ts` — در سرور Node/Express همان امضاها به‌عنوان endpointهای REST پیاده می‌شوند:

| گروه | عملیات |
|---|---|
| Session | `bootstrap()` ، `login(u,p,code)` ، `logout()` |
| Install | `install(payload)` → تولید کدهای دسترسی + `seedDemo()` اختیاری |
| Admin | `adminOverview()` ، `studentsList()` ، `studentReport(id)` ، `teachersList()` ، `parentsList()` ، `consultantsList()` ، `schoolAnalyticsFull()` ، `alertsList()` ، `markAlertRead(id)` ، `addGrade/addClass/addLesson` ، `loadDemoData()` ، `systemReset()` ، `healthDetail()` |
| Teacher | `teacherHome(id)` ، `saveAttendance(classId,date,marks)` ، `addHomework(...)` ، `toggleHomework(...)` ، `addExam(...)` ، `saveExamScores(examId,scores)` ، `addBehavior(...)` |
| Consultant | `consultantHome()` ، `timeline(studentId)` ، `addConsultantNote(...)` |
| Parent | `parentHome(parentId)` |
| Student | `studentHome(id)` ، `submitWellness(answers)` ، `submitHomework(id)` |

**امنیت:** هاش SHA-256 + Salt برای رمزها، توکن امضاشده‌ی HS256 با انقضا (۱۲ ساعت)، کد دسترسی ۱۲ کاراکتری هر نقش، اعتبارسنجی ورودی در همه فرم‌ها (react-hook-form + قوانین دامنه)، جداسازی داده‌ها بر اساس نقش (والد فقط فرزند خود و …).

---

## 🚀 راهنمای دپلوی (Deployment)

1. `npm run build` → سرو کردن `dist/` روی هر استاتیک‌سرور (Nginx/Netlify/…)
2. برای نسخه‌ی سرور: قرارداد `src/lib/api.ts` را روی Express پیاده کنید؛ فایل‌های `database/*.json` در مسیر `DATABASE_DIR` قرار گیرند و JSON Manager همان منطق atomic/backup/lock را روی `fs` اجرا کند (مطالعه‌ی `db.ts`).
3. متغیر `DATABASE_DIR` + نرخ‌لیمیت و Helmet را در میانی‌ورهای Express فعال کنید.

## 🔭 بهبودهای آینده (Future Improvements)

- مدل‌های سری‌زمانی (ARIMA/Prophet) برای پیش‌بینی دقیق‌تر و BERT برای تحلیل متن یادداشت‌ها
- همبستگی بین‌کلاسی و خوشه‌بندی دانش‌آموزان هم‌ریسک
- PWA + اعلان push برای والدین، بکاپ ابری امضاشده، و گزارش چاپی PDF مشاوره
- پنل چندمدرسه (Multi-tenant) با ایزوله‌سازی کامل فایل‌ها

## 👨‍ راهنمای توسعه (Developer Guide)

- **TS سخت‌گیرانه:** strict، بدون `any`، بدون magic number (ثابت‌ها در `ai.ts` با نام معنادار)، بدون `console.log` در مسیر تولید
- **تست دستی سریع:** نصب → تیک «داده‌های نمونه» → ورود با هر نقش
- **قواعد:** همه‌ی الگوریتم‌ها در `ai.ts` خالص و بدون Side-effect هستند — برای افزودن عامل جدید به ریسک، فقط یک `RiskFactor` با وزن نامدار به `RISK_WEIGHTS` و `factors[]` اضافه کنید؛ هشدارها، نمودارها و توصیه‌ها خودبه‌خود با آن درگیر می‌شوند.
