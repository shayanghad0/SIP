/**
 * SIP — Application API (service layer)
 * =====================================
 * Mirrors the REST contract of the Node/Express server (see README → API).
 * In this browser build the same contract is served by an in-process
 * adapter over the JSON Database Manager, so the UI is 100% identical
 * when pointed at the real server.
 */

import {
  attemptLogin,
  clearToken,
  generateAccessCode,
  generatePassword,
  hashPassword,
  readToken,
  verifyToken,
  type TokenPayload,
} from "./auth";
import {
  academicGuidance,
  analyzeStudent,
  buildStudyPlan,
  computeTeacherAnalytics,
  detectCheating,
  DECLINE_SLOPE_THRESHOLD,
  HIGH_RISK_THRESHOLD,
  MAX_SCORE,
  studentSeries,
  STRESS_ALERT_THRESHOLD,
  wellnessIndices,
  type StudentSnapshot,
} from "./ai";
import { dbHealth, isInstalled, nextId, readDb, resetDatabase, updateDb, writeDb } from "./db";
import { daysAgoIso, isWeekday, weekKey } from "./format";
import type {
  AccessRecord,
  ActivityItem,
  AiFile,
  AlertItem,
  AttendanceStatus,
  BehaviorType,
  BooksFile,
  ConsultantsFile,
  Exam,
  GradesFile,
  GuidanceResult,
  InstallPayload,
  InstallResult,
  Lesson,
  Note,
  NotesFile,
  Parent,
  ParentsFile,
  Student,
  StudentAnalysis,
  StudentsFile,
  StudyPlan,
  Teacher,
  TeachersFile,
  WellnessAnswers,
  AdminFile,
  Role,
} from "./types";

const LATENCY_MS = 240;
const DEMO_ROUNDS_AGO_DAYS = [150, 110, 70, 30];
const DEMO_ATTENDANCE_RECORDS = 15;
const DEMO_ATTENDANCE_SCAN_DAYS = 34;
const DEMO_HOMEWORK_ROUNDS = 4;
const ALERT_CAP = 40;
const ACTIVITY_CAP = 60;
const RISK_SUGGESTION_FROM = 50;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function avgOf(vals: number[]): number {
  return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
}

function clampNum(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function clampInt(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(v)));
}

export type AlertNamed = AlertItem & { studentName: string };

/* ================= activity log ================= */

function logActivity(role: Role | "system", roleLabel: string, message: string): void {
  updateDb<NotesFile>("notes", (d) => ({
    ...d,
    activity: [{ id: nextId("act"), role, roleLabel, message, at: new Date().toISOString() }, ...d.activity].slice(0, ACTIVITY_CAP),
  }));
}

/* ================= labels helper ================= */

function labels() {
  const g = readDb<GradesFile>("grades");
  const b = readDb<BooksFile>("books");
  const gradeName = (id: string) => g.grades.find((x) => x.id === id)?.name ?? "؟";
  const lessonName = (id: string) => b.lessons.find((x) => x.id === id)?.name ?? "؟";
  const classLabel = (id: string) => {
    const c = g.classes.find((x) => x.id === id);
    return c ? `${gradeName(c.gradeId)} — ${c.name}` : "؟";
  };
  return { gradeName, lessonName, classLabel };
}

/* ================= install ================= */

const DEFAULT_LESSONS: { name: string; importance: number }[] = [
  { name: "ریاضی", importance: 10 },
  { name: "فیزیک", importance: 9 },
  { name: "فارسی", importance: 8 },
  { name: "شیمی", importance: 9 },
  { name: "تاریخ", importance: 5 },
  { name: "انگلیسی", importance: 7 },
];

export async function install(payload: InstallPayload): Promise<InstallResult> {
  await sleep(650);
  resetDatabase();
  const records: AccessRecord[] = [];

  /* 1 — administrator */
  const adminHash = await hashPassword(payload.admin.password);
  const admin = {
    id: nextId("adm"),
    role: "admin" as const,
    fullName: payload.admin.fullName,
    username: payload.admin.username,
    passwordHash: adminHash.hash,
    salt: adminHash.salt,
    accessCode: generateAccessCode("admin"),
    createdAt: new Date().toISOString(),
    schoolName: payload.schoolName,
  };
  writeDb<AdminFile>("admin", { admins: [admin] });
  records.push({ role: "admin", roleLabel: "مدیر", name: admin.fullName, username: admin.username, password: payload.admin.password, accessCode: admin.accessCode });

  /* 2+3 — grades & classes */
  const grades = payload.gradeNames.map((name) => ({ id: nextId("gr"), name }));
  const classIdsByGrade: string[][] = grades.map((_g, gi) =>
    (payload.classNames[gi] ?? []).map((_name, ci) => nextId(`cl-${gi}-${ci}`)),
  );
  const classesFinal: { id: string; name: string; gradeId: string }[] = [];
  grades.forEach((g, gi) => {
    (payload.classNames[gi] ?? []).forEach((name, ci) => {
      classesFinal.push({ id: classIdsByGrade[gi][ci], name, gradeId: g.id });
    });
  });

  /* 4 — lessons */
  const lessonSource = payload.lessons.length > 0 ? payload.lessons : payload.loadDemo ? DEFAULT_LESSONS : [];
  const lessons = lessonSource.map((l) => ({ id: nextId("ls"), name: l.name, importance: clampInt(l.importance, 3, 10) }));
  writeDb<BooksFile>("books", { lessons });

  /* 5 — consultants */
  const consultants = [];
  for (const c of payload.consultants) {
    const h = await hashPassword(c.password);
    consultants.push({
      id: nextId("con"),
      role: "consultant" as const,
      fullName: c.fullName,
      username: c.username,
      passwordHash: h.hash,
      salt: h.salt,
      accessCode: generateAccessCode("consultant"),
      createdAt: new Date().toISOString(),
      specialty: "مشاوره تحصیلی",
    });
  }
  writeDb<ConsultantsFile>("consultants", { consultants });
  consultants.forEach((c, i) =>
    records.push({ role: "consultant", roleLabel: "مشاور", name: c.fullName, username: c.username, password: payload.consultants[i].password, accessCode: c.accessCode }),
  );

  /* 6 — students + auto parent accounts */
  const studentsFile: StudentsFile = { students: [], attendance: [], homeworks: [], homeworkSubmissions: [], behaviorReports: [] };
  const parentsFile: ParentsFile = { parents: [] };
  for (let idx = 0; idx < payload.students.length; idx += 1) {
    const s = payload.students[idx];
    const parentUsername = `parent_${s.username.trim()}`;
    const parentPassword = payload.admin.password;
    const stHash = await hashPassword(s.password);
    const parHash = await hashPassword(parentPassword);
    const st: Student = {
      id: nextId("st"),
      role: "student",
      fullName: s.fullName,
      username: s.username,
      passwordHash: stHash.hash,
      salt: stHash.salt,
      accessCode: generateAccessCode("student"),
      createdAt: new Date().toISOString(),
      gradeId: grades[s.gradeIdx].id,
      classId: classIdsByGrade[s.gradeIdx][s.classIdx] ?? classIdsByGrade[s.gradeIdx][0],
      nationalId: s.nationalId || undefined,
      fatherName: s.fatherName,
      motherName: s.motherName,
      phone: s.phone,
      emergencyPhone: s.emergencyPhone,
      parentUserId: nextId("par"),
    };
    const par: Parent = {
      id: st.parentUserId,
      role: "parent",
      fullName: s.fatherName ? `${s.fatherName} (والدین)` : "والدین",
      username: parentUsername,
      passwordHash: parHash.hash,
      salt: parHash.salt,
      accessCode: generateAccessCode("parent"),
      createdAt: new Date().toISOString(),
      studentId: st.id,
    };
    studentsFile.students.push(st);
    parentsFile.parents.push(par);
    records.push({ role: "student", roleLabel: "دانش‌آموز", name: st.fullName, username: st.username, password: s.password, accessCode: st.accessCode });
    records.push({ role: "parent", roleLabel: "والدین", name: par.fullName, username: par.username, password: parentPassword, accessCode: par.accessCode });
  }
  writeDb<StudentsFile>("students", studentsFile);
  writeDb<ParentsFile>("parents", parentsFile);

  /* 7 — teachers */
  const teachers: Teacher[] = [];
  for (const t of payload.teachers) {
    const h = await hashPassword(t.password);
    teachers.push({
      id: nextId("tch"),
      role: "teacher",
      fullName: t.fullName,
      username: t.username,
      passwordHash: h.hash,
      salt: h.salt,
      accessCode: generateAccessCode("teacher"),
      createdAt: new Date().toISOString(),
      assignments: t.assignments
        .filter((a) => lessons[a.lessonIdx] && grades[a.gradeIdx] && classIdsByGrade[a.gradeIdx]?.[a.classIdx])
        .map((a) => ({ lessonId: lessons[a.lessonIdx].id, gradeId: grades[a.gradeIdx].id, classId: classIdsByGrade[a.gradeIdx][a.classIdx] })),
    });
  }
  writeDb<TeachersFile>("teachers", { teachers });
  teachers.forEach((t, i) =>
    records.push({ role: "teacher", roleLabel: "دبیر", name: t.fullName, username: t.username, password: payload.teachers[i].password, accessCode: t.accessCode }),
  );

  writeDb<GradesFile>("grades", { grades, classes: classesFinal, exams: [], examScores: [] });
  writeDb<NotesFile>("notes", { notes: [], wellnessForms: [], alerts: [], activity: [] });

  /* 8 — finish: demo data + first AI pass */
  if (payload.loadDemo) seedDemo();
  recompute();
  logActivity("system", "سیستم", "نصب سامانه SIP تکمیل شد");
  return { ok: true, records };
}

/* ================= full AI pass ================= */

export function recompute(): void {
  const students = readDb<StudentsFile>("students");
  const gradesFile = readDb<GradesFile>("grades");
  const books = readDb<BooksFile>("books");
  const notes = readDb<NotesFile>("notes");
  const teachers = readDb<TeachersFile>("teachers");

  const classAvgMap = new Map<string, number[]>();
  for (const st of students.students) {
    const vals = gradesFile.examScores.filter((s) => s.studentId === st.id).map((s) => (s.score / s.maxScore) * MAX_SCORE);
    const arr = classAvgMap.get(st.classId) ?? [];
    arr.push(...vals);
    classAvgMap.set(st.classId, arr);
  }

  const analyses: StudentAnalysis[] = students.students.map((st) => {
    const snap: StudentSnapshot = {
      student: st,
      series: studentSeries(st, gradesFile.exams, gradesFile.examScores),
      attendance: {
        present: students.attendance.filter((a) => a.studentId === st.id && a.status === "present").length,
        absent: students.attendance.filter((a) => a.studentId === st.id && a.status === "absent").length,
        late: students.attendance.filter((a) => a.studentId === st.id && a.status === "late").length,
      },
      homework: {
        assigned: students.homeworks.filter((h) => h.classId === st.classId).length,
        completed: students.homeworkSubmissions.filter(
          (s) => s.studentId === st.id && s.completed && students.homeworks.some((h) => h.id === s.homeworkId && h.classId === st.classId),
        ).length,
      },
      behavior: {
        positive: students.behaviorReports.filter((b) => b.studentId === st.id && b.type === "positive").length,
        negative: students.behaviorReports.filter((b) => b.studentId === st.id && b.type === "negative").length,
      },
      wellness: notes.wellnessForms.filter((w) => w.studentId === st.id).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)),
      classAvg: avgOf(classAvgMap.get(st.classId) ?? []),
    };
    return analyzeStudent(snap, books.lessons);
  });

  const perLessonOf = (st: Student) => {
    const series = studentSeries(st, gradesFile.exams, gradesFile.examScores);
    return books.lessons.map((lesson) => {
      const s = series.find((x) => x.lessonId === lesson.id);
      const vals = s ? s.scores.map((p) => (p.value / p.max) * MAX_SCORE) : [];
      return { lesson, avg: avgOf(vals), hasData: vals.length > 0 };
    });
  };
  const plans: StudyPlan[] = students.students.map((st) => buildStudyPlan(st.id, perLessonOf(st)));
  const guidance: Record<string, GuidanceResult> = {};
  for (const st of students.students) guidance[st.id] = academicGuidance(perLessonOf(st));

  const studentsByClass = new Map<string, Student[]>();
  for (const st of students.students) {
    const arr = studentsByClass.get(st.classId) ?? [];
    arr.push(st);
    studentsByClass.set(st.classId, arr);
  }
  const teacherAnalytics = teachers.teachers.map((t) =>
    computeTeacherAnalytics(t, {
      studentsByClass,
      exams: gradesFile.exams,
      examScores: gradesFile.examScores,
      homeworks: students.homeworks,
      submissions: students.homeworkSubmissions,
    }),
  );

  const cheatingFlags = detectCheating(gradesFile.exams, gradesFile.examScores, students.students);

  /* alerts — deduped per student+type, latest wins */
  const studentName = (id: string) => students.students.find((s) => s.id === id)?.fullName ?? "؟";
  const fresh: AlertItem[] = [];
  for (const a of analyses) {
    if (a.riskScore >= HIGH_RISK_THRESHOLD)
      fresh.push(mkAlert(a.studentId, "high-risk", "critical", "هشدار ریسک بالا", `ریسک ${studentName(a.studentId)} به ${a.riskScore} رسیده است: ${a.reasons[0] ?? "—"}`));
    if (a.stressIndex >= STRESS_ALERT_THRESHOLD)
      fresh.push(mkAlert(a.studentId, "wellness", "warning", "فشار روانی بالا", `شاخص استرس ${studentName(a.studentId)} در فرم هفتگی بالاست`));
    if (a.learningSpeed <= DECLINE_SLOPE_THRESHOLD && a.overallAvg > 0)
      fresh.push(mkAlert(a.studentId, "decline", "warning", "افت تحصیلی", `روند نمرات ${studentName(a.studentId)} نزولی است`));
    if (a.attendanceRate < 70 && a.attendanceRate > 0)
      fresh.push(mkAlert(a.studentId, "attendance", "warning", "غیبت مکرر", `نرخ حضور ${studentName(a.studentId)} زیر ۷۰٪ است`));
  }
  for (const f of cheatingFlags) {
    if (f.studentIds.length >= 2) fresh.push(mkAlert(f.studentIds[0], "cheating", "warning", "انومالی آزمون", f.reason));
  }
  const merged = [...fresh];
  for (const al of notes.alerts) {
    if (!merged.some((m) => `${m.studentId}:${m.type}` === `${al.studentId}:${al.type}`)) merged.push(al);
  }
  merged.sort((a, b) => b.date.localeCompare(a.date));

  const aiFile: AiFile = { analyses, studyPlans: plans, teacherAnalytics, cheatingFlags, guidance };
  writeDb<AiFile>("ai-analysis", aiFile);
  writeDb<NotesFile>("notes", { ...notes, alerts: merged.slice(0, ALERT_CAP) });
}

function mkAlert(studentId: string, type: AlertItem["type"], severity: AlertItem["severity"], title: string, message: string): AlertItem {
  return { id: nextId(`al-${type}`), studentId, type, severity, title, message, date: new Date().toISOString(), read: false };
}

/* ================= demo data seeder ================= */

interface Archetype {
  base: number;
  trend: number;
  absence: number;
  lateness: number;
  hwRate: number;
  stress: number;
  negBehavior: number;
}

const ARCHETYPES: Archetype[] = [
  { base: 14.5, trend: 0.18, absence: 0.04, lateness: 0.06, hwRate: 0.92, stress: 0.2, negBehavior: 0.08 },
  { base: 12.2, trend: -0.1, absence: 0.1, lateness: 0.12, hwRate: 0.72, stress: 0.42, negBehavior: 0.2 },
  { base: 13.6, trend: -0.7, absence: 0.13, lateness: 0.14, hwRate: 0.52, stress: 0.62, negBehavior: 0.42 },
  { base: 10.4, trend: -0.42, absence: 0.27, lateness: 0.2, hwRate: 0.34, stress: 0.8, negBehavior: 0.6 },
];

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedDemo(): void {
  const students = readDb<StudentsFile>("students");
  const grades = readDb<GradesFile>("grades");
  const books = readDb<BooksFile>("books");
  if (students.students.length === 0 || grades.exams.length > 0) return;

  const byClass = new Map<string, { st: Student; idx: number }[]>();
  students.students.forEach((st, idx) => {
    const arr = byClass.get(st.classId) ?? [];
    arr.push({ st, idx });
    byClass.set(st.classId, arr);
  });

  for (const [classId, members] of byClass.entries()) {
    for (const lesson of books.lessons) {
      DEMO_ROUNDS_AGO_DAYS.forEach((daysAgo, round) => {
        const examId = nextId("ex");
        grades.exams.push({ id: examId, name: `آزمون ${round + 1}`, lessonId: lesson.id, classId, date: daysAgoIso(daysAgo), createdById: "system" });
        for (const { st, idx } of members) {
          const arch = ARCHETYPES[idx % ARCHETYPES.length];
          const rng = mulberry32(1000 + idx * 97 + round * 13 + lesson.name.length * 7);
          const base = arch.base + (rng() - 0.5) * 4;
          const value = clampNum(base + arch.trend * round * 2 + (rng() - 0.5) * 2.4, 1.5, 19.5);
          grades.examScores.push({ id: nextId("sc"), examId, studentId: st.id, score: Math.round(value * 2) / 2, maxScore: MAX_SCORE });
        }
      });
    }
  }

  /* attendance over recent weekdays */
  const candidateDates: string[] = [];
  for (let back = DEMO_ATTENDANCE_SCAN_DAYS; back >= 0 && candidateDates.length < DEMO_ATTENDANCE_RECORDS; back -= 1) {
    const d = daysAgoIso(back);
    if (isWeekday(d)) candidateDates.push(d);
  }
  for (const { st, idx } of students.students.flatMap((st, idx) => [{ st, idx }])) {
    const arch = ARCHETYPES[idx % ARCHETYPES.length];
    const rng = mulberry32(7000 + idx * 31);
    for (const date of candidateDates) {
      const r = rng();
      const status: AttendanceStatus = r < arch.absence ? "absent" : r < arch.absence + arch.lateness ? "late" : "present";
      students.attendance.push({ id: nextId("att"), studentId: st.id, date, status, classId: st.classId });
    }
  }

  /* homeworks + submissions */
  for (const [classId, members] of byClass.entries()) {
    for (const lesson of books.lessons) {
      for (let hw = 0; hw < DEMO_HOMEWORK_ROUNDS; hw += 1) {
        const hwId = nextId("hw");
        const created = daysAgoIso(120 - hw * 30);
        students.homeworks.push({
          id: hwId,
          lessonId: lesson.id,
          classId,
          title: `تکلیف ${hw + 1} — ${lesson.name}`,
          dueDate: daysAgoIso(115 - hw * 30),
          createdById: "system",
          createdAt: created,
        });
        for (const { st, idx } of members) {
          const arch = ARCHETYPES[idx % ARCHETYPES.length];
          const done = mulberry32(9000 + idx * 17 + hw * 5)() < arch.hwRate;
          students.homeworkSubmissions.push({ id: nextId("hws"), homeworkId: hwId, studentId: st.id, completed: done, submittedAt: done ? created : undefined });
        }
      }
    }
  }

  /* behavior reports */
  const negNotes = ["بی‌توجهی طولانی در کلاس", "دعوای کلامی با همکلاسی", "عدم انجام تکلیف کلاسی"];
  const posNotes = ["مشارکت فعال در بحث کلاس", "کمک به همکلاسی‌ها", "نظم و نظم‌دهی در گروه"];
  for (const { st, idx } of students.students.flatMap((st, idx) => [{ st, idx }])) {
    const arch = ARCHETYPES[idx % ARCHETYPES.length];
    const rng = mulberry32(3000 + idx * 53);
    for (let b = 0; b < 3; b += 1) {
      const neg = rng() < arch.negBehavior;
      students.behaviorReports.push({
        id: nextId("bh"),
        studentId: st.id,
        byTeacherId: "system",
        date: daysAgoIso(60 - b * 18),
        type: neg ? "negative" : "positive",
        note: neg ? negNotes[b % 3] : posNotes[b % 3],
      });
    }
  }

  /* wellness forms — last 4 weeks */
  for (const { st, idx } of students.students.flatMap((st, idx) => [{ st, idx }])) {
    const arch = ARCHETYPES[idx % ARCHETYPES.length];
    const rng = mulberry32(5000 + idx * 71);
    for (let w = 0; w < 4; w += 1) {
      const d = new Date();
      d.setDate(d.getDate() - (3 - w) * 7);
      const s = clampNum(arch.stress + (rng() - 0.5) * 0.3 + (arch.trend < -0.3 ? w * 0.08 : 0), 0.05, 0.95);
      const v = (x: number) => clampInt(1 + x * 4, 1, 5);
      const answers: WellnessAnswers = {
        mood: v(1 - s * 0.9),
        stress: v(s),
        sleep: v(1 - s * 0.7 - (arch.trend < 0 ? 0.15 : 0)),
        motivation: v(1 - s * 0.6 + (arch.trend > 0 ? 0.1 : -0.1)),
        social: v(1 - s * 0.5),
        pressure: v(s * 0.9 + 0.1),
        focus: v(1 - s * 0.55),
        family: v(1 - s * 0.35),
      };
      const notesFile = readDb<NotesFile>("notes");
      updateDb<NotesFile>("notes", (d2) => ({
        ...d2,
        wellnessForms: [
          ...notesFile.wellnessForms.filter((x) => x.id !== ""),
          { id: nextId("wf"), studentId: st.id, week: weekKey(d), answers, submittedAt: d.toISOString() },
        ],
      }));
    }
  }

  /* seed notes */
  const noteTexts = [
    "در کلاس ریاضی بسیار فعال است ولی باید روی تمرین‌های منزل وقت بگذارد.",
    "تغییر محسوسی در روحیه اخیراً دیده می‌شود؛ پیگیری توصیه می‌شود.",
    "نمره شیمی روند مثبت دارد؛ تشویق شود.",
  ];
  students.students.forEach((st, si) => {
    updateDb<NotesFile>("notes", (d) => ({
      ...d,
      notes: [
        ...d.notes,
        { id: nextId("nt"), authorId: "system", authorName: "دبیر", studentId: st.id, date: new Date(daysAgoIso(20 - (si % 10))).toISOString(), text: noteTexts[si % noteTexts.length], kind: "teacher" },
        { id: nextId("nt"), authorId: "system", authorName: "والدین", studentId: st.id, date: new Date(daysAgoIso(12 - (si % 6))).toISOString(), text: "در خانه برنامه‌ی منظم مطالعه‌ای ندارد؛ نیاز به نظارت بیشتر است.", kind: "parent" },
      ],
    }));
  });

  writeDb<StudentsFile>("students", students);
  writeDb<GradesFile>("grades", grades);
}

/* ================= session ================= */

export async function bootstrap(): Promise<{ installed: boolean; session: TokenPayload | null }> {
  await sleep(150);
  return { installed: isInstalled(), session: await verifyToken(readToken()) };
}

export async function login(username: string, password: string) {
  await sleep(400);
  const result = await attemptLogin(username, password);
  if (result.ok && result.user) logActivity(result.user.role, roleLabel(result.user.role), `${result.user.name} وارد سامانه شد`);
  return result;
}

export function logout(): void {
  clearToken();
}

export function roleLabel(role: Role): string {
  return role === "admin" ? "مدیر" : role === "teacher" ? "دبیر" : role === "consultant" ? "مشاور" : role === "parent" ? "والدین" : "دانش‌آموز";
}

export function listQuickAccounts(): { name: string; role: string; username: string }[] {
  const out: { name: string; role: string; username: string }[] = [];
  for (const a of readDb<AdminFile>("admin").admins) out.push({ name: a.fullName, role: "مدیر", username: a.username });
  for (const t of readDb<TeachersFile>("teachers").teachers) out.push({ name: t.fullName, role: "دبیر", username: t.username });
  for (const c of readDb<ConsultantsFile>("consultants").consultants) out.push({ name: c.fullName, role: "مشاور", username: c.username });
  for (const s of readDb<StudentsFile>("students").students) out.push({ name: s.fullName, role: "دانش‌آموز", username: s.username });
  for (const p of readDb<ParentsFile>("parents").parents) out.push({ name: p.fullName, role: "والدین", username: p.username });
  return out;
}

/* ================= admin ================= */

export interface OverviewData {
  stats: { students: number; teachers: number; consultants: number; parents: number; avgScore: number; attendanceRate: number; riskCount: number };
  gradeAverages: { name: string; avg: number }[];
  riskDist: { level: string; name: string; value: number }[];
  attendanceTrend: { label: string; rate: number }[];
  riskStudents: { id: string; name: string; classLabel: string; risk: number; level: string; topReason: string }[];
  activity: ActivityItem[];
  alerts: AlertItem[];
  health: ReturnType<typeof dbHealth>;
  hasAcademicData: boolean;
}

function fmtDay(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fa-IR", { day: "numeric", month: "short" });
}

function candidateDatesTrend(): string[] {
  const out: string[] = [];
  for (let back = 40; back >= 0 && out.length < 10; back -= 1) {
    const d = daysAgoIso(back);
    if (isWeekday(d)) out.unshift(d);
  }
  return out;
}

export async function adminOverview(): Promise<OverviewData> {
  await sleep(LATENCY_MS);
  const students = readDb<StudentsFile>("students");
  const grades = readDb<GradesFile>("grades");
  const notes = readDb<NotesFile>("notes");
  const ai = readDb<AiFile>("ai-analysis");
  const L = labels();

  const attTotal = students.attendance.length;
  const presentLate = students.attendance.filter((a) => a.status !== "absent").length;

  const riskDist = [
    { level: "low", name: "پایین", value: 0 },
    { level: "medium", name: "متوسط", value: 0 },
    { level: "high", name: "بالا", value: 0 },
    { level: "critical", name: "بحرانی", value: 0 },
  ];
  for (const a of ai.analyses) {
    const bucket = riskDist.find((r) => r.level === a.level);
    if (bucket) bucket.value += 1;
  }

  const riskStudents = ai.analyses
    .map((a) => {
      const st = students.students.find((s) => s.id === a.studentId);
      return st
        ? { id: st.id, name: st.fullName, classLabel: L.classLabel(st.classId), risk: a.riskScore, level: a.level, topReason: a.reasons[0] ?? "—" }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 6);

  return {
    stats: {
      students: students.students.length,
      teachers: readDb<TeachersFile>("teachers").teachers.length,
      consultants: readDb<ConsultantsFile>("consultants").consultants.length,
      parents: readDb<ParentsFile>("parents").parents.length,
      avgScore: avgOf(grades.examScores.map((s) => (s.score / s.maxScore) * MAX_SCORE)),
      attendanceRate: attTotal > 0 ? (presentLate / attTotal) * 100 : 100,
      riskCount: ai.analyses.filter((a) => a.riskScore >= HIGH_RISK_THRESHOLD).length,
    },
    gradeAverages: grades.grades.map((g) => {
      const classIds = grades.classes.filter((c) => c.gradeId === g.id).map((c) => c.id);
      const stIds = students.students.filter((s) => classIds.includes(s.classId)).map((s) => s.id);
      return { name: g.name, avg: avgOf(grades.examScores.filter((s) => stIds.includes(s.studentId)).map((s) => (s.score / s.maxScore) * MAX_SCORE)) };
    }),
    riskDist,
    attendanceTrend: candidateDatesTrend().map((date) => {
      const recs = students.attendance.filter((a) => a.date === date);
      return { label: fmtDay(date), rate: recs.length > 0 ? Math.round((recs.filter((r) => r.status !== "absent").length / recs.length) * 100) : 0 };
    }),
    riskStudents,
    activity: notes.activity.slice(0, 9),
    alerts: notes.alerts.slice(0, 6),
    health: dbHealth(),
    hasAcademicData: grades.examScores.length > 0,
  };
}

export interface StudentRow {
  student: Student;
  classLabel: string;
  risk: number;
  level: string;
  avg: number;
  attendanceRate: number;
}

export async function studentsList(): Promise<StudentRow[]> {
  await sleep(LATENCY_MS);
  const students = readDb<StudentsFile>("students");
  const ai = readDb<AiFile>("ai-analysis");
  const L = labels();
  return students.students.map((st) => {
    const a = ai.analyses.find((x) => x.studentId === st.id);
    return { student: st, classLabel: L.classLabel(st.classId), risk: a?.riskScore ?? 0, level: a?.level ?? "low", avg: a?.overallAvg ?? 0, attendanceRate: a?.attendanceRate ?? 100 };
  });
}

export interface ReportData {
  student: Student;
  classLabel: string;
  analysis: StudentAnalysis | null;
  progressSeries: { label: string; avg: number }[];
  subjectAverages: { name: string; avg: number; importance: number; predicted: number; passProbability: number | null; declineProbability: number | null }[];
  homeworks: { id: string; title: string; lessonName: string; dueDate: string; completed: boolean }[];
  notes: Note[];
  attendance: { present: number; absent: number; late: number };
  timeline: { id: string; at: string; icon: string; title: string; desc: string }[];
  guidance: GuidanceResult;
}

export async function studentReport(studentId: string): Promise<ReportData> {
  await sleep(LATENCY_MS / 2);
  const students = readDb<StudentsFile>("students");
  const grades = readDb<GradesFile>("grades");
  const books = readDb<BooksFile>("books");
  const notes = readDb<NotesFile>("notes");
  const ai = readDb<AiFile>("ai-analysis");
  const L = labels();
  const student = students.students.find((s) => s.id === studentId) ?? students.students[0];
  const analysis = ai.analyses.find((a) => a.studentId === student.id) ?? null;

  const byDate = new Map<string, number[]>();
  for (const sc of grades.examScores.filter((s) => s.studentId === student.id)) {
    const exam = grades.exams.find((e) => e.id === sc.examId);
    if (!exam) continue;
    const arr = byDate.get(exam.date) ?? [];
    arr.push((sc.score / sc.maxScore) * MAX_SCORE);
    byDate.set(exam.date, arr);
  }
  const progressSeries = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, vals]) => ({ label: fmtDay(date), avg: Math.round(avgOf(vals) * 10) / 10 }));

  const subjectAverages = books.lessons.map((l) => {
    const vals = grades.examScores
      .filter((s) => s.studentId === student.id && grades.exams.some((e) => e.id === s.examId && e.lessonId === l.id))
      .map((s) => (s.score / s.maxScore) * MAX_SCORE);
    const pred = analysis?.predictions.find((p) => p.lessonId === l.id);
    return {
      name: l.name,
      avg: avgOf(vals),
      importance: l.importance,
      predicted: pred?.predictedAvg ?? 0,
      passProbability: pred ? pred.passProbability : null,
      declineProbability: pred ? pred.declineProbability : null,
    };
  });

  const hw = students.homeworks
    .filter((h) => h.classId === student.classId)
    .slice(0, 12)
    .map((h) => ({
      id: h.id,
      title: h.title,
      lessonName: L.lessonName(h.lessonId),
      dueDate: h.dueDate,
      completed: students.homeworkSubmissions.some((s) => s.homeworkId === h.id && s.studentId === student.id && s.completed),
    }));

  const studentNotes = notes.notes.filter((n) => n.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date));

  const timeline = ReportDataTimeline(student, students, notes);

  return {
    student,
    classLabel: L.classLabel(student.classId),
    analysis,
    progressSeries,
    subjectAverages,
    homeworks: hw,
    notes: studentNotes,
    attendance: {
      present: students.attendance.filter((a) => a.studentId === student.id && a.status === "present").length,
      absent: students.attendance.filter((a) => a.studentId === student.id && a.status === "absent").length,
      late: students.attendance.filter((a) => a.studentId === student.id && a.status === "late").length,
    },
    timeline,
    guidance: ai.guidance[student.id] ?? { tracks: [] },
  };
}

function ReportDataTimeline(student: Student, students: StudentsFile, notes: NotesFile): ReportData["timeline"] {
  const timeline: ReportData["timeline"] = [];
  for (const n of notes.notes.filter((x) => x.studentId === student.id))
    timeline.push({ id: n.id, at: n.date, icon: "note", title: `یادداشت ${n.kind === "teacher" ? "دبیر" : n.kind === "consultant" ? "مشاور" : "والدین"}`, desc: n.text });
  for (const al of notes.alerts.filter((x) => x.studentId === student.id)) timeline.push({ id: al.id, at: al.date, icon: "alert", title: al.title, desc: al.message });
  for (const b of students.behaviorReports.filter((x) => x.studentId === student.id))
    timeline.push({ id: b.id, at: b.date, icon: b.type === "positive" ? "plus" : "minus", title: b.type === "positive" ? "گزارش مثبت" : "گزارش منفی", desc: b.note });
  for (const w of notes.wellnessForms.filter((x) => x.studentId === student.id)) {
    const idx = wellnessIndices(w.answers);
    timeline.push({ id: w.id, at: w.submittedAt, icon: "heart", title: "فرم سلامت روان", desc: `استرس ${Math.round(idx.stress)}٪ — انگیزه ${Math.round(idx.motivation)}٪` });
  }
  timeline.sort((a, b) => b.at.localeCompare(a.at));
  return timeline.slice(0, 20);
}

export interface TeacherRow {
  teacher: Teacher;
  assignments: string[];
  analytics: ReturnType<typeof computeTeacherAnalytics>;
}

export async function teachersList(): Promise<TeacherRow[]> {
  await sleep(LATENCY_MS);
  const teachers = readDb<TeachersFile>("teachers").teachers;
  const ai = readDb<AiFile>("ai-analysis");
  const L = labels();
  return teachers.map((t) => ({
    teacher: t,
    assignments: t.assignments.map((a) => `${L.lessonName(a.lessonId)} — ${L.classLabel(a.classId)}`),
    analytics: ai.teacherAnalytics.find((x) => x.teacherId === t.id) ?? { teacherId: t.id, classCount: 0, studentCount: 0, avgScore: 0, improvement: 0, difficultyIndex: 50, homeworkCompletion: 80, efficiency: 50 },
  }));
}

export async function parentsList(): Promise<{ parent: Parent; studentName: string; classLabel: string; risk: number }[]> {
  await sleep(LATENCY_MS);
  const parents = readDb<ParentsFile>("parents").parents;
  const students = readDb<StudentsFile>("students");
  const ai = readDb<AiFile>("ai-analysis");
  const L = labels();
  return parents.map((p) => {
    const st = students.students.find((s) => s.id === p.studentId);
    return { parent: p, studentName: st?.fullName ?? "؟", classLabel: st ? L.classLabel(st.classId) : "؟", risk: ai.analyses.find((x) => x.studentId === p.studentId)?.riskScore ?? 0 };
  });
}

export async function consultantsList(): Promise<{ fullName: string; username: string; createdAt: string }[]> {
  await sleep(LATENCY_MS / 2);
  return readDb<ConsultantsFile>("consultants").consultants.map((c) => ({ fullName: c.fullName, username: c.username, createdAt: c.createdAt }));
}

export interface SchoolAnalyticsData {
  heat: { grade: string; cells: { lesson: string; value: number | null }[] }[];
  classAverages: { name: string; avg: number }[];
  lessonAverages: { name: string; avg: number; importance: number }[];
  topStudents: { name: string; classLabel: string; avg: number }[];
  weakLessons: { name: string; avg: number }[];
  cheating: { reason: string; date: string }[];
  teacherBars: { name: string; efficiency: number; avg: number }[];
}

export async function schoolAnalytics(): Promise<SchoolAnalyticsData> {
  await sleep(LATENCY_MS);
  const grades = readDb<GradesFile>("grades");
  const books = readDb<BooksFile>("books");
  const students = readDb<StudentsFile>("students");
  const teachers = readDb<TeachersFile>("teachers").teachers;
  const ai = readDb<AiFile>("ai-analysis");
  const L = labels();
  const stIds = new Set(students.students.map((s) => s.id));

  const avgFor = (classIds: Set<string>, lessonId?: string): number =>
    avgOf(
      grades.examScores
        .filter((s) => {
          if (!stIds.has(s.studentId)) return false;
          const st = students.students.find((x) => x.id === s.studentId);
          if (!st || !classIds.has(st.classId)) return false;
          if (lessonId) return grades.exams.some((e) => e.id === s.examId && e.lessonId === lessonId);
          return true;
        })
        .map((s) => (s.score / s.maxScore) * MAX_SCORE),
    );

  return {
    heat: grades.grades.map((g) => {
      const classIds = new Set(grades.classes.filter((c) => c.gradeId === g.id).map((c) => c.id));
      return { grade: g.name, cells: books.lessons.map((l) => { const v = avgFor(classIds, l.id); return { lesson: l.name, value: v > 0 ? Math.round(v * 10) / 10 : null }; }) };
    }),
    classAverages: grades.classes
      .map((c) => ({ name: `${L.gradeName(c.gradeId)} — ${c.name}`, avg: avgFor(new Set([c.id])) }))
      .filter((x) => x.avg > 0)
      .map((x) => ({ name: x.name, avg: Math.round(x.avg * 10) / 10 })),
    lessonAverages: books.lessons
      .map((l) => ({ name: l.name, avg: avgFor(new Set(grades.classes.map((c) => c.id)), l.id), importance: l.importance }))
      .filter((x) => x.avg > 0)
      .map((x) => ({ ...x, avg: Math.round(x.avg * 10) / 10 })),
    topStudents: students.students
      .map((s) => ({ name: s.fullName, classLabel: L.classLabel(s.classId), avg: avgOf(grades.examScores.filter((sc) => sc.studentId === s.id).map((sc) => (sc.score / sc.maxScore) * MAX_SCORE)) }))
      .filter((x) => x.avg > 0)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5)
      .map((x) => ({ ...x, avg: Math.round(x.avg * 10) / 10 })),
    weakLessons: [],
    cheating: ai.cheatingFlags.slice(0, 6).map((f) => ({ reason: f.reason, date: f.date })),
    teacherBars: teachers.map((t) => {
      const an = ai.teacherAnalytics.find((x) => x.teacherId === t.id);
      return { name: t.fullName, efficiency: Math.round(an?.efficiency ?? 0), avg: Math.round((an?.avgScore ?? 0) * 10) / 10 };
    }),
  };
}

/* weakLessons filled below (needs sorted lessonAverages) */
export async function schoolAnalyticsFull(): Promise<SchoolAnalyticsData> {
  const data = await schoolAnalytics();
  data.weakLessons = [...data.lessonAverages].sort((a, b) => a.avg - b.avg).slice(0, 4);
  return data;
}

export async function alertsList(): Promise<AlertNamed[]> {
  await sleep(LATENCY_MS / 2);
  const notes = readDb<NotesFile>("notes");
  const students = readDb<StudentsFile>("students");
  return notes.alerts.map((a) => ({ ...a, studentName: students.students.find((s) => s.id === a.studentId)?.fullName ?? "؟" }));
}

export function markAlertRead(id: string): void {
  updateDb<NotesFile>("notes", (d) => ({ ...d, alerts: d.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)) }));
}

export function addGrade(name: string): void {
  updateDb<GradesFile>("grades", (d) => ({ ...d, grades: [...d.grades, { id: nextId("gr"), name }] }));
  logActivity("admin", "مدیر", `پایه «${name}» اضافه شد`);
}

export function addClass(gradeId: string, name: string): void {
  updateDb<GradesFile>("grades", (d) => ({ ...d, classes: [...d.classes, { id: nextId("cl"), name, gradeId }] }));
  logActivity("admin", "مدیر", `کلاس «${name}» اضافه شد`);
}

export function addLesson(name: string, importance: number): void {
  updateDb<BooksFile>("books", (d) => ({ ...d, lessons: [...d.lessons, { id: nextId("ls"), name, importance: clampInt(importance, 3, 10) }] }));
  logActivity("admin", "مدیر", `درس «${name}» با اهمیت ${importance} اضافه شد`);
  recompute();
}

export async function loadDemoData(): Promise<void> {
  await sleep(700);
  seedDemo();
  recompute();
  logActivity("admin", "مدیر", "داده‌های نمونه بارگذاری شد");
}

export function systemReset(): void {
  resetDatabase();
  clearToken();
}

export function healthDetail(): { files: { file: string; ok: boolean; bytes: number }[]; backups: number; totalBytes: number } {
  return dbHealth();
}

/* ================= admin add student/teacher helpers ================= */

export async function addStudentRecord(payload: {
  fullName: string;
  username: string;
  password: string;
  gradeId: string;
  classId: string;
  nationalId?: string;
  fatherName?: string;
  motherName?: string;
  phone?: string;
  emergencyPhone?: string;
}): Promise<{ student: Student; parent: Parent; parentPassword: string }> {
  await sleep(LATENCY_MS / 2);
  const studentsFile = readDb<StudentsFile>("students");
  const parentsFile = readDb<ParentsFile>("parents");
  const exists = studentsFile.students.find((s) => s.username.toLowerCase() === payload.username.toLowerCase());
  if (exists) throw new Error("نام کاربری دانش‌آموز قبلاً وجود دارد");
  const parentPassword = generatePassword();
  const stHash = await hashPassword(payload.password);
  const parHash = await hashPassword(parentPassword);
  const stId = nextId("st");
  const parId = nextId("par");
  const student: Student = {
    id: stId,
    role: "student",
    fullName: payload.fullName,
    username: payload.username,
    passwordHash: stHash.hash,
    salt: stHash.salt,
    accessCode: generateAccessCode("student"),
    createdAt: new Date().toISOString(),
    gradeId: payload.gradeId,
    classId: payload.classId,
    nationalId: payload.nationalId || undefined,
    fatherName: payload.fatherName || "",
    motherName: payload.motherName || "",
    phone: payload.phone || "",
    emergencyPhone: payload.emergencyPhone || "",
    parentUserId: parId,
  };
  const parentUsername = `parent_${payload.username.trim()}`;
  const parent: Parent = {
    id: parId,
    role: "parent",
    fullName: payload.fatherName ? `${payload.fatherName} (والدین)` : "والدین",
    username: parentUsername,
    passwordHash: parHash.hash,
    salt: parHash.salt,
    accessCode: generateAccessCode("parent"),
    createdAt: new Date().toISOString(),
    studentId: stId,
  };
  updateDb<StudentsFile>("students", (d) => ({ ...d, students: [...d.students, student] }));
  updateDb<ParentsFile>("parents", (d) => ({ ...d, parents: [...d.parents, parent] }));
  logActivity("admin", "مدیر", `دانش‌آموز «${student.fullName}» اضافه شد`);
  recompute();
  return { student, parent, parentPassword };
}

export async function addTeacherRecord(payload: {
  fullName: string;
  username: string;
  password: string;
  assignments: { lessonId: string; gradeId: string; classId: string }[];
}): Promise<{ teacher: Teacher }> {
  await sleep(LATENCY_MS / 2);
  const teachersFile = readDb<TeachersFile>("teachers");
  const exists = teachersFile.teachers.find((t) => t.username.toLowerCase() === payload.username.toLowerCase());
  if (exists) throw new Error("نام کاربری دبیر قبلاً وجود دارد");
  const h = await hashPassword(payload.password);
  const teacher: Teacher = {
    id: nextId("tch"),
    role: "teacher",
    fullName: payload.fullName,
    username: payload.username,
    passwordHash: h.hash,
    salt: h.salt,
    accessCode: generateAccessCode("teacher"),
    createdAt: new Date().toISOString(),
    assignments: payload.assignments.map((a) => ({ lessonId: a.lessonId, gradeId: a.gradeId, classId: a.classId })),
  };
  updateDb<TeachersFile>("teachers", (d) => ({ ...d, teachers: [...d.teachers, teacher] }));
  logActivity("admin", "مدیر", `دبیر «${teacher.fullName}» اضافه شد`);
  recompute();
  return { teacher };
}

/* ================= teacher ================= */

export interface TeacherClassView {
  lessonId: string;
  lessonName: string;
  classId: string;
  classLabel: string;
  students: { id: string; name: string; risk: number; level: string; avg: number }[];
}

export interface TeacherHomeData {
  classes: TeacherClassView[];
  stats: { studentCount: number; avgScore: number; homeworks: number; exams: number; riskStudents: number };
  riskStudents: { id: string; name: string; classLabel: string; risk: number; topReason: string }[];
  recentExams: { id: string; name: string; date: string; scoresCount: number }[];
  recentHomeworks: { id: string; title: string; lessonName: string; dueDate: string; classLabel: string; done: number; total: number }[];
}

export async function teacherHome(teacherId: string): Promise<TeacherHomeData> {
  await sleep(LATENCY_MS);
  const teacher = readDb<TeachersFile>("teachers").teachers.find((t) => t.id === teacherId);
  const students = readDb<StudentsFile>("students");
  const grades = readDb<GradesFile>("grades");
  const ai = readDb<AiFile>("ai-analysis");
  const L = labels();
  if (!teacher) {
    return { classes: [], stats: { studentCount: 0, avgScore: 0, homeworks: 0, exams: 0, riskStudents: 0 }, riskStudents: [], recentExams: [], recentHomeworks: [] };
  }
  const myClassIds = new Set(teacher.assignments.map((a) => a.classId));
  const myLessonIds = new Set(teacher.assignments.map((a) => a.lessonId));
  const myStudents = students.students.filter((s) => myClassIds.has(s.classId));
  const myExamIds = new Set(grades.exams.filter((e) => myClassIds.has(e.classId) && myLessonIds.has(e.lessonId)).map((e) => e.id));
  const myScores = grades.examScores.filter((s) => myExamIds.has(s.examId) && myStudents.some((st) => st.id === s.studentId));
  const hw = students.homeworks.filter((h) => myClassIds.has(h.classId) && myLessonIds.has(h.lessonId));

  const classes: TeacherClassView[] = teacher.assignments.map((a) => ({
    lessonId: a.lessonId,
    lessonName: L.lessonName(a.lessonId),
    classId: a.classId,
    classLabel: L.classLabel(a.classId),
    students: students.students
      .filter((s) => s.classId === a.classId)
      .map((s) => {
        const an = ai.analyses.find((x) => x.studentId === s.id);
        return { id: s.id, name: s.fullName, risk: an?.riskScore ?? 0, level: an?.level ?? "low", avg: an?.overallAvg ?? 0 };
      }),
  }));

  return {
    classes,
    stats: {
      studentCount: myStudents.length,
      avgScore: avgOf(myScores.map((s) => (s.score / s.maxScore) * MAX_SCORE)),
      homeworks: hw.length,
      exams: myExamIds.size,
      riskStudents: myStudents.filter((s) => (ai.analyses.find((a) => a.studentId === s.id)?.riskScore ?? 0) >= HIGH_RISK_THRESHOLD).length,
    },
    riskStudents: ai.analyses
      .filter((a) => myStudents.some((s) => s.id === a.studentId))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5)
      .map((a) => {
        const st = myStudents.find((s) => s.id === a.studentId);
        return { id: a.studentId, name: st?.fullName ?? "؟", classLabel: st ? L.classLabel(st.classId) : "؟", risk: a.riskScore, topReason: a.reasons[0] ?? "—" };
      }),
    recentExams: grades.exams
      .filter((e) => myExamIds.has(e.id))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6)
      .map((e) => ({ id: e.id, name: `${L.lessonName(e.lessonId)} — ${L.classLabel(e.classId)}`, date: e.date, scoresCount: grades.examScores.filter((s) => s.examId === e.id).length })),
    recentHomeworks: hw
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6)
      .map((h) => ({
        id: h.id,
        title: h.title,
        lessonName: L.lessonName(h.lessonId),
        dueDate: h.dueDate,
        classLabel: L.classLabel(h.classId),
        done: students.homeworkSubmissions.filter((s) => s.homeworkId === h.id && s.completed).length,
        total: students.homeworkSubmissions.filter((s) => s.homeworkId === h.id).length,
      })),
  };
}

export function saveAttendance(classId: string, date: string, marks: Record<string, AttendanceStatus>, teacherName: string): void {
  updateDb<StudentsFile>("students", (d) => ({
    ...d,
    attendance: [
      ...d.attendance.filter((a) => !(a.classId === classId && a.date === date)),
      ...Object.entries(marks).map(([studentId, status]) => ({ id: nextId("att"), studentId, date, status, classId })),
    ],
  }));
  logActivity("teacher", teacherName, `حضور و غیاب ${date} ذخیره شد`);
  recompute();
}

export function addHomework(lessonId: string, classId: string, title: string, dueDate: string, teacherId: string, teacherName: string): void {
  updateDb<StudentsFile>("students", (d) => ({
    ...d,
    homeworks: [...d.homeworks, { id: nextId("hw"), lessonId, classId, title, dueDate, createdById: teacherId, createdAt: new Date().toISOString() }],
  }));
  logActivity("teacher", teacherName, `تکلیف «${title}» ایجاد شد`);
}

export function toggleHomework(hwId: string, studentId: string, completed: boolean): void {
  updateDb<StudentsFile>("students", (d) => {
    const existing = d.homeworkSubmissions.find((s) => s.homeworkId === hwId && s.studentId === studentId);
    const subs = existing
      ? d.homeworkSubmissions.map((s) => (s.id === existing.id ? { ...s, completed, submittedAt: completed ? new Date().toISOString() : undefined } : s))
      : [...d.homeworkSubmissions, { id: nextId("hws"), homeworkId: hwId, studentId, completed, submittedAt: completed ? new Date().toISOString() : undefined }];
    return { ...d, homeworkSubmissions: subs };
  });
  recompute();
}

export function addExam(name: string, lessonId: string, classId: string, date: string, teacherId: string, teacherName: string): string {
  const id = nextId("ex");
  updateDb<GradesFile>("grades", (d) => ({ ...d, exams: [...d.exams, { id, name, lessonId, classId, date, createdById: teacherId }] }));
  logActivity("teacher", teacherName, `آزمون «${name}» ثبت شد`);
  return id;
}

export function saveExamScores(examId: string, scores: Record<string, number>, teacherName: string): void {
  updateDb<GradesFile>("grades", (d) => ({
    ...d,
    examScores: [
      ...d.examScores.filter((s) => s.examId !== examId),
      ...Object.entries(scores).map(([studentId, score]) => ({ id: nextId("sc"), examId, studentId, score: clampNum(score, 0, MAX_SCORE), maxScore: MAX_SCORE })),
    ],
  }));
  logActivity("teacher", teacherName, "نمرات آزمون ثبت شد");
  recompute();
}

export function addBehavior(studentId: string, type: BehaviorType, note: string, teacherId: string, teacherName: string): void {
  updateDb<StudentsFile>("students", (d) => ({
    ...d,
    behaviorReports: [...d.behaviorReports, { id: nextId("bh"), studentId, byTeacherId: teacherId, date: new Date().toISOString(), type, note }],
  }));
  logActivity("teacher", teacherName, `گزارش رفتاری ${type === "positive" ? "مثبت" : "منفی"} ثبت شد`);
  recompute();
}

/* ================= consultant ================= */

export interface ConsultantHomeData {
  riskStudents: { id: string; name: string; classLabel: string; risk: number; level: string; reasons: string[]; recommendations: string[]; stress: number; attendance: number }[];
  recentForms: { studentId: string; name: string; week: string; stress: number; mood: number; motivation: number; at: string }[];
  alerts: AlertNamed[];
  suggestions: { studentId: string; name: string; text: string; severity: string }[];
}

export async function consultantHome(): Promise<ConsultantHomeData> {
  await sleep(LATENCY_MS);
  const students = readDb<StudentsFile>("students");
  const notes = readDb<NotesFile>("notes");
  const ai = readDb<AiFile>("ai-analysis");
  const L = labels();

  const riskStudents = ai.analyses
    .sort((a, b) => b.riskScore - a.riskScore)
    .map((a) => {
      const st = students.students.find((s) => s.id === a.studentId);
      return {
        id: a.studentId,
        name: st?.fullName ?? "؟",
        classLabel: st ? L.classLabel(st.classId) : "؟",
        risk: a.riskScore,
        level: a.level,
        reasons: a.reasons,
        recommendations: a.recommendations,
        stress: Math.round(a.stressIndex),
        attendance: Math.round(a.attendanceRate),
      };
    });

  const recentForms = [...notes.wellnessForms]
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .slice(0, 10)
    .map((w) => {
      const st = students.students.find((s) => s.id === w.studentId);
      const idx = wellnessIndices(w.answers);
      return { studentId: w.studentId, name: st?.fullName ?? "؟", week: w.week, stress: Math.round(idx.stress), mood: w.answers.mood, motivation: Math.round(idx.motivation), at: w.submittedAt };
    });

  const alerts: AlertNamed[] = notes.alerts
    .map((a) => ({ ...a, studentName: students.students.find((s) => s.id === a.studentId)?.fullName ?? "؟" }))
    .slice(0, 8);

  const suggestions = ai.analyses
    .filter((a) => a.riskScore >= RISK_SUGGESTION_FROM)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 6)
    .map((a) => ({
      studentId: a.studentId,
      name: students.students.find((s) => s.id === a.studentId)?.fullName ?? "؟",
      text: a.recommendations.slice(0, 2).join("؛ "),
      severity: a.level,
    }));

  return { riskStudents, recentForms, alerts, suggestions };
}

export function addConsultantNote(studentId: string, text: string, authorName: string): void {
  updateDb<NotesFile>("notes", (d) => ({
    ...d,
    notes: [...d.notes, { id: nextId("nt"), authorId: "consultant", authorName, studentId, date: new Date().toISOString(), text, kind: "consultant" }],
  }));
  logActivity("consultant", authorName, "یادداشت مشاوره ثبت شد");
}

export interface TimelineEvent {
  id: string;
  at: string;
  icon: string;
  title: string;
  desc: string;
}

export async function timeline(studentId: string): Promise<{ student: Student; events: TimelineEvent[]; analysis: StudentAnalysis | null }> {
  const r = await studentReport(studentId);
  return { student: r.student, events: r.timeline, analysis: r.analysis };
}

/* ================= parent ================= */

export interface ParentHomeData {
  parent: Parent;
  child: Student;
  classLabel: string;
  analysis: StudentAnalysis | null;
  progressSeries: { label: string; avg: number }[];
  attendance: { present: number; absent: number; late: number };
  homeworks: { title: string; lessonName: string; dueDate: string; completed: boolean }[];
  notes: Note[];
  alerts: AlertNamed[];
  insights: { bestStudyTime: string; sleepAdvice: string; weakLessons: string[]; activities: string[]; weeklyReport: string };
  plan: StudyPlan | null;
}

export async function parentHome(parentId: string): Promise<ParentHomeData> {
  await sleep(LATENCY_MS);
  const parents = readDb<ParentsFile>("parents").parents;
  const parent = parents.find((p) => p.id === parentId) ?? parents[0];
  const r = await studentReport(parent.studentId);
  const child = r.student;
  const a = r.analysis;
  const books = readDb<BooksFile>("books");
  const ai = readDb<AiFile>("ai-analysis");
  const allAlerts = await alertsList();

  const bestStudyTime = a && a.motivation > 68 ? "صبح زود (۷ تا ۱) — بالاترین تمرکز در ساعات صبحگاهی" : "بعدازظهر (۱۶ تا ۲۰) — برای این دانش‌آموز، تمرکز عصرگاهی بهتر است";
  const sleepAdvice =
    a && a.stressIndex > 55
      ? "خواب نامنظم شناسایی شد: خواب منظم قبل از ۲۳:۰۰ و کاهش صفحه‌نمایش پس از ۲۲:۰۰"
      : "برنامه خواب مناسب است؛ حفظ ساعت منظم خواب (۷ تا ۸ ساعت) توصیه می‌شود";
  const weakLessons = a ? a.predictions.filter((p) => p.currentAvg < 12).map((p) => books.lessons.find((l) => l.id === p.lessonId)?.name ?? "").filter(Boolean) : [];
  const activities = [
    a && a.riskScore >= HIGH_RISK_THRESHOLD ? "پیاده‌روی روزانه ۳۰ دقیقه‌ای و کاهش فشار آزمون" : "فعالیت ورزشی سبک در آخر هفته",
    "یک جلسه گفتگوی هفتگی بدون موبایل",
    "جشن کوچک برای هر پیشرفت کوچک",
  ];
  const weeklyReport = a
    ? `میانگین فعلی ${a.overallAvg.toFixed(1)} از ۲۰ با ${a.learningSpeed >= 0 ? "روند صعودی" : "روند نزولی"}. نرخ حضور ${Math.round(a.attendanceRate)}٪. ` +
      (a.riskScore >= HIGH_RISK_THRESHOLD ? "وضعیت نیازمند پیگیری فوری با مشاور است. " : "در حال حاضر وضعیت نیازمند توجه ویژه نیست. ") +
      `توصیه اصلی: ${a.recommendations[0] ?? "—"}`
    : "داده کافی برای تولید گزارش هفتگی وجود ندارد.";

  return {
    parent,
    child,
    classLabel: r.classLabel,
    analysis: a,
    progressSeries: r.progressSeries,
    attendance: r.attendance,
    homeworks: r.homeworks.map((h) => ({ title: h.title, lessonName: h.lessonName, dueDate: h.dueDate, completed: h.completed })),
    notes: r.notes,
    alerts: allAlerts.filter((x) => x.studentId === child.id),
    insights: { bestStudyTime, sleepAdvice, weakLessons, activities, weeklyReport },
    plan: ai.studyPlans.find((p) => p.studentId === child.id) ?? null,
  };
}

/* ================= student ================= */

export interface StudentHomeData {
  me: Student;
  classLabel: string;
  analysis: StudentAnalysis | null;
  progressSeries: { label: string; avg: number }[];
  subjectAverages: { name: string; avg: number; predicted: number; importance: number; passProbability: number | null; declineProbability: number | null }[];
  homeworks: { id: string; title: string; lessonName: string; dueDate: string; completed: boolean }[];
  attendance: { present: number; absent: number; late: number };
  plan: StudyPlan | null;
  guidance: GuidanceResult;
  achievements: { id: string; label: string; desc: string; unlocked: boolean }[];
  wellnessLast: { week: string; answers: WellnessAnswers; at: string } | null;
  wellnessPending: boolean;
}

export async function studentHome(studentId: string): Promise<StudentHomeData> {
  await sleep(LATENCY_MS);
  const students = readDb<StudentsFile>("students");
  const me = students.students.find((s) => s.id === studentId) ?? students.students[0];
  const r = await studentReport(me.id);
  const ai = readDb<AiFile>("ai-analysis");
  const notes = readDb<NotesFile>("notes");
  const grades = readDb<GradesFile>("grades");
  const a = r.analysis;
  const plan = ai.studyPlans.find((p) => p.studentId === me.id) ?? null;

  const myForms = notes.wellnessForms.filter((w) => w.studentId === me.id).sort((x, y) => y.submittedAt.localeCompare(x.submittedAt));
  const wellnessLast = myForms.length > 0 ? { week: myForms[0].week, answers: myForms[0].answers, at: myForms[0].submittedAt } : null;

  const hwTotal = students.homeworkSubmissions.filter((s) => s.studentId === me.id);
  const hwDone = hwTotal.filter((s) => s.completed).length;

  const achievements: StudentHomeData["achievements"] = [
    { id: "top", label: "مدرک ممتاز", desc: "حداقل یک نمره ۱۹ یا بالاتر", unlocked: grades.examScores.some((s) => s.studentId === me.id && s.score >= 19) },
    { id: "avg", label: "میانگین برتر", desc: "میانگین کلی بالای ۱۵", unlocked: (a?.overallAvg ?? 0) >= 15 },
    { id: "att", label: "قهرمان حضور", desc: "حضور ۹۰٪ یا بیشتر", unlocked: (a?.attendanceRate ?? 0) >= 90 },
    { id: "hw", label: "تکلیف‌شناس", desc: "انجام ۹۰٪ تکالیف", unlocked: hwTotal.length >= 5 && hwDone / Math.max(hwTotal.length, 1) >= 0.9 },
    { id: "well", label: "مراقب سلامت", desc: "ثبت ۴ فرم سلامت روان", unlocked: myForms.length >= 4 },
    { id: "up", label: "روند صعودی", desc: "شیب مثبت نمرات", unlocked: (a?.learningSpeed ?? 0) > 0.2 },
    { id: "safe", label: "وضعیت پایدار", desc: "ریسک زیر ۲۵", unlocked: !!a && a.riskScore < 25 },
  ];

  return {
    me,
    classLabel: r.classLabel,
    analysis: a,
    progressSeries: r.progressSeries,
    subjectAverages: r.subjectAverages,
    homeworks: r.homeworks,
    attendance: r.attendance,
    plan,
    guidance: r.guidance,
    achievements,
    wellnessLast,
    wellnessPending: !myForms.some((w) => w.week === weekKey()),
  };
}

export function submitWellness(studentId: string, answers: WellnessAnswers): void {
  updateDb<NotesFile>("notes", (d) => ({
    ...d,
    wellnessForms: [
      ...d.wellnessForms.filter((w) => !(w.studentId === studentId && w.week === weekKey())),
      { id: nextId("wf"), studentId, week: weekKey(), answers, submittedAt: new Date().toISOString() },
    ],
  }));
  logActivity("student", "دانش‌آموز", "فرم هفتگی سلامت روان ثبت شد");
  recompute();
}

export function submitHomework(studentId: string, hwId: string): void {
  toggleHomework(hwId, studentId, true);
}

/* ================= misc helpers for pages ================= */

export function classOptions(): { classId: string; label: string }[] {
  const L = labels();
  return readDb<GradesFile>("grades").classes.map((c) => ({ classId: c.id, label: L.classLabel(c.id) }));
}

export function lessonOptions(): Lesson[] {
  return readDb<BooksFile>("books").lessons;
}

export function studentsOfClass(classId: string): Student[] {
  return readDb<StudentsFile>("students").students.filter((s) => s.classId === classId);
}

export function allStudents(): Student[] {
  return readDb<StudentsFile>("students").students;
}

export function existingAttendance(classId: string, date: string): Record<string, AttendanceStatus> {
  const recs = readDb<StudentsFile>("students").attendance.filter((a) => a.classId === classId && a.date === date);
  const out: Record<string, AttendanceStatus> = {};
  for (const r of recs) out[r.studentId] = r.status;
  return out;
}

export function examScoresOf(examId: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of readDb<GradesFile>("grades").examScores.filter((x) => x.examId === examId)) out[s.studentId] = s.score;
  return out;
}

export function examsOf(lessonId: string, classId: string): Exam[] {
  return readDb<GradesFile>("grades").exams.filter((e) => e.lessonId === lessonId && e.classId === classId).sort((a, b) => b.date.localeCompare(a.date));
}

export function homeworksOfClass(classId: string): { id: string; title: string; lessonId: string; lessonName: string; dueDate: string; submissions: Record<string, boolean> }[] {
  const st = readDb<StudentsFile>("students");
  const L = labels();
  return st.homeworks
    .filter((h) => h.classId === classId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((h) => {
      const submissions: Record<string, boolean> = {};
      for (const s of st.homeworkSubmissions.filter((x) => x.homeworkId === h.id)) submissions[s.studentId] = s.completed;
      return { id: h.id, title: h.title, lessonId: h.lessonId, lessonName: L.lessonName(h.lessonId), dueDate: h.dueDate, submissions };
    });
}

export function behaviorOf(studentId: string): { id: string; date: string; type: BehaviorType; note: string }[] {
  return readDb<StudentsFile>("students").behaviorReports.filter((b) => b.studentId === studentId);
}

export function allExams(): Exam[] {
  return readDb<GradesFile>("grades").exams;
}
