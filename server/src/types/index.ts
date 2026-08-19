export type UserRole = 'admin' | 'teacher' | 'consultant' | 'parent' | 'student';

export interface BaseUser {
  id: string;
  fullName: string;
  username: string;
  password: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Admin extends BaseUser {
  role: 'admin';
}

export interface TeacherAssignment {
  lessonId: string;
  gradeId: string;
  classId: string;
}

export interface Teacher extends BaseUser {
  role: 'teacher';
  assignments: TeacherAssignment[];
}

export interface Consultant extends BaseUser {
  role: 'consultant';
  assignedGrades: string[];
}

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

export interface Parent extends BaseUser {
  role: 'parent';
  studentIds: string[];
}

export interface SchoolClass {
  id: string;
  name: string;
  gradeId: string;
  createdAt: string;
}

export interface Grade {
  id: string;
  name: string;
  order: number;
  classes: SchoolClass[];
  createdAt: string;
}

export interface Book {
  id: string;
  name: string;
  importance: number;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  teacherId: string;
  lessonId: string;
  note?: string;
}

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

export interface BehaviorReport {
  id: string;
  studentId: string;
  teacherId: string;
  type: 'positive' | 'negative' | 'neutral';
  description: string;
  date: string;
  createdAt: string;
}

export interface MentalHealthForm {
  id: string;
  studentId: string;
  date: string;
  stressLevel: number;
  anxietyLevel: number;
  motivationLevel: number;
  sleepQuality: number;
  socialInteraction: number;
  notes?: string;
  createdAt: string;
}

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

export interface RiskAnalysis {
  id: string;
  studentId: string;
  riskScore: number;
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
  duration: number;
  type: 'study' | 'practice' | 'review';
}

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