// src/services/database.ts
import type {
  Admin,
  Teacher,
  Student,
  Parent,
  Consultant,
  Grade,
  Book,
  Note,
  RiskAnalysis,
  AttendanceRecord,
  Homework,
  HomeworkSubmission,
  Exam,
  ExamScore,
  BehaviorReport,
  MentalHealthForm,
} from '../types';

// ============================================================
// API Configuration
// ============================================================
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// ============================================================
// Utility Functions
// ============================================================
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

export const generateAccessCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'sip_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
};

// ============================================================
// API Client
// ============================================================
class ApiClient {
  private async request<T>(method: string, endpoint: string, data?: any): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (data) options.body = JSON.stringify(data);

    const response = await fetch(url, options);
    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const json = await response.json();
        errorMsg = json.error || errorMsg;
      } catch {
        // ignore JSON parse errors
      }
      throw new Error(errorMsg);
    }
    return response.json();
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>('GET', endpoint);
  }
  post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>('POST', endpoint, data);
  }
  put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>('PUT', endpoint, data);
  }
  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>('DELETE', endpoint);
  }
}

const api = new ApiClient();

// ============================================================
// Database Service
// ============================================================
class DatabaseService {
  private installedCache: boolean | null = null;
  private isServerAvailable: boolean = true;

  // ------------------------------------------------------------
  // Installation
  // ------------------------------------------------------------
  async isInstalled(): Promise<boolean> {
    // Return cached value if available
    if (this.installedCache !== null) {
      return this.installedCache;
    }

    try {
      const result = await api.get<{ installed: boolean }>('/install/status');
      this.installedCache = result.installed;
      this.isServerAvailable = true;
      localStorage.setItem('sip_installed', JSON.stringify(result.installed));
      return result.installed;
    } catch (error) {
      console.warn('Failed to check installation status:', error);
      this.isServerAvailable = false;

      // Try to read from localStorage cache
      const cached = localStorage.getItem('sip_installed');
      if (cached !== null) {
        this.installedCache = JSON.parse(cached);
        return this.installedCache;
      }

      // If no cache, throw so the UI can show an error
      throw new Error('سرور در دسترس نیست. لطفاً مطمئن شوید که سرور در حال اجراست.');
    }
  }

  resetInstallationCache(): void {
    this.installedCache = null;
    localStorage.removeItem('sip_installed');
  }

  async finishInstallation(data: {
    admin: any;
    grades: Grade[];
    books: Book[];
    consultants: any[];
    students: any[];
    parents: any[];
    teachers: any[];
  }): Promise<{ success: boolean }> {
    const result = await api.post<{ success: boolean }>('/install/finish', data);
    this.installedCache = true;
    this.isServerAvailable = true;
    localStorage.setItem('sip_installed', JSON.stringify(true));
    return result;
  }

  // ------------------------------------------------------------
  // Admin
  // ------------------------------------------------------------
  async getAdmin(): Promise<Admin | undefined> {
    try { return await api.get<Admin>('/admin'); } catch { return undefined; }
  }

  async createAdmin(admin: Omit<Admin, 'id' | 'createdAt' | 'updatedAt'>): Promise<Admin> {
    return api.post<Admin>('/admin', admin);
  }

  // ------------------------------------------------------------
  // Teachers
  // ------------------------------------------------------------
  async getTeachers(): Promise<Teacher[]> {
    try { return await api.get<Teacher[]>('/teachers'); } catch { return []; }
  }

  async getTeacher(id: string): Promise<Teacher | undefined> {
    try { return await api.get<Teacher>(`/teachers/${id}`); } catch { return undefined; }
  }

  async createTeacher(teacher: Omit<Teacher, 'id' | 'createdAt' | 'updatedAt'>): Promise<Teacher> {
    return api.post<Teacher>('/teachers', teacher);
  }

  async updateTeacher(id: string, updates: Partial<Teacher>): Promise<Teacher | undefined> {
    try { return await api.put<Teacher>(`/teachers/${id}`, updates); } catch { return undefined; }
  }

  async deleteTeacher(id: string): Promise<boolean> {
    try { const r = await api.delete<{ success: boolean }>(`/teachers/${id}`); return r.success; } catch { return false; }
  }

  // ------------------------------------------------------------
  // Students
  // ------------------------------------------------------------
  async getStudents(): Promise<Student[]> {
    try { return await api.get<Student[]>('/students'); } catch { return []; }
  }

  async getStudent(id: string): Promise<Student | undefined> {
    try { return await api.get<Student>(`/students/${id}`); } catch { return undefined; }
  }

  async createStudent(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
    return api.post<Student>('/students', student);
  }

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student | undefined> {
    try { return await api.put<Student>(`/students/${id}`, updates); } catch { return undefined; }
  }

  async deleteStudent(id: string): Promise<boolean> {
    try { const r = await api.delete<{ success: boolean }>(`/students/${id}`); return r.success; } catch { return false; }
  }

  async getStudentsByClass(gradeId: string, classId: string): Promise<Student[]> {
    try {
      const all = await this.getStudents();
      return all.filter(s => s.gradeId === gradeId && s.classId === classId);
    } catch { return []; }
  }

  // ------------------------------------------------------------
  // Parents
  // ------------------------------------------------------------
  async getParents(): Promise<Parent[]> {
    try { return await api.get<Parent[]>('/parents'); } catch { return []; }
  }

  async getParent(id: string): Promise<Parent | undefined> {
    try { return await api.get<Parent>(`/parents/${id}`); } catch { return undefined; }
  }

  async createParent(parent: Omit<Parent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Parent> {
    return api.post<Parent>('/parents', parent);
  }

  async deleteParent(id: string): Promise<boolean> {
    try { const r = await api.delete<{ success: boolean }>(`/parents/${id}`); return r.success; } catch { return false; }
  }

  // ------------------------------------------------------------
  // Consultants
  // ------------------------------------------------------------
  async getConsultants(): Promise<Consultant[]> {
    try { return await api.get<Consultant[]>('/consultants'); } catch { return []; }
  }

  async getConsultant(id: string): Promise<Consultant | undefined> {
    try { return await api.get<Consultant>(`/consultants/${id}`); } catch { return undefined; }
  }

  async createConsultant(consultant: Omit<Consultant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Consultant> {
    return api.post<Consultant>('/consultants', consultant);
  }

  async deleteConsultant(id: string): Promise<boolean> {
    try { const r = await api.delete<{ success: boolean }>(`/consultants/${id}`); return r.success; } catch { return false; }
  }

  // ------------------------------------------------------------
  // Grades
  // ------------------------------------------------------------
  async getGrades(): Promise<Grade[]> {
    try { return await api.get<Grade[]>('/grades'); } catch { return []; }
  }

  async getGrade(id: string): Promise<Grade | undefined> {
    try { return await api.get<Grade>(`/grades/${id}`); } catch { return undefined; }
  }

  async createGrade(grade: Omit<Grade, 'id' | 'createdAt' | 'classes'>): Promise<Grade> {
    return api.post<Grade>('/grades', grade);
  }

  async updateGrade(id: string, updates: Partial<Grade>): Promise<Grade | undefined> {
    try { return await api.put<Grade>(`/grades/${id}`, updates); } catch { return undefined; }
  }

  async deleteGrade(id: string): Promise<boolean> {
    try { const r = await api.delete<{ success: boolean }>(`/grades/${id}`); return r.success; } catch { return false; }
  }

  async addClassToGrade(gradeId: string, className: string): Promise<Grade | undefined> {
    try { return await api.post<Grade>(`/grades/${gradeId}/classes`, { className }); } catch { return undefined; }
  }

  async deleteClassFromGrade(gradeId: string, classId: string): Promise<boolean> {
    try {
      const r = await api.delete<{ success: boolean }>(`/grades/${gradeId}/classes/${classId}`);
      return r.success;
    } catch { return false; }
  }

  // ------------------------------------------------------------
  // Books (Lessons)
  // ------------------------------------------------------------
  async getBooks(): Promise<Book[]> {
    try { return await api.get<Book[]>('/books'); } catch { return []; }
  }

  async getBook(id: string): Promise<Book | undefined> {
    try { return await api.get<Book>(`/books/${id}`); } catch { return undefined; }
  }

  async createBook(book: Omit<Book, 'id' | 'createdAt'>): Promise<Book> {
    return api.post<Book>('/books', book);
  }

  async deleteBook(id: string): Promise<boolean> {
    try { const r = await api.delete<{ success: boolean }>(`/books/${id}`); return r.success; } catch { return false; }
  }

  // ------------------------------------------------------------
  // Attendance
  // ------------------------------------------------------------
  async getAttendance(studentId?: string, date?: string): Promise<AttendanceRecord[]> {
    try {
      const params = new URLSearchParams();
      if (studentId) params.append('studentId', studentId);
      if (date) params.append('date', date);
      const query = params.toString() ? `?${params.toString()}` : '';
      return await api.get<AttendanceRecord[]>(`/attendance${query}`);
    } catch { return []; }
  }

  async createAttendance(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> {
    return api.post<AttendanceRecord>('/attendance', record);
  }

  // ------------------------------------------------------------
  // Homework
  // ------------------------------------------------------------
  async getHomework(classId?: string): Promise<Homework[]> {
    try {
      const query = classId ? `?classId=${classId}` : '';
      return await api.get<Homework[]>(`/homework${query}`);
    } catch { return []; }
  }

  async createHomework(homework: Omit<Homework, 'id' | 'createdAt'>): Promise<Homework> {
    return api.post<Homework>('/homework', homework);
  }

  // ------------------------------------------------------------
  // Homework Submissions
  // ------------------------------------------------------------
  async getHomeworkSubmissions(homeworkId?: string, studentId?: string): Promise<HomeworkSubmission[]> {
    try {
      const params = new URLSearchParams();
      if (homeworkId) params.append('homeworkId', homeworkId);
      if (studentId) params.append('studentId', studentId);
      const query = params.toString() ? `?${params.toString()}` : '';
      return await api.get<HomeworkSubmission[]>(`/homework-submissions${query}`);
    } catch { return []; }
  }

  async createHomeworkSubmission(submission: Omit<HomeworkSubmission, 'id'>): Promise<HomeworkSubmission> {
    return api.post<HomeworkSubmission>('/homework-submissions', submission);
  }

  // ------------------------------------------------------------
  // Exams
  // ------------------------------------------------------------
  async getExams(classId?: string): Promise<Exam[]> {
    try {
      const query = classId ? `?classId=${classId}` : '';
      return await api.get<Exam[]>(`/exams${query}`);
    } catch { return []; }
  }

  async createExam(exam: Omit<Exam, 'id' | 'createdAt'>): Promise<Exam> {
    return api.post<Exam>('/exams', exam);
  }

  // ------------------------------------------------------------
  // Exam Scores
  // ------------------------------------------------------------
  async getExamScores(examId?: string, studentId?: string): Promise<ExamScore[]> {
    try {
      const params = new URLSearchParams();
      if (examId) params.append('examId', examId);
      if (studentId) params.append('studentId', studentId);
      const query = params.toString() ? `?${params.toString()}` : '';
      return await api.get<ExamScore[]>(`/exam-scores${query}`);
    } catch { return []; }
  }

  async createExamScore(score: Omit<ExamScore, 'id'>): Promise<ExamScore> {
    return api.post<ExamScore>('/exam-scores', score);
  }

  // ------------------------------------------------------------
  // Behavior Reports
  // ------------------------------------------------------------
  async getBehaviorReports(studentId?: string): Promise<BehaviorReport[]> {
    try {
      const query = studentId ? `?studentId=${studentId}` : '';
      return await api.get<BehaviorReport[]>(`/behavior-reports${query}`);
    } catch { return []; }
  }

  async createBehaviorReport(report: Omit<BehaviorReport, 'id' | 'createdAt'>): Promise<BehaviorReport> {
    return api.post<BehaviorReport>('/behavior-reports', report);
  }

  // ------------------------------------------------------------
  // Mental Health Forms
  // ------------------------------------------------------------
  async getMentalHealthForms(studentId?: string): Promise<MentalHealthForm[]> {
    try {
      const query = studentId ? `?studentId=${studentId}` : '';
      return await api.get<MentalHealthForm[]>(`/mental-health-forms${query}`);
    } catch { return []; }
  }

  async createMentalHealthForm(form: Omit<MentalHealthForm, 'id' | 'createdAt'>): Promise<MentalHealthForm> {
    return api.post<MentalHealthForm>('/mental-health-forms', form);
  }

  // ------------------------------------------------------------
  // Notes
  // ------------------------------------------------------------
  async getNotes(targetId?: string): Promise<Note[]> {
    try {
      const query = targetId ? `?targetId=${targetId}` : '';
      return await api.get<Note[]>(`/notes${query}`);
    } catch { return []; }
  }

  async createNote(note: Omit<Note, 'id' | 'createdAt'>): Promise<Note> {
    return api.post<Note>('/notes', note);
  }

  // ------------------------------------------------------------
  // AI Analysis
  // ------------------------------------------------------------
  async getAIAnalysis(studentId?: string): Promise<RiskAnalysis[]> {
    try {
      const query = studentId ? `?studentId=${studentId}` : '';
      return await api.get<RiskAnalysis[]>(`/ai-analysis${query}`);
    } catch { return []; }
  }

  async createAIAnalysis(analysis: Omit<RiskAnalysis, 'id'>): Promise<RiskAnalysis> {
    return api.post<RiskAnalysis>('/ai-analysis', analysis);
  }

  // ------------------------------------------------------------
  // Authentication
  // ------------------------------------------------------------
  async authenticate(username: string, password: string): Promise<{
    user: Admin | Teacher | Student | Parent | Consultant;
    role: string;
  } | null> {
    try {
      return await api.post('/auth/login', { username, password });
    } catch { return null; }
  }

  // ------------------------------------------------------------
  // Reset
  // ------------------------------------------------------------
  async reset(): Promise<{ success: boolean }> {
    return api.post<{ success: boolean }>('/reset');
  }
}

// ============================================================
// Export Singleton
// ============================================================
export const db = new DatabaseService();
export default db;