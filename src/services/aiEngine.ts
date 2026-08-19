import type {
  RiskAnalysis,
  RiskFactor,
  PredictedGrade,
  StudyPlan,
  DailySchedule,
  AttendanceRecord,
  ExamScore,
  BehaviorReport,
  MentalHealthForm,
  HomeworkSubmission,
  Book,
} from '../types';
import db from './database';

// Calculate attendance rate
const calculateAttendanceRate = (records: AttendanceRecord[]): number => {
  if (records.length === 0) return 100;
  const present = records.filter(r => r.status === 'present' || r.status === 'excused').length;
  return (present / records.length) * 100;
};

// Calculate late rate
const calculateLateRate = (records: AttendanceRecord[]): number => {
  if (records.length === 0) return 0;
  const late = records.filter(r => r.status === 'late').length;
  return (late / records.length) * 100;
};

// Calculate average score
const calculateAverageScore = (scores: ExamScore[]): number => {
  if (scores.length === 0) return 0;
  const total = scores.reduce((sum, s) => sum + s.score, 0);
  return total / scores.length;
};

// Calculate behavior score
const calculateBehaviorScore = (reports: BehaviorReport[]): number => {
  if (reports.length === 0) return 50;
  const positive = reports.filter(r => r.type === 'positive').length;
  const negative = reports.filter(r => r.type === 'negative').length;
  const total = reports.length;
  return Math.max(0, Math.min(100, 50 + (positive - negative) * 10 / total * 100));
};

// Calculate mental health score
const calculateMentalHealthScore = (forms: MentalHealthForm[]): number => {
  if (forms.length === 0) return 50;
  const latest = forms.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
  
  const avgScore = (
    (10 - latest.stressLevel) +
    (10 - latest.anxietyLevel) +
    latest.motivationLevel +
    latest.sleepQuality +
    latest.socialInteraction
  ) / 5;
  
  return avgScore * 10;
};

// Calculate homework completion rate
const calculateHomeworkCompletion = (submissions: HomeworkSubmission[]): number => {
  if (submissions.length === 0) return 100;
  const submitted = submissions.filter(
    s => s.status === 'submitted' || s.status === 'late'
  ).length;
  return (submitted / submissions.length) * 100;
};

// Detect trend
const detectTrend = (values: number[]): 'improving' | 'declining' | 'stable' => {
  if (values.length < 2) return 'stable';
  
  const recent = values.slice(-3);
  const earlier = values.slice(-6, -3);
  
  if (earlier.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  
  const diff = recentAvg - earlierAvg;
  
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
};

// Main risk calculation
export const calculateRiskScore = (studentId: string): RiskAnalysis => {
  const attendance = db.getAttendance(studentId);
  const examScores = db.getExamScores(undefined, studentId);
  const behaviorReports = db.getBehaviorReports(studentId);
  const mentalHealthForms = db.getMentalHealthForms(studentId);
  const homeworkSubmissions = db.query('homeworkSubmissions', s => s.studentId === studentId);
  
  const factors: RiskFactor[] = [];
  
  // Attendance factor
  const attendanceRate = calculateAttendanceRate(attendance);
  const attendanceScore = 100 - attendanceRate;
  factors.push({
    category: 'حضور و غیاب',
    score: attendanceScore,
    description: attendanceRate < 80 
      ? `نرخ حضور ${attendanceRate.toFixed(0)}% - نیاز به توجه`
      : `نرخ حضور ${attendanceRate.toFixed(0)}% - مناسب`,
    trend: detectTrend(attendance.map(a => a.status === 'present' ? 100 : 0)),
  });
  
  // Late arrivals factor
  const lateRate = calculateLateRate(attendance);
  factors.push({
    category: 'تاخیرها',
    score: lateRate,
    description: lateRate > 20 
      ? `نرخ تاخیر ${lateRate.toFixed(0)}% - بالا`
      : `نرخ تاخیر ${lateRate.toFixed(0)}% - قابل قبول`,
    trend: detectTrend(attendance.map(a => a.status === 'late' ? 100 : 0)),
  });
  
  // Academic performance factor
  const avgScore = calculateAverageScore(examScores);
  const academicRisk = Math.max(0, 100 - avgScore);
  factors.push({
    category: 'عملکرد تحصیلی',
    score: academicRisk,
    description: avgScore < 50 
      ? `میانگین نمرات ${avgScore.toFixed(1)} - نگران‌کننده`
      : avgScore < 70 
        ? `میانگین نمرات ${avgScore.toFixed(1)} - نیاز به بهبود`
        : `میانگین نمرات ${avgScore.toFixed(1)} - خوب`,
    trend: detectTrend(examScores.map(s => s.score)),
  });
  
  // Behavior factor
  const behaviorScore = calculateBehaviorScore(behaviorReports);
  const behaviorRisk = 100 - behaviorScore;
  factors.push({
    category: 'رفتار',
    score: behaviorRisk,
    description: behaviorScore < 40 
      ? 'گزارشات رفتاری منفی زیاد'
      : behaviorScore < 60 
        ? 'رفتار متوسط'
        : 'رفتار مناسب',
    trend: detectTrend(behaviorReports.map(r => r.type === 'positive' ? 100 : r.type === 'negative' ? 0 : 50)),
  });
  
  // Mental health factor
  const mentalScore = calculateMentalHealthScore(mentalHealthForms);
  const mentalRisk = 100 - mentalScore;
  factors.push({
    category: 'سلامت روان',
    score: mentalRisk,
    description: mentalScore < 40 
      ? 'نیاز به توجه فوری مشاور'
      : mentalScore < 60 
        ? 'نیاز به پیگیری'
        : 'وضعیت مناسب',
    trend: mentalHealthForms.length > 1 
      ? detectTrend(mentalHealthForms.map(f => (10 - f.stressLevel) * 10))
      : 'stable',
  });
  
  // Homework factor
  const homeworkRate = calculateHomeworkCompletion(homeworkSubmissions);
  const homeworkRisk = 100 - homeworkRate;
  factors.push({
    category: 'تکالیف',
    score: homeworkRisk,
    description: homeworkRate < 50 
      ? `انجام تکالیف ${homeworkRate.toFixed(0)}% - ضعیف`
      : homeworkRate < 80 
        ? `انجام تکالیف ${homeworkRate.toFixed(0)}% - متوسط`
        : `انجام تکالیف ${homeworkRate.toFixed(0)}% - خوب`,
    trend: detectTrend(homeworkSubmissions.map(s => s.status === 'submitted' ? 100 : 0)),
  });
  
  // Calculate overall risk score (weighted average)
  const weights = {
    'حضور و غیاب': 0.2,
    'تاخیرها': 0.1,
    'عملکرد تحصیلی': 0.25,
    'رفتار': 0.15,
    'سلامت روان': 0.15,
    'تکالیف': 0.15,
  };
  
  const riskScore = factors.reduce((sum, f) => {
    const weight = weights[f.category as keyof typeof weights] || 0.1;
    return sum + f.score * weight;
  }, 0);
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (attendanceRate < 80) {
    recommendations.push('پیگیری علت غیبت‌ها با خانواده');
  }
  if (lateRate > 20) {
    recommendations.push('بررسی مشکلات حمل‌ونقل یا خواب');
  }
  if (avgScore < 50) {
    recommendations.push('کلاس‌های تقویتی');
    recommendations.push('جلسه با معلم مربوطه');
  }
  if (behaviorScore < 50) {
    recommendations.push('جلسه مشاوره رفتاری');
  }
  if (mentalScore < 50) {
    recommendations.push('ارجاع به مشاور');
    recommendations.push('تماس با خانواده');
  }
  if (homeworkRate < 60) {
    recommendations.push('پیگیری انجام تکالیف');
    recommendations.push('برنامه‌ریزی مطالعه');
  }
  
  if (riskScore > 75) {
    recommendations.unshift('⚠️ هشدار: دانش‌آموز در وضعیت بحرانی است');
  }
  
  // Generate predicted grades
  const books = db.getBooks();
  const predictedGrades: PredictedGrade[] = books.map(book => {
    const bookScores = examScores.filter(s => {
      const exam = db.getById('exams', s.examId);
      return exam && exam.lessonId === book.id;
    });
    
    const avgBookScore = bookScores.length > 0 
      ? bookScores.reduce((sum, s) => sum + s.score, 0) / bookScores.length 
      : 50;
    
    const trend = detectTrend(bookScores.map(s => s.score));
    const adjustment = trend === 'improving' ? 5 : trend === 'declining' ? -5 : 0;
    
    return {
      lessonId: book.id,
      predictedScore: Math.max(0, Math.min(100, avgBookScore + adjustment)),
      confidence: Math.min(95, 50 + bookScores.length * 5),
      trend: trend === 'improving' ? 'up' : trend === 'declining' ? 'down' : 'stable',
    };
  });
  
  // Generate study plan
  const studyPlan = generateStudyPlan(studentId, books, predictedGrades);
  
  return {
    id: '',
    studentId,
    riskScore: Math.round(riskScore),
    factors,
    recommendations,
    predictedGrades,
    studyPlan,
    analyzedAt: new Date().toISOString(),
  };
};

// Generate personalized study plan
const generateStudyPlan = (
  _studentId: string,
  books: Book[],
  predictions: PredictedGrade[]
): StudyPlan => {
  const days = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه'];
  
  // Sort subjects by priority (low predicted score + high importance = high priority)
  const prioritizedSubjects = books
    .map(book => {
      const prediction = predictions.find(p => p.lessonId === book.id);
      const predictedScore = prediction?.predictedScore || 50;
      const priority = book.importance * (100 - predictedScore) / 100;
      return { book, priority, predictedScore };
    })
    .sort((a, b) => b.priority - a.priority);
  
  const prioritySubjects = prioritizedSubjects
    .slice(0, 3)
    .map(p => p.book.id);
  
  const weeklySchedule: DailySchedule[] = days.map((day, dayIndex) => {
    const sessions = prioritizedSubjects
      .slice(0, 4)
      .map((subject, index) => {
        // More time for priority subjects
        const baseDuration = index < 2 ? 45 : 30;
        const isReviewDay = dayIndex % 2 === 0;
        
        return {
          lessonId: subject.book.id,
          duration: baseDuration,
          type: (isReviewDay && index > 1 ? 'review' : index === 0 ? 'study' : 'practice') as 'study' | 'practice' | 'review',
        };
      });
    
    return { day, sessions };
  });
  
  const totalHours = weeklySchedule.reduce(
    (sum, day) => sum + day.sessions.reduce((s, session) => s + session.duration, 0),
    0
  ) / 60;
  
  return {
    weeklySchedule,
    prioritySubjects,
    totalHours: Math.round(totalHours * 10) / 10,
  };
};

// Analyze teacher performance
export interface TeacherAnalysis {
  teacherId: string;
  averageClassScore: number;
  improvementRate: number;
  homeworkCompletionRate: number;
  examDifficulty: number;
  effectiveness: number;
}

export const analyzeTeacherPerformance = (teacherId: string): TeacherAnalysis => {
  const teacher = db.getById('teachers', teacherId);
  if (!teacher) {
    return {
      teacherId,
      averageClassScore: 0,
      improvementRate: 0,
      homeworkCompletionRate: 0,
      examDifficulty: 50,
      effectiveness: 0,
    };
  }
  
  const exams = db.query('exams', e => e.teacherId === teacherId);
  const allScores: number[] = [];
  
  exams.forEach(exam => {
    const scores = db.getExamScores(exam.id);
    scores.forEach(s => allScores.push((s.score / exam.maxScore) * 100));
  });
  
  const averageClassScore = allScores.length > 0 
    ? allScores.reduce((a, b) => a + b, 0) / allScores.length 
    : 0;
  
  // Calculate exam difficulty based on class average
  const examDifficulty = 100 - averageClassScore;
  
  // Calculate homework completion for teacher's classes
  const homework = db.query('homework', h => h.teacherId === teacherId);
  const submissions = db.getAll('homeworkSubmissions');
  
  let totalHomework = 0;
  let completedHomework = 0;
  
  homework.forEach(hw => {
    const hwSubmissions = submissions.filter(s => s.homeworkId === hw.id);
    totalHomework += hwSubmissions.length;
    completedHomework += hwSubmissions.filter(
      s => s.status === 'submitted' || s.status === 'late'
    ).length;
  });
  
  const homeworkCompletionRate = totalHomework > 0 
    ? (completedHomework / totalHomework) * 100 
    : 0;
  
  // Calculate improvement rate (placeholder - would need historical data)
  const improvementRate = Math.random() * 20 + 40; // 40-60%
  
  // Calculate effectiveness score
  const effectiveness = (
    averageClassScore * 0.4 +
    homeworkCompletionRate * 0.3 +
    improvementRate * 0.3
  );
  
  return {
    teacherId,
    averageClassScore: Math.round(averageClassScore * 10) / 10,
    improvementRate: Math.round(improvementRate * 10) / 10,
    homeworkCompletionRate: Math.round(homeworkCompletionRate * 10) / 10,
    examDifficulty: Math.round(examDifficulty * 10) / 10,
    effectiveness: Math.round(effectiveness * 10) / 10,
  };
};

// School-wide analytics
export interface SchoolAnalytics {
  totalStudents: number;
  totalTeachers: number;
  averageRiskScore: number;
  highRiskStudents: number;
  averageAttendance: number;
  gradeAnalytics: GradeAnalytics[];
}

export interface GradeAnalytics {
  gradeId: string;
  gradeName: string;
  studentCount: number;
  averageScore: number;
  riskCount: number;
  attendanceRate: number;
}

export const getSchoolAnalytics = (): SchoolAnalytics => {
  const students = db.getStudents();
  const teachers = db.getTeachers();
  const grades = db.getGrades();
  
  let totalRiskScore = 0;
  let highRiskCount = 0;
  
  const studentAnalyses = students.map(student => {
    const analysis = calculateRiskScore(student.id);
    totalRiskScore += analysis.riskScore;
    if (analysis.riskScore > 75) highRiskCount++;
    return { student, analysis };
  });
  
  const attendance = db.getAll('attendance');
  const averageAttendance = attendance.length > 0
    ? (attendance.filter(a => a.status === 'present' || a.status === 'excused').length / attendance.length) * 100
    : 100;
  
  const gradeAnalytics: GradeAnalytics[] = grades.map(grade => {
    const gradeStudents = studentAnalyses.filter(
      sa => sa.student.gradeId === grade.id
    );
    
    const gradeAttendance = attendance.filter(a => {
      const student = students.find(s => s.id === a.studentId);
      return student?.gradeId === grade.id;
    });
    
    const gradeScores = db.getAll('examScores').filter(es => {
      const student = students.find(s => s.id === es.studentId);
      return student?.gradeId === grade.id;
    });
    
    return {
      gradeId: grade.id,
      gradeName: grade.name,
      studentCount: gradeStudents.length,
      averageScore: gradeScores.length > 0
        ? gradeScores.reduce((sum, s) => sum + s.score, 0) / gradeScores.length
        : 0,
      riskCount: gradeStudents.filter(gs => gs.analysis.riskScore > 75).length,
      attendanceRate: gradeAttendance.length > 0
        ? (gradeAttendance.filter(a => a.status === 'present' || a.status === 'excused').length / gradeAttendance.length) * 100
        : 100,
    };
  });
  
  return {
    totalStudents: students.length,
    totalTeachers: teachers.length,
    averageRiskScore: students.length > 0 ? totalRiskScore / students.length : 0,
    highRiskStudents: highRiskCount,
    averageAttendance,
    gradeAnalytics,
  };
};

export default {
  calculateRiskScore,
  analyzeTeacherPerformance,
  getSchoolAnalytics,
};
