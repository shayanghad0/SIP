/**
 * SIP — Intelligent Analytics Engine
 * =================================
 * All algorithms of the platform live here. Every model is deterministic,
 * documented, and built from the raw JSON collections only.
 *
 *  1. Early Warning Risk Score  (0–100, weighted multi-factor)
 *  2. Mental-health / wellness indices (weekly 8-item form)
 *  3. Grade prediction          (linear regression + logistic pass model)
 *  4. Dropout / stress probability
 *  5. Teacher analytics         (efficiency, difficulty index, improvement)
 *  6. Cheating / anomaly detection (deviation + similarity heuristics)
 *  7. Personalized study planner (need-based weekly distribution)
 *  8. Smart academic guidance   (subject profile → track matching)
 */

import type {
  BehaviorReport,
  CheatingFlag,
  Exam,
  ExamScore,
  GuidanceResult,
  Homework,
  HomeworkSubmission,
  Lesson,
  RiskFactor,
  RiskLevel,
  Student,
  StudentAnalysis,
  StudyBlock,
  StudyPlan,
  SubjectPrediction,
  TeacherAnalytics,
  WellnessAnswers,
  WellnessForm,
} from "./types";

/* ------------------------- constants (no magic numbers) ------------------------- */

export const MAX_SCORE = 20;
export const PASS_SCORE = 10;

export const RISK_WEIGHTS = {
  academic: 25,
  attendance: 20,
  homework: 15,
  wellness: 15,
  trend: 10,
  behavior: 10,
  lateness: 5,
} as const;

export const RISK_LEVEL_LIMITS = { low: 25, medium: 50, high: 75 } as const;
export const HIGH_RISK_THRESHOLD = 75;
export const STRESS_ALERT_THRESHOLD = 70;
export const DECLINE_SLOPE_THRESHOLD = -0.8;

const STUDY_DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه"] as const;
const WEEK_TARGET_MINUTES = 780; // ~13h per week
const DAILY_CAP_MINUTES = 180;
const BLOCK_STEP_MINUTES = 15;
const MIN_BLOCK_MINUTES = 15;
const MAX_BLOCK_MINUTES = 120;
const WEAK_AVG_THRESHOLD = 12;
const GOOD_AVG_THRESHOLD = 18;
const REGRESSION_FORECAST_HORIZON = 1;
const PASS_LOGISTIC_K = 0.62;
const CONFIDENCE_BASE = 30;
const CONFIDENCE_PER_EVENT = 6;
const CONFIDENCE_CAP = 92;
const CHEAT_DEVIATION = 4;
const CHEAT_PAIR_TOLERANCE = 1;
const PATTERN_CORRELATION_LIMIT = 0.975;
const PATTERN_MEAN_DIFF_LIMIT = 0.6;

/* ------------------------- small math utilities ------------------------- */

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function round5(v: number): number {
  return Math.round(v / BLOCK_STEP_MINUTES) * BLOCK_STEP_MINUTES;
}

/** Least-squares line through points (i, v). */
export function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  return { slope, intercept: (sumY - slope * sumX) / n };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

/** Pearson correlation of two equally sized series. */
function correlation(a: number[], b: number[]): number {
  if (a.length < 3 || a.length !== b.length) return 0;
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i += 1) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  if (da === 0 || db === 0) return 0;
  return num / Math.sqrt(da * db);
}

/** Logistic pass probability — 50% at PASS_SCORE. */
export function passProbability(avg: number): number {
  return clamp((1 / (1 + Math.exp(-PASS_LOGISTIC_K * (avg - PASS_SCORE)))) * 100, 2, 99);
}

/* ------------------------- wellness indices ------------------------- */

export interface WellnessIndices {
  stress: number; // 0..100
  anxiety: number; // 0..100
  motivation: number; // 0..100
  sleep: number; // 0..100 quality
  overall: number; // 0..100 health
}

export function wellnessIndices(answers: WellnessAnswers): WellnessIndices {
  const stress = (answers.stress / 5) * 100;
  const anxiety = ((answers.pressure * 2 + answers.stress) / 3 / 5) * 100;
  const motivation = ((answers.motivation + answers.focus) / 2 / 5) * 100;
  const sleep = (answers.sleep / 5) * 100;
  const overall =
    100 -
    (0.3 * stress +
      0.25 * anxiety +
      0.2 * (100 - motivation) +
      0.15 * (100 - sleep) +
      0.1 * (100 - (answers.mood / 5) * 100));
  return {
    stress: clamp(stress, 0, 100),
    anxiety: clamp(anxiety, 0, 100),
    motivation: clamp(motivation, 0, 100),
    sleep: clamp(sleep, 0, 100),
    overall: clamp(overall, 0, 100),
  };
}

/* ------------------------- risk engine ------------------------- */

export interface StudentSnapshot {
  student: Student;
  /** per-lesson chronological scores */
  series: { lessonId: string; scores: { date: string; value: number; max: number }[] }[];
  attendance: { present: number; absent: number; late: number };
  homework: { assigned: number; completed: number };
  behavior: { positive: number; negative: number };
  wellness: WellnessForm[]; // chronological
  classAvg: number;
}

export function riskLevel(score: number): RiskLevel {
  if (score < RISK_LEVEL_LIMITS.low) return "low";
  if (score < RISK_LEVEL_LIMITS.medium) return "medium";
  if (score < RISK_LEVEL_LIMITS.high) return "high";
  return "critical";
}

export function analyzeStudent(snap: StudentSnapshot, lessons: Lesson[]): StudentAnalysis {
  const { attendance, homework, behavior, wellness } = snap;

  const allValues = snap.series.flatMap((s) => s.scores.map((p) => (p.value / p.max) * MAX_SCORE));

  // No data yet → all zeros
  const hasAnyData = allValues.length > 0 || (attendance.present + attendance.absent + attendance.late) > 0 || homework.assigned > 0 || (behavior.positive + behavior.negative) > 0 || wellness.length > 0;
  if (!hasAnyData) {
    return {
      studentId: snap.student.id,
      riskScore: 0,
      level: "low",
      factors: [
        { key: "academic", label: "میانگین نمرات", weight: RISK_WEIGHTS.academic, score: 0 },
        { key: "attendance", label: "غیبت و شرکت", weight: RISK_WEIGHTS.attendance, score: 0 },
        { key: "homework", label: "تکالیف", weight: RISK_WEIGHTS.homework, score: 0 },
        { key: "wellness", label: "سلامت روان", weight: RISK_WEIGHTS.wellness, score: 0 },
        { key: "trend", label: "روند نمرات", weight: RISK_WEIGHTS.trend, score: 0 },
        { key: "behavior", label: "رفتار کلاسی", weight: RISK_WEIGHTS.behavior, score: 0 },
        { key: "lateness", label: "دیررس‌ها", weight: RISK_WEIGHTS.lateness, score: 0 },
      ],
      reasons: [],
      recommendations: [],
      predictions: [],
      overallAvg: 0,
      classAvg: snap.classAvg,
      attendanceRate: 0,
      homeworkRate: 0,
      stressIndex: 0,
      anxietyIndex: 0,
      motivation: 0,
      dropoutProbability: 0,
      learningSpeed: 0,
      confidence: 0,
      predictedSemesterAvg: 0,
      updatedAt: new Date().toISOString(),
    };
  }
  const overallAvg = mean(allValues);

  // Exam-level series (avg of all scores on that exam date) for trend.
  const byDate = new Map<string, number[]>();
  for (const s of snap.series) {
    for (const p of s.scores) {
      const arr = byDate.get(p.date) ?? [];
      arr.push((p.value / p.max) * MAX_SCORE);
      byDate.set(p.date, arr);
    }
  }
  const examSeries = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, vals]) => mean(vals));
  const { slope } = linearRegression(examSeries);

  const attTotal = attendance.present + attendance.absent + attendance.late;
  const presentRate = attTotal > 0 ? attendance.present / attTotal : 1;
  const lateRate = attTotal > 0 ? attendance.late / attTotal : 0;
  const hwRate = homework.assigned > 0 ? homework.completed / homework.assigned : 0.85;
  const behaviorTotal = behavior.positive + behavior.negative;
  const behaviorNegRatio = behaviorTotal > 0 ? behavior.negative / behaviorTotal : 0.15;

  const recentForms = wellness.slice(-3);
  const lastIdx = recentForms.length > 0 ? wellnessIndices(recentForms[recentForms.length - 1].answers) : null;
  const stressIndex = lastIdx ? lastIdx.stress : 20;
  const anxietyIndex = lastIdx ? lastIdx.anxiety : 20;
  const motivation = lastIdx ? lastIdx.motivation : 70;
  const stressAvg = recentForms.length > 0 ? mean(recentForms.map((f) => wellnessIndices(f.answers).stress)) : 20;

  /* factor scores (each 0..100 = badness) */
  const hasGrades = allValues.length > 0;
  const fAcademic = hasGrades ? clamp((1 - overallAvg / MAX_SCORE) * 100, 0, 100) : 30; // neutral when no data
  const fAttendance = (1 - presentRate) * 100;
  const fLateness = clamp(lateRate * 250, 0, 100);
  const fHomework = (1 - hwRate) * 100;
  const fTrend = slope < 0 ? clamp(-slope * 30, 0, 100) : 0;
  const fBehavior = behaviorNegRatio * 100;
  const fWellness =
    (0.45 * stressAvg + 0.3 * (100 - motivation) + 0.25 * (100 - (lastIdx ? lastIdx.sleep : 60))) ;

  const factors: RiskFactor[] = [
    { key: "academic", label: "میانگین نمرات", weight: RISK_WEIGHTS.academic, score: clamp(fAcademic, 0, 100) },
    { key: "attendance", label: "غیبت و شرکت", weight: RISK_WEIGHTS.attendance, score: clamp(fAttendance, 0, 100) },
    { key: "homework", label: "تکالیف", weight: RISK_WEIGHTS.homework, score: clamp(fHomework, 0, 100) },
    { key: "wellness", label: "سلامت روان", weight: RISK_WEIGHTS.wellness, score: clamp(fWellness, 0, 100) },
    { key: "trend", label: "روند نمرات", weight: RISK_WEIGHTS.trend, score: fTrend },
    { key: "behavior", label: "رفتار کلاسی", weight: RISK_WEIGHTS.behavior, score: clamp(fBehavior, 0, 100) },
    { key: "lateness", label: "دیررس‌ها", weight: RISK_WEIGHTS.lateness, score: fLateness },
  ];

  const riskScore = Math.round(clamp(factors.reduce((s, f) => s + (f.score * f.weight) / 100, 0), 0, 100));

  /* per-subject predictions */
  const predictions: SubjectPrediction[] = snap.series
    .filter((s) => s.scores.length > 0)
    .map((s) => {
      const values = s.scores.map((p) => (p.value / p.max) * MAX_SCORE);
      const reg = linearRegression(values);
      const currentAvg = mean(values);
      const predictedAvg = clamp(reg.slope * (values.length - 1 + REGRESSION_FORECAST_HORIZON) + reg.intercept, 0, MAX_SCORE);
      const decline = clamp(
        (reg.slope < 0 ? Math.abs(reg.slope) * 40 : 0) +
          (currentAvg < PASS_SCORE ? 40 : Math.max(0, (PASS_SCORE - currentAvg) * 4)),
        0,
        95,
      );
      return {
        lessonId: s.lessonId,
        currentAvg: currentAvg,
        predictedAvg,
        passProbability: passProbability(predictedAvg),
        declineProbability: decline,
        trendSlope: reg.slope,
      };
    });

  const predictedSemesterAvg = clamp(overallAvg + slope * 1.5, 0, MAX_SCORE);
  const dropoutProbability = clamp(
    0.45 * riskScore + 0.25 * stressIndex + 0.2 * (100 - presentRate * 100) + 0.1 * (100 - motivation),
    0,
    100,
  );

  const n = examSeries.length;
  const residuals = examSeries.map((v, i) => v - (linearRegression(examSeries).intercept + linearRegression(examSeries).slope * i));
  const confidence =
    n === 0
      ? 15
      : clamp(CONFIDENCE_BASE + n * CONFIDENCE_PER_EVENT - clamp(stddev(residuals) * 8, 0, 20), 5, CONFIDENCE_CAP);

  /* reasons (Persian) */
  const reasons: string[] = [];
  if (hasGrades && fAcademic > 55) reasons.push(`میانگین نمرات در حد ${Math.round((overallAvg / MAX_SCORE) * 100)}٪ از سقف ${MAX_SCORE}`);
  if (fAttendance > 30) reasons.push(`نرخ غیبت ${Math.round((1 - presentRate) * 100)}٪ — نیازمند پیگیری`);
  if (fTrend > 30) reasons.push(`افت ${Math.round(Math.abs(slope) * 100)} نمره در هر آزمون`);
  if (fHomework > 50) reasons.push(`فقط ${Math.round(hwRate * 100)}٪ تکالیف انجام شده`);
  if (fWellness > 55) reasons.push("شاخص استرس و فشار در فرم‌های سلامت روان بالا است");
  if (fBehavior > 40) reasons.push("گزارش‌های رفتاری منفی ثبت شده است");
  if (fLateness > 40) reasons.push(`نرخ دیررس ${Math.round(lateRate * 100)}٪`);

  /* recommendations */
  const recommendations: string[] = [];
  if (riskScore >= HIGH_RISK_THRESHOLD) recommendations.push("اعلام وضعیت به والدین و تشکیل پرونده پیگیری");
  if (riskScore >= RISK_LEVEL_LIMITS.high) recommendations.push("جلسه هماهنگی با مشاور تحصیلی");
  const weak = predictions.filter((p) => p.currentAvg < WEAK_AVG_THRESHOLD).sort((a, b) => a.currentAvg - b.currentAvg);
  if (weak.length > 0) {
    const weakNames = weak.map((w) => lessons.find((l) => l.id === w.lessonId)?.name ?? "درس").slice(0, 2).join("، ");
    recommendations.push(`برنامه جبرانی برای ${weakNames}`);
  }
  if (fAttendance > 25) recommendations.push("پیگیری دلایل غیبت و هماهنگی با خانواده");
  if (fWellness > 55) recommendations.push("برنامه استرس‌زدایی و گفتگوی خانوادگی");
  if (fHomework > 45) recommendations.push("نظارت بر تکالیف و برنامه مطالعه در منزل");
  if (recommendations.length === 0) recommendations.push("وضعیت مطلوب — حفظ برنامه مطالعه فعلی");

  return {
    studentId: snap.student.id,
    riskScore,
    level: riskLevel(riskScore),
    factors,
    reasons,
    recommendations,
    predictions,
    overallAvg,
    classAvg: snap.classAvg,
    attendanceRate: presentRate * 100,
    homeworkRate: hwRate * 100,
    stressIndex,
    anxietyIndex,
    motivation,
    dropoutProbability,
    learningSpeed: slope,
    confidence,
    predictedSemesterAvg,
    updatedAt: new Date().toISOString(),
  };
}

/* ------------------------- study planner ------------------------- */

export function buildStudyPlan(
  studentId: string,
  perLesson: { lesson: Lesson; avg: number; hasData: boolean }[],
): StudyPlan {
  const enriched = perLesson
    .filter((p) => p.lesson)
    .map((p) => {
      const avg = p.hasData ? p.avg : 12;
      const need = p.lesson.importance * (1 - avg / MAX_SCORE);
      return { ...p, avg, need };
    })
    .sort((a, b) => b.need - a.need);

  const totalNeed = enriched.reduce((s, e) => s + e.need, 0) || 1;

  const blocksByLesson = enriched.map((e) => {
    const raw = (e.need / totalNeed) * WEEK_TARGET_MINUTES;
    const minutes = clamp(round5(raw), MIN_BLOCK_MINUTES, MAX_BLOCK_MINUTES);
    const kind: StudyBlock["kind"] = e.avg < WEAK_AVG_THRESHOLD ? "test" : e.avg < GOOD_AVG_THRESHOLD ? "study" : "review";
    return { lessonId: e.lesson.id, minutes: e.avg >= GOOD_AVG_THRESHOLD ? MIN_BLOCK_MINUTES : minutes, kind, avg: e.avg };
  });

  const days: { day: string; blocks: StudyBlock[] }[] = STUDY_DAYS.map((day) => ({ day, blocks: [] }));
  const dayMinutes = STUDY_DAYS.map(() => 0);

  for (const b of blocksByLesson) {
    // split into max 2 blocks per day
    const chunks: number[] = b.minutes > 75 ? [b.minutes - 30, 30] : [b.minutes];
    for (const minutes of chunks) {
      let best = 0;
      for (let d = 1; d < days.length; d += 1) if (dayMinutes[d] < dayMinutes[best]) best = d;
      if (dayMinutes[best] + minutes > DAILY_CAP_MINUTES) {
        best = days.findIndex((_, i) => dayMinutes[i] + minutes <= DAILY_CAP_MINUTES);
      }
      if (best === -1) continue;
      days[best].blocks.push({ lessonId: b.lessonId, minutes, kind: b.kind });
      dayMinutes[best] += minutes;
    }
  }

  return {
    studentId,
    days,
    monthlyGoals: enriched.map((e) => ({
      lessonId: e.lesson.id,
      currentAvg: e.avg,
      targetAvg: clamp(Math.round(e.avg + (e.avg < GOOD_AVG_THRESHOLD ? 3 : 1) * 10) / 10, 0, MAX_SCORE),
    })),
    totalWeeklyMinutes: dayMinutes.reduce((s, m) => s + m, 0),
  };
}

/* ------------------------- teacher analytics ------------------------- */

export function computeTeacherAnalytics(
  teacher: { id: string; assignments: { lessonId: string; gradeId: string; classId: string }[] },
  ctx: {
    studentsByClass: Map<string, Student[]>;
    exams: Exam[];
    examScores: ExamScore[];
    homeworks: Homework[];
    submissions: HomeworkSubmission[];
  },
): TeacherAnalytics {
  const lessonIds = new Set(teacher.assignments.map((a) => a.lessonId));
  const classIds = new Set(teacher.assignments.map((a) => a.classId));
  const students = [...classIds].flatMap((c) => ctx.studentsByClass.get(c) ?? []);
  const studentIds = new Set(students.map((s) => s.id));
  const teacherExamIds = new Set(
    ctx.exams.filter((e) => lessonIds.has(e.lessonId) && classIds.has(e.classId)).map((e) => e.id),
  );
  const scores = ctx.examScores.filter((s) => studentIds.has(s.studentId) && teacherExamIds.has(s.examId));
  const values = scores.map((s) => (s.score / s.maxScore) * MAX_SCORE);
  const avgScore = mean(values);

  const byDate = new Map<string, number[]>();
  for (const s of scores) {
    const exam = ctx.exams.find((e) => e.id === s.examId);
    if (!exam) continue;
    const arr = byDate.get(exam.date) ?? [];
    arr.push((s.score / s.maxScore) * MAX_SCORE);
    byDate.set(exam.date, arr);
  }
  const series = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => mean(v));
  const { slope } = linearRegression(series);

  const hws = ctx.homeworks.filter((h) => lessonIds.has(h.lessonId) && classIds.has(h.classId));
  const hwIds = new Set(hws.map((h) => h.id));
  const relevantSubs = ctx.submissions.filter((s) => hwIds.has(s.homeworkId) && studentIds.has(s.studentId));
  const homeworkCompletion =
    relevantSubs.length > 0
      ? (relevantSubs.filter((s) => s.completed).length / relevantSubs.length) * 100
      : 80;

  const difficultyIndex = values.length > 0 ? clamp((1 - avgScore / MAX_SCORE) * 100, 0, 100) : 50;
  const efficiency = clamp(
    0.4 * (avgScore / MAX_SCORE) * 100 + 0.3 * clamp(50 + slope * 12, 0, 100) + 0.3 * homeworkCompletion,
    0,
    100,
  );

  return {
    teacherId: teacher.id,
    classCount: classIds.size,
    studentCount: students.length,
    avgScore,
    improvement: slope,
    difficultyIndex,
    homeworkCompletion,
    efficiency,
  };
}

/* ------------------------- cheating detection ------------------------- */

export function detectCheating(exams: Exam[], scores: ExamScore[], students: Student[]): CheatingFlag[] {
  const flags: CheatingFlag[] = [];
  const byLesson = new Map<string, Exam[]>();
  for (const e of exams) {
    const arr = byLesson.get(e.lessonId) ?? [];
    arr.push(e);
    byLesson.set(e.lessonId, arr);
  }
  for (const les of byLesson.values()) {
    const sorted = [...les].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < sorted.length; i += 1) {
      const exam = sorted[i];
      const prev = sorted[i - 1];
      const examScoresNow = scores.filter((s) => s.examId === exam.id);
      const prevById = new Map(scores.filter((s) => s.examId === prev.id).map((s) => [s.studentId, s.score]));
      const priorAvg = new Map<string, number[]>();
      for (const s of examScoresNow) {
        const history = [...priorAvg.get(s.studentId) ?? [], ...(prevById.get(s.studentId) !== undefined ? [prevById.get(s.studentId) as number] : [])];
        if (history.length > 0) priorAvg.set(s.studentId, history);
      }
      const devs = examScoresNow
        .map((s) => {
          const hist = priorAvg.get(s.studentId) ?? [];
          const base = hist.length > 0 ? mean(hist) : s.score;
          return { studentId: s.studentId, dev: s.score - base };
        })
        .filter((d) => d.dev > CHEAT_DEVIATION);
      for (let a = 0; a < devs.length; a += 1) {
        for (let b = a + 1; b < devs.length; b += 1) {
          const sa = examScoresNow.find((s) => s.studentId === devs[a].studentId);
          const sb = examScoresNow.find((s) => s.studentId === devs[b].studentId);
          if (sa && sb && Math.abs(sa.score - sb.score) <= CHEAT_PAIR_TOLERANCE) {
            const na = students.find((s) => s.id === sa.studentId)?.fullName ?? "؟";
            const nb = students.find((s) => s.id === sb.studentId)?.fullName ?? "؟";
            flags.push({
              id: `cheat-${exam.id}-${sa.studentId}-${sb.studentId}`,
              examId: exam.id,
              studentIds: [sa.studentId, sb.studentId],
              reason: `پرش هم‌زمان نمره برای ${na} و ${nb} با اختلاف بسیار کم — احتمال کپی پاسخ‌ها`,
              date: exam.date,
            });
          }
        }
      }
    }
  }
  // pattern similarity across lessons (same class)
  const byClass = new Map<string, Student[]>();
  for (const s of students) {
    const arr = byClass.get(s.classId) ?? [];
    arr.push(s);
    byClass.set(s.classId, arr);
  }
  for (const [, cls] of byClass.entries()) {
    const perStudent = cls.map((st) => {
      const vals: number[] = [];
      const perLesson = new Map<string, number[]>();
      for (const sc of scores.filter((s) => s.studentId === st.id)) {
        const exam = exams.find((e) => e.id === sc.examId);
        if (!exam) continue;
        const arr = perLesson.get(exam.lessonId) ?? [];
        arr.push((sc.score / sc.maxScore) * MAX_SCORE);
        perLesson.set(exam.lessonId, arr);
      }
      for (const v of perLesson.values()) vals.push(mean(v));
      return { st, vals: vals.sort((a, b) => a - b) };
    });
    for (let a = 0; a < perStudent.length; a += 1) {
      for (let b = a + 1; b < perStudent.length; b += 1) {
        const A = perStudent[a];
        const B = perStudent[b];
        if (A.vals.length < 3 || A.vals.length !== B.vals.length) continue;
        const r = correlation(A.vals, B.vals);
        const md = mean(A.vals.map((v, i) => Math.abs(v - B.vals[i])));
        if (r > PATTERN_CORRELATION_LIMIT && md < PATTERN_MEAN_DIFF_LIMIT) {
          flags.push({
            id: `pat-${A.st.id}-${B.st.id}`,
            examId: "",
            studentIds: [A.st.id, B.st.id],
            reason: `الگوی نمرات ${A.st.fullName} و ${B.st.fullName} در چندین درس تقریباً یکسان است`,
            date: new Date().toISOString().slice(0, 10),
          });
        }
      }
    }
  }
  return flags.slice(0, 20);
}

/* ------------------------- academic guidance ------------------------- */

const TRACK_DEFS: { name: string; keys: string[] }[] = [
  { name: "ریاضی و فیزیک", keys: ["ریاضی", "فیزیک", "هندسه", "شیمی", "انگلیسی", "آمار"] },
  { name: "علوم تجربی", keys: ["زیست", "زیست‌شناسی", "شیمی", "عربی", "انگلیسی", "آمار"] },
  { name: "انسانی و ادبی", keys: ["ادبیات", "فارسی", "تاریخ", "جغرافیا", "عربی", "دین"] },
  { name: "هنر و فناوری", keys: ["هنر", "فناوری", "کاربردی", "طراحی", "مهارت"] },
];

export function academicGuidance(perLesson: { lesson: Lesson; avg: number; hasData: boolean }[]): GuidanceResult {
  const tracks = TRACK_DEFS.map((t) => {
    const hits = perLesson.filter((p) => t.keys.some((k) => p.lesson.name.includes(k)) && p.hasData);
    const match = hits.length > 0 ? mean(hits.map((h) => (h.avg / MAX_SCORE) * 100)) : 40;
    const why =
      hits.length > 0
        ? `توافق با دروس: ${hits.slice(0, 3).map((h) => h.lesson.name).join("، ")}`
        : "داده کافی برای ارزیابی دقیق وجود ندارد";
    return { name: t.name, match: Math.round(match), why };
  }).sort((a, b) => b.match - a.match);
  return { tracks };
}

/* ------------------------- snapshot builder helper ------------------------- */

export function studentSeries(
  student: Student,
  exams: Exam[],
  examScores: ExamScore[],
): { lessonId: string; scores: { date: string; value: number; max: number }[] }[] {
  const byLesson = new Map<string, { date: string; value: number; max: number }[]>();
  for (const sc of examScores) {
    if (sc.studentId !== student.id) continue;
    const exam = exams.find((e) => e.id === sc.examId);
    if (!exam) continue;
    const arr = byLesson.get(exam.lessonId) ?? [];
    arr.push({ date: exam.date, value: sc.score, max: sc.maxScore });
    byLesson.set(exam.lessonId, arr);
  }
  return [...byLesson.entries()].map(([lessonId, scores]) => ({
    lessonId,
    scores: scores.sort((a, b) => a.date.localeCompare(b.date)),
  }));
}

export type { BehaviorReport };
