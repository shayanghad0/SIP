/**
 * SIP — Shared domain types.
 * These types mirror the schema of the JSON files stored in `database/`.
 */

export type Role = "admin" | "teacher" | "consultant" | "parent" | "student";

export interface UserBase {
  id: string;
  fullName: string;
  username: string;
  passwordHash: string;
  salt: string;
  accessCode: string;
  createdAt: string;
}

export interface Admin extends UserBase {
  role: "admin";
  schoolName: string;
}

export interface Consultant extends UserBase {
  role: "consultant";
  specialty: string;
}

export interface Student extends UserBase {
  role: "student";
  gradeId: string;
  classId: string;
  nationalId?: string;
  fatherName: string;
  motherName: string;
  phone: string;
  emergencyPhone: string;
  parentUserId: string;
}

export interface Parent extends UserBase {
  role: "parent";
  studentId: string;
}

export interface Assignment {
  lessonId: string;
  gradeId: string;
  classId: string;
}

export interface Teacher extends UserBase {
  role: "teacher";
  assignments: Assignment[];
}

/* ---------- Academic structure ---------- */

export interface Lesson {
  id: string;
  name: string;
  importance: number; // 3 .. 10
}

export interface GradeLevel {
  id: string;
  name: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  gradeId: string;
}

/* ---------- Academic records ---------- */

export interface Exam {
  id: string;
  name: string;
  lessonId: string;
  classId: string;
  date: string; // ISO
  createdById: string;
}

export interface ExamScore {
  id: string;
  examId: string;
  studentId: string;
  score: number; // 0 .. MAX_SCORE
  maxScore: number;
}

export type AttendanceStatus = "present" | "absent" | "late";

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // ISO date
  status: AttendanceStatus;
  classId: string;
}

export interface Homework {
  id: string;
  lessonId: string;
  classId: string;
  title: string;
  dueDate: string;
  createdById: string;
  createdAt: string;
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  studentId: string;
  completed: boolean;
  submittedAt?: string;
}

export type BehaviorType = "positive" | "negative";

export interface BehaviorReport {
  id: string;
  studentId: string;
  byTeacherId: string;
  date: string;
  type: BehaviorType;
  note: string;
}

/* ---------- Notes / wellness / alerts ---------- */

export type NoteKind = "teacher" | "parent" | "consultant";

export interface Note {
  id: string;
  authorId: string;
  authorName: string;
  studentId: string;
  date: string;
  text: string;
  kind: NoteKind;
}

export interface WellnessAnswers {
  mood: number; // 1..5 higher = better
  stress: number; // 1..5 higher = worse
  sleep: number; // 1..5 quality
  motivation: number; // 1..5
  social: number; // 1..5
  pressure: number; // 1..5 higher = worse
  focus: number; // 1..5
  family: number; // 1..5
}

export interface WellnessForm {
  id: string;
  studentId: string;
  week: string; // ISO week key
  answers: WellnessAnswers;
  submittedAt: string;
}

export type AlertType = "high-risk" | "decline" | "wellness" | "cheating" | "attendance";

export interface AlertItem {
  id: string;
  studentId: string;
  type: AlertType;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  date: string;
  read: boolean;
}

export interface ActivityItem {
  id: string;
  role: Role | "system";
  roleLabel: string;
  message: string;
  at: string;
}

/* ---------- AI analysis ---------- */

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskFactor {
  key: string;
  label: string;
  weight: number;
  score: number; // 0..100 risk contribution input
}

export interface SubjectPrediction {
  lessonId: string;
  currentAvg: number;
  predictedAvg: number;
  passProbability: number; // 0..100
  declineProbability: number; // 0..100
  trendSlope: number;
}

export interface StudentAnalysis {
  studentId: string;
  riskScore: number; // 0..100
  level: RiskLevel;
  factors: RiskFactor[];
  reasons: string[];
  recommendations: string[];
  predictions: SubjectPrediction[];
  overallAvg: number;
  classAvg: number;
  attendanceRate: number; // 0..100
  homeworkRate: number; // 0..100
  stressIndex: number; // 0..100
  anxietyIndex: number; // 0..100
  motivation: number; // 0..100
  dropoutProbability: number; // 0..100
  learningSpeed: number; // avg slope per exam
  confidence: number; // 0..100
  predictedSemesterAvg: number;
  updatedAt: string;
}

export interface StudyBlock {
  lessonId: string;
  minutes: number;
  kind: "study" | "test" | "review";
}

export interface StudyDay {
  day: string;
  blocks: StudyBlock[];
}

export interface StudyPlan {
  studentId: string;
  days: StudyDay[];
  monthlyGoals: { lessonId: string; currentAvg: number; targetAvg: number }[];
  totalWeeklyMinutes: number;
}

export interface TeacherAnalytics {
  teacherId: string;
  classCount: number;
  studentCount: number;
  avgScore: number;
  improvement: number;
  difficultyIndex: number; // 0..100 (higher = harder exams)
  homeworkCompletion: number;
  efficiency: number; // 0..100
}

export interface CheatingFlag {
  id: string;
  examId: string;
  studentIds: string[];
  reason: string;
  date: string;
}

export interface GuidanceResult {
  tracks: { name: string; match: number; why: string }[];
}

/* ---------- Database file shapes (1:1 with database/*.json) ---------- */

export interface AdminFile {
  admins: Admin[];
}
export interface TeachersFile {
  teachers: Teacher[];
}
export interface StudentsFile {
  students: Student[];
  attendance: AttendanceRecord[];
  homeworks: Homework[];
  homeworkSubmissions: HomeworkSubmission[];
  behaviorReports: BehaviorReport[];
}
export interface ParentsFile {
  parents: Parent[];
}
export interface ConsultantsFile {
  consultants: Consultant[];
}
export interface GradesFile {
  grades: GradeLevel[];
  classes: SchoolClass[];
  exams: Exam[];
  examScores: ExamScore[];
}
export interface BooksFile {
  lessons: Lesson[];
}
export interface NotesFile {
  notes: Note[];
  wellnessForms: WellnessForm[];
  alerts: AlertItem[];
  activity: ActivityItem[];
}
export interface AiFile {
  analyses: StudentAnalysis[];
  studyPlans: StudyPlan[];
  teacherAnalytics: TeacherAnalytics[];
  cheatingFlags: CheatingFlag[];
  guidance: Record<string, GuidanceResult>;
}

/* ---------- Install wizard ---------- */

export interface InstallAdmin {
  fullName: string;
  username: string;
  password: string;
}
export interface InstallLesson {
  name: string;
  importance: number;
}
export interface InstallConsultant {
  fullName: string;
  username: string;
  password: string;
}
export interface InstallStudent {
  fullName: string;
  username: string;
  password: string;
  gradeIdx: number;
  classIdx: number;
  nationalId: string;
  fatherName: string;
  motherName: string;
  phone: string;
  emergencyPhone: string;
}
export interface InstallAssignment {
  lessonIdx: number;
  gradeIdx: number;
  classIdx: number;
}
export interface InstallTeacher {
  fullName: string;
  username: string;
  password: string;
  assignments: InstallAssignment[];
}

export interface InstallPayload {
  schoolName: string;
  admin: InstallAdmin;
  gradeNames: string[];
  classNames: string[][]; // [gradeIdx][classIdx]
  lessons: InstallLesson[];
  consultants: InstallConsultant[];
  students: InstallStudent[];
  teachers: InstallTeacher[];
  loadDemo: boolean;
}

export interface AccessRecord {
  role: Role;
  roleLabel: string;
  name: string;
  username: string;
  password: string;
  accessCode: string;
}

export interface InstallResult {
  ok: boolean;
  records: AccessRecord[];
}
