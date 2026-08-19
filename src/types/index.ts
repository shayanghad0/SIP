// User Roles
export type UserRole = 'admin' | 'teacher' | 'consultant' | 'parent' | 'student';

// Base User Interface
export interface BaseUser {
  id: string;
  fullName: string;
  username: string;
  password: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// Admin
export interface Admin extends BaseUser {
  role: 'admin';
}

// Teacher
export interface TeacherAssignment {
  lessonId: string;
  gradeId: string;
  classId: string;
}

export interface Teacher extends BaseUser {
  role: 'teacher';
  assignments: TeacherAssignment[];
}

// Consultant
export interface Consultant extends BaseUser {
  role: 'consultant';
  assignedGrades: string[];
}

// Student
export interface Student extends BaseUser {
  role: 'student';
  gradeId: string;
  classId: string;
  nationalId?: string;
  fatherName: string;
  motherName: string;
  phone?: string;
  emergencyPhone?: string;
  parentId: string;
}

// Parent
export interface Parent extends BaseUser {
  role: 'parent';
  studentIds: string[];
}

// Grade
export interface Grade {
  id: string;
  name: string;
  order: number;
  classes: SchoolClass[];
  createdAt: string;
}

// Class
export interface SchoolClass {
  id: string;
  name: string;
  gradeId: string;
  createdAt: string;
}

// Lesson / Book
export interface Book {
  id: string;
  name: string;
  importance: number; // 3-10
  createdAt: string;
}

// Attendance
export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  teacherId: string;
  lessonId: string;
  note?: string;
}

// Homework
export interface Homework {
  id: string;
  title: string;
  description: string;
  lessonId: string;
  gradeId: string;
  classId: string;
  teacherId: string;
  dueDate: string;
  createdAt: string;
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  studentId: string;
  status: 'pending' | 'submitted' | 'late' | 'not_submitted';
  score?: number;
  feedback?: string;
  submittedAt?: string;
}

// Exam
export interface Exam {
  id: string;
  title: string;
  lessonId: string;
  gradeId: string;
  classId: string;
  teacherId: string;
  date: string;
  maxScore: number;
  createdAt: string;
}

export interface ExamScore {
  id: string;
  examId: string;
  studentId: string;
  score: number;
  feedback?: string;
}

// Behavior Report
export interface BehaviorReport {
  id: string;
  studentId: string;
  teacherId: string;
  type: 'positive' | 'negative' | 'neutral';
  description: string;
  date: string;
  createdAt: string;
}

// Mental Health Form
export interface MentalHealthForm {
  id: string;
  studentId: string;
  date: string;
  stressLevel: number; // 1-10
  anxietyLevel: number; // 1-10
  motivationLevel: number; // 1-10
  sleepQuality: number; // 1-10
  socialInteraction: number; // 1-10
  notes?: string;
  createdAt: string;
}

// Note
export interface Note {
  id: string;
  authorId: string;
  authorRole: UserRole;
  targetId: string;
  targetType: 'student' | 'class' | 'grade';
  content: string;
  isPrivate: boolean;
  createdAt: string;
}

// AI Analysis
export interface RiskAnalysis {
  id: string;
  studentId: string;
  riskScore: number; // 0-100
  factors: RiskFactor[];
  recommendations: string[];
  predictedGrades: PredictedGrade[];
  studyPlan?: StudyPlan;
  analyzedAt: string;
}

export interface RiskFactor {
  category: string;
  score: number;
  description: string;
  trend: 'improving' | 'declining' | 'stable';
}

export interface PredictedGrade {
  lessonId: string;
  predictedScore: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

export interface StudyPlan {
  weeklySchedule: DailySchedule[];
  prioritySubjects: string[];
  totalHours: number;
}

export interface DailySchedule {
  day: string;
  sessions: StudySession[];
}

export interface StudySession {
  lessonId: string;
  duration: number; // minutes
  type: 'study' | 'practice' | 'review';
}

// Database Schema
export interface Database {
  admin: Admin[];
  teachers: Teacher[];
  students: Student[];
  parents: Parent[];
  consultants: Consultant[];
  grades: Grade[];
  books: Book[];
  notes: Note[];
  aiAnalysis: RiskAnalysis[];
  attendance: AttendanceRecord[];
  homework: Homework[];
  homeworkSubmissions: HomeworkSubmission[];
  exams: Exam[];
  examScores: ExamScore[];
  behaviorReports: BehaviorReport[];
  mentalHealthForms: MentalHealthForm[];
}

// Auth
export interface AuthState {
  user: BaseUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
  accessCode: string;
}

// Installation Wizard
export interface InstallationState {
  step: number;
  admin: Partial<Admin> | null;
  grades: Grade[];
  books: Book[];
  consultants: Consultant[];
  students: Student[];
  teachers: Teacher[];
  parents: Parent[];
  isComplete: boolean;
}
