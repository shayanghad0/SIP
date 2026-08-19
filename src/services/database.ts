import type {
  Database,
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
  Exam,
  ExamScore,
  BehaviorReport,
  MentalHealthForm,
} from '../types';

// Initialize empty database structure
const INITIAL_DATABASE: Database = {
  admin: [],
  teachers: [],
  students: [],
  parents: [],
  consultants: [],
  grades: [],
  books: [],
  notes: [],
  aiAnalysis: [],
  attendance: [],
  homework: [],
  homeworkSubmissions: [],
  exams: [],
  examScores: [],
  behaviorReports: [],
  mentalHealthForms: [],
};

const DB_KEY = 'sip_database';
const BACKUP_KEY = 'sip_database_backup';

// Generate unique ID
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

// Generate access code
export const generateAccessCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Simple hash function for passwords
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'sip_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Verify password
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
};

class DatabaseService {
  private db: Database;
  private isLocked: boolean = false;

  constructor() {
    this.db = this.load();
  }

  // Load database from localStorage
  private load(): Database {
    try {
      const data = localStorage.getItem(DB_KEY);
      if (data) {
        return JSON.parse(data);
      }
      return { ...INITIAL_DATABASE };
    } catch {
      console.error('Failed to load database');
      return { ...INITIAL_DATABASE };
    }
  }

  // Save database to localStorage with backup
  private save(): void {
    if (this.isLocked) {
      throw new Error('Database is locked');
    }

    try {
      this.isLocked = true;
      
      // Create backup before save
      const currentData = localStorage.getItem(DB_KEY);
      if (currentData) {
        localStorage.setItem(BACKUP_KEY, currentData);
      }

      localStorage.setItem(DB_KEY, JSON.stringify(this.db));
    } catch (error) {
      // Restore from backup on error
      const backup = localStorage.getItem(BACKUP_KEY);
      if (backup) {
        this.db = JSON.parse(backup);
      }
      throw error;
    } finally {
      this.isLocked = false;
    }
  }

  // Check if system is installed
  isInstalled(): boolean {
    return this.db.admin.length > 0;
  }

  // Get all data
  getAll<K extends keyof Database>(collection: K): Database[K] {
    return [...this.db[collection]] as Database[K];
  }

  // Get by ID
  getById<K extends keyof Database>(
    collection: K,
    id: string
  ): Database[K][number] | undefined {
    return this.db[collection].find((item) => (item as { id: string }).id === id) as Database[K][number] | undefined;
  }

  // Add item
  add<K extends keyof Database>(collection: K, item: Database[K][number]): Database[K][number] {
    (this.db[collection] as Database[K][number][]).push(item);
    this.save();
    return item;
  }

  // Update item
  update<K extends keyof Database>(
    collection: K,
    id: string,
    updates: Partial<Database[K][number]>
  ): Database[K][number] | undefined {
    const index = this.db[collection].findIndex((item) => (item as { id: string }).id === id);
    if (index === -1) return undefined;

    const item = this.db[collection][index];
    const updatedItem = { ...item, ...updates, updatedAt: new Date().toISOString() };
    (this.db[collection] as Database[K][number][])[index] = updatedItem;
    this.save();
    return updatedItem;
  }

  // Delete item
  delete<K extends keyof Database>(collection: K, id: string): boolean {
    const index = this.db[collection].findIndex((item) => (item as { id: string }).id === id);
    if (index === -1) return false;

    (this.db[collection] as Database[K][number][]).splice(index, 1);
    this.save();
    return true;
  }

  // Query with filter
  query<K extends keyof Database>(
    collection: K,
    predicate: (item: Database[K][number]) => boolean
  ): Database[K][number][] {
    return this.db[collection].filter(predicate) as Database[K][number][];
  }

  // Bulk add
  bulkAdd<K extends keyof Database>(collection: K, items: Database[K][number][]): void {
    (this.db[collection] as Database[K][number][]).push(...items);
    this.save();
  }

  // Clear collection
  clear<K extends keyof Database>(collection: K): void {
    (this.db[collection] as Database[K][number][]) = [];
    this.save();
  }

  // Reset entire database
  reset(): void {
    this.db = { ...INITIAL_DATABASE };
    this.save();
  }

  // Specific methods for each collection
  
  // Admin
  getAdmin(): Admin | undefined {
    return this.db.admin[0];
  }

  createAdmin(admin: Omit<Admin, 'id' | 'createdAt' | 'updatedAt'>): Admin {
    const newAdmin: Admin = {
      ...admin,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.add('admin', newAdmin);
    return newAdmin;
  }

  // Teachers
  getTeachers(): Teacher[] {
    return this.getAll('teachers');
  }

  createTeacher(teacher: Omit<Teacher, 'id' | 'createdAt' | 'updatedAt'>): Teacher {
    const newTeacher: Teacher = {
      ...teacher,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.add('teachers', newTeacher);
    return newTeacher;
  }

  // Students
  getStudents(): Student[] {
    return this.getAll('students');
  }

  getStudentsByClass(gradeId: string, classId: string): Student[] {
    return this.query('students', (s) => s.gradeId === gradeId && s.classId === classId);
  }

  createStudent(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Student {
    const newStudent: Student = {
      ...student,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.add('students', newStudent);
    return newStudent;
  }

  // Parents
  getParents(): Parent[] {
    return this.getAll('parents');
  }

  createParent(parent: Omit<Parent, 'id' | 'createdAt' | 'updatedAt'>): Parent {
    const newParent: Parent = {
      ...parent,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.add('parents', newParent);
    return newParent;
  }

  // Consultants
  getConsultants(): Consultant[] {
    return this.getAll('consultants');
  }

  createConsultant(consultant: Omit<Consultant, 'id' | 'createdAt' | 'updatedAt'>): Consultant {
    const newConsultant: Consultant = {
      ...consultant,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.add('consultants', newConsultant);
    return newConsultant;
  }

  // Grades
  getGrades(): Grade[] {
    return this.getAll('grades').sort((a, b) => a.order - b.order);
  }

  createGrade(grade: Omit<Grade, 'id' | 'createdAt' | 'classes'>): Grade {
    const newGrade: Grade = {
      ...grade,
      id: generateId(),
      classes: [],
      createdAt: new Date().toISOString(),
    };
    this.add('grades', newGrade);
    return newGrade;
  }

  addClassToGrade(gradeId: string, className: string): Grade | undefined {
    const grade = this.getById('grades', gradeId) as Grade | undefined;
    if (!grade) return undefined;

    const newClass = {
      id: generateId(),
      name: className,
      gradeId,
      createdAt: new Date().toISOString(),
    };

    grade.classes.push(newClass);
    this.update('grades', gradeId, { classes: grade.classes });
    return grade;
  }

  // Books/Lessons
  getBooks(): Book[] {
    return this.getAll('books');
  }

  createBook(book: Omit<Book, 'id' | 'createdAt'>): Book {
    const newBook: Book = {
      ...book,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    this.add('books', newBook);
    return newBook;
  }

  // Attendance
  getAttendance(studentId?: string, date?: string): AttendanceRecord[] {
    return this.query('attendance', (a) => {
      if (studentId && a.studentId !== studentId) return false;
      if (date && a.date !== date) return false;
      return true;
    });
  }

  createAttendance(record: Omit<AttendanceRecord, 'id'>): AttendanceRecord {
    const newRecord: AttendanceRecord = {
      ...record,
      id: generateId(),
    };
    this.add('attendance', newRecord);
    return newRecord;
  }

  // Homework
  getHomework(classId?: string): Homework[] {
    if (classId) {
      return this.query('homework', (h) => h.classId === classId);
    }
    return this.getAll('homework');
  }

  createHomework(homework: Omit<Homework, 'id' | 'createdAt'>): Homework {
    const newHomework: Homework = {
      ...homework,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    this.add('homework', newHomework);
    return newHomework;
  }

  // Exams
  getExams(classId?: string): Exam[] {
    if (classId) {
      return this.query('exams', (e) => e.classId === classId);
    }
    return this.getAll('exams');
  }

  createExam(exam: Omit<Exam, 'id' | 'createdAt'>): Exam {
    const newExam: Exam = {
      ...exam,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    this.add('exams', newExam);
    return newExam;
  }

  // Exam Scores
  getExamScores(examId?: string, studentId?: string): ExamScore[] {
    return this.query('examScores', (s) => {
      if (examId && s.examId !== examId) return false;
      if (studentId && s.studentId !== studentId) return false;
      return true;
    });
  }

  createExamScore(score: Omit<ExamScore, 'id'>): ExamScore {
    const newScore: ExamScore = {
      ...score,
      id: generateId(),
    };
    this.add('examScores', newScore);
    return newScore;
  }

  // Behavior Reports
  getBehaviorReports(studentId?: string): BehaviorReport[] {
    if (studentId) {
      return this.query('behaviorReports', (b) => b.studentId === studentId);
    }
    return this.getAll('behaviorReports');
  }

  createBehaviorReport(report: Omit<BehaviorReport, 'id' | 'createdAt'>): BehaviorReport {
    const newReport: BehaviorReport = {
      ...report,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    this.add('behaviorReports', newReport);
    return newReport;
  }

  // Mental Health Forms
  getMentalHealthForms(studentId?: string): MentalHealthForm[] {
    if (studentId) {
      return this.query('mentalHealthForms', (f) => f.studentId === studentId);
    }
    return this.getAll('mentalHealthForms');
  }

  createMentalHealthForm(form: Omit<MentalHealthForm, 'id' | 'createdAt'>): MentalHealthForm {
    const newForm: MentalHealthForm = {
      ...form,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    this.add('mentalHealthForms', newForm);
    return newForm;
  }

  // Notes
  getNotes(targetId?: string): Note[] {
    if (targetId) {
      return this.query('notes', (n) => n.targetId === targetId);
    }
    return this.getAll('notes');
  }

  createNote(note: Omit<Note, 'id' | 'createdAt'>): Note {
    const newNote: Note = {
      ...note,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    this.add('notes', newNote);
    return newNote;
  }

  // AI Analysis
  getAIAnalysis(studentId?: string): RiskAnalysis[] {
    if (studentId) {
      return this.query('aiAnalysis', (a) => a.studentId === studentId);
    }
    return this.getAll('aiAnalysis');
  }

  createAIAnalysis(analysis: Omit<RiskAnalysis, 'id'>): RiskAnalysis {
    const newAnalysis: RiskAnalysis = {
      ...analysis,
      id: generateId(),
    };
    this.add('aiAnalysis', newAnalysis);
    return newAnalysis;
  }

  // Authenticate user
  async authenticate(username: string, password: string): Promise<{
    user: Admin | Teacher | Student | Parent | Consultant;
    role: string;
  } | null> {
    const collections = ['admin', 'teachers', 'students', 'parents', 'consultants'] as const;

    for (const collection of collections) {
      const users = this.getAll(collection);
      for (const user of users) {
        if (
          user.username === username &&
          await verifyPassword(password, user.password)
        ) {
          return { user, role: user.role };
        }
      }
    }

    return null;
  }
}

export const db = new DatabaseService();
export default db;
