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

const API_BASE = import.meta.env.VITE_API_URL || '/api';

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
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  get<T>(endpoint: string): Promise<T> { return this.request<T>('GET', endpoint); }
  post<T>(endpoint: string, data?: any): Promise<T> { return this.request<T>('POST', endpoint, data); }
  put<T>(endpoint: string, data?: any): Promise<T> { return this.request<T>('PUT', endpoint, data); }
  delete<T>(endpoint: string): Promise<T> { return this.request<T>('DELETE', endpoint); }
}

const api = new ApiClient();

class DatabaseService {
  // === Installation ===
  async isInstalled(): Promise<boolean> {
    try {
      const result = await api.get<{ installed: boolean }>('/install/status');
      return result.installed;
    } catch { return false; }
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
    return api.post<{ success: boolean }>('/install/finish', data);
  }

  // === Admin ===
  async getAdmin(): Promise<Admin | undefined> {
    try { return await api.get<Admin>('/admin'); } catch { return undefined; }
  }
  async createAdmin(admin: Omit<Admin, 'id' | 'createdAt' | 'updatedAt'>): Promise<Admin> {
    return api.post<Admin>('/admin', admin);
  }

  // === Teachers ===
  async getTeachers(): Promise<Teacher[]> { return api.get<Teacher[]>('/teachers'); }
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

  // === Students ===
  async getStudents(): Promise<Student[]> { return api.get<Student[]>('/students'); }
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
    const all = await this.getStudents();
    return all.filter(s => s.gradeId === gradeId && s.classId === classId);
  }

  // === Parents ===
  async getParents(): Promise<Parent[]> { return api.get<Parent[]>('/parents'); }
  async getParent(id: string): Promise<Parent | undefined> {
    try { return await api.get<Parent>(`/parents/${id}`); } catch { return undefined; }
  }
  async createParent(parent: Omit<Parent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Parent> {
    return api.post<Parent>('/parents', parent);
  }
  async deleteParent(id: string): Promise<boolean> {
    try { const r = await api.delete<{ success: boolean }>(`/parents/${id}`); return r.success; } catch { return false; }
  }

  // === Consultants ===
  async getConsultants(): Promise<Consultant[]> { return api.get<Consultant[]>('/consultants'); }
  async getConsultant(id: string): Promise<Consultant | undefined> {
    try { return await api.get<Consultant>(`/consultants/${id}`); } catch { return undefined; }
  }
  async createConsultant(consultant: Omit<Consultant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Consultant> {
    return api.post<Consultant>('/consultants', consultant);
  }
  async deleteConsultant(id: string): Promise<boolean> {
    try { const r = await api.delete<{ success: boolean }>(`/consultants/${id}`); return r.success; } catch { return false; }
  }

  // === Grades ===
  async getGrades(): Promise<Grade[]> { return api.get<Grade[]>('/grades'); }
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

  // === Books ===
  async getBooks(): Promise<Book[]> { return api.get<Book[]>('/books'); }
  async getBook(id: string): Promise<Book | undefined> {
    try { return await api.get<Book>(`/books/${id}`); } catch { return undefined; }
  }
  async createBook(book: Omit<Book, 'id' | 'createdAt'>): Promise<Book> {
    return api.post<Book>('/books', book);
  }
  async deleteBook(id: string): Promise<boolean> {
    try { const r = await api.delete<{ success: boolean }>(`/books/${id}`); return r.success; } catch { return false; }
  }

  // === Attendance ===
  async getAttendance(studentId?: string, date?: string): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams();
    if (studentId) params.append('studentId', studentId);
    if (date) params.append('date', date);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<AttendanceRecord[]>(`/attendance${query}`);
  }
  async createAttendance(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> {
    return api.post<AttendanceRecord>('/attendance', record);
  }

  // === Homework ===
  async getHomework(classId?: string): Promise<Homework[]> {
    const query = classId ? `?classId=${classId}` : '';
    return api.get<Homework[]>(`/homework${query}`);
  }
  async createHomework(homework: Omit<Homework, 'id' | 'createdAt'>): Promise<Homework> {
    return api.post<Homework>('/homework', homework);
  }

  // === Homework Submissions ===
  async getHomeworkSubmissions(homeworkId?: string, studentId?: string): Promise<HomeworkSubmission[]> {
    const params = new URLSearchParams();
    if (homeworkId) params.append('homeworkId', homeworkId);
    if (studentId) params.append('studentId', studentId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<HomeworkSubmission[]>(`/homework-submissions${query}`);
  }
  async createHomeworkSubmission(submission: Omit<HomeworkSubmission, 'id'>): Promise<HomeworkSubmission> {
    return api.post<HomeworkSubmission>('/homework-submissions', submission);
  }

  // === Exams ===
  async getExams(classId?: string): Promise<Exam[]> {
    const query = classId ? `?classId=${classId}` : '';
    return api.get<Exam[]>(`/exams${query}`);
  }
  async createExam(exam: Omit<Exam, 'id' | 'createdAt'>): Promise<Exam> {
    return api.post<Exam>('/exams', exam);
  }

  // === Exam Scores ===
  async getExamScores(examId?: string, studentId?: string): Promise<ExamScore[]> {
    const params = new URLSearchParams();
    if (examId) params.append('examId', examId);
    if (studentId) params.append('studentId', studentId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<ExamScore[]>(`/exam-scores${query}`);
  }
  async createExamScore(score: Omit<ExamScore, 'id'>): Promise<ExamScore> {
    return api.post<ExamScore>('/exam-scores', score);
  }

  // === Behavior Reports ===
  async getBehaviorReports(studentId?: string): Promise<BehaviorReport[]> {
    const query = studentId ? `?studentId=${studentId}` : '';
    return api.get<BehaviorReport[]>(`/behavior-reports${query}`);
  }
  async createBehaviorReport(report: Omit<BehaviorReport, 'id' | 'createdAt'>): Promise<BehaviorReport> {
    return api.post<BehaviorReport>('/behavior-reports', report);
  }

  // === Mental Health Forms ===
  async getMentalHealthForms(studentId?: string): Promise<MentalHealthForm[]> {
    const query = studentId ? `?studentId=${studentId}` : '';
    return api.get<MentalHealthForm[]>(`/mental-health-forms${query}`);
  }
  async createMentalHealthForm(form: Omit<MentalHealthForm, 'id' | 'createdAt'>): Promise<MentalHealthForm> {
    return api.post<MentalHealthForm>('/mental-health-forms', form);
  }

  // === Notes ===
  async getNotes(targetId?: string): Promise<Note[]> {
    const query = targetId ? `?targetId=${targetId}` : '';
    return api.get<Note[]>(`/notes${query}`);
  }
  async createNote(note: Omit<Note, 'id' | 'createdAt'>): Promise<Note> {
    return api.post<Note>('/notes', note);
  }

  // === AI Analysis ===
  async getAIAnalysis(studentId?: string): Promise<RiskAnalysis[]> {
    const query = studentId ? `?studentId=${studentId}` : '';
    return api.get<RiskAnalysis[]>(`/ai-analysis${query}`);
  }
  async createAIAnalysis(analysis: Omit<RiskAnalysis, 'id'>): Promise<RiskAnalysis> {
    return api.post<RiskAnalysis>('/ai-analysis', analysis);
  }

  // === Authentication ===
  async authenticate(username: string, password: string): Promise<{
    user: Admin | Teacher | Student | Parent | Consultant;
    role: string;
  } | null> {
    try {
      return await api.post('/auth/login', { username, password });
    } catch { return null; }
  }

  async reset(): Promise<{ success: boolean }> {
    return api.post<{ success: boolean }>('/reset');
  }
}

export const db = new DatabaseService();
export default db;