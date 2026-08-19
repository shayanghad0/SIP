import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Database } from '../types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Database folder inside server folder: server/database/
const DB_DIR = path.join(__dirname, '../../database');

type CollectionName = keyof Database;

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

const COLLECTION_FILES: Record<CollectionName, string> = {
  admin: 'admin.json',
  teachers: 'teachers.json',
  students: 'students.json',
  parents: 'parents.json',
  consultants: 'consultants.json',
  grades: 'grades.json',
  books: 'books.json',
  notes: 'notes.json',
  aiAnalysis: 'ai-analysis.json',
  attendance: 'attendance.json',
  homework: 'homework.json',
  homeworkSubmissions: 'homework-submissions.json',
  exams: 'exams.json',
  examScores: 'exam-scores.json',
  behaviorReports: 'behavior-reports.json',
  mentalHealthForms: 'mental-health-forms.json',
};

export class DBManager {
  private db: Database;
  private isLocked: boolean = false;

  constructor() {
    this.ensureDatabaseDirectory();
    this.db = this.loadAll();
  }

  private ensureDatabaseDirectory(): void {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
  }

  private getCollectionPath(collection: CollectionName): string {
    return path.join(DB_DIR, COLLECTION_FILES[collection]);
  }

  private loadCollection<T>(collection: CollectionName): T[] {
    const filePath = this.getCollectionPath(collection);
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error(`Failed to load ${collection}:`, error);
    }
    return [];
  }

  private saveCollection<T>(collection: CollectionName, data: T[]): void {
    if (this.isLocked) {
      throw new Error('Database is locked');
    }

    const filePath = this.getCollectionPath(collection);
    try {
      this.isLocked = true;

      // Create backup
      if (fs.existsSync(filePath)) {
        const backupPath = filePath + '.backup';
        fs.copyFileSync(filePath, backupPath);
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      // Restore from backup on error
      const backupPath = filePath + '.backup';
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, filePath);
      }
      throw error;
    } finally {
      this.isLocked = false;
    }
  }

  private loadAll(): Database {
    const db: Database = { ...INITIAL_DATABASE };
    for (const collection of Object.keys(COLLECTION_FILES) as CollectionName[]) {
      db[collection] = this.loadCollection<any>(collection);
    }
    return db;
  }

  private saveAll(): void {
    for (const collection of Object.keys(COLLECTION_FILES) as CollectionName[]) {
      this.saveCollection(collection, this.db[collection]);
    }
  }

  // === Public API ===

  getAll<T>(collection: CollectionName): T[] {
    return [...this.db[collection]] as unknown as T[];
  }

  getById<T extends { id: string }>(collection: CollectionName, id: string): T | undefined {
    return this.db[collection].find((item: any) => item.id === id) as T | undefined;
  }

  add<T extends { id: string }>(collection: CollectionName, item: T): T {
    (this.db[collection] as any[]).push(item);
    this.saveCollection(collection, this.db[collection]);
    return item;
  }

  update<T extends { id: string }>(
    collection: CollectionName,
    id: string,
    updates: Partial<T>
  ): T | undefined {
    const index = this.db[collection].findIndex((item: any) => item.id === id);
    if (index === -1) return undefined;

    const item = this.db[collection][index];
    const updatedItem = {
      ...item,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    (this.db[collection] as any[])[index] = updatedItem;
    this.saveCollection(collection, this.db[collection]);
    return updatedItem;
  }

  delete(collection: CollectionName, id: string): boolean {
    const index = this.db[collection].findIndex((item: any) => item.id === id);
    if (index === -1) return false;

    (this.db[collection] as any[]).splice(index, 1);
    this.saveCollection(collection, this.db[collection]);
    return true;
  }

  query<T>(
    collection: CollectionName,
    predicate: (item: T) => boolean
  ): T[] {
    return this.db[collection].filter(predicate) as unknown as T[];
  }

  bulkAdd<T>(collection: CollectionName, items: T[]): void {
    (this.db[collection] as any[]).push(...items);
    this.saveCollection(collection, this.db[collection]);
  }

  clear(collection: CollectionName): void {
    (this.db[collection] as any[]) = [];
    this.saveCollection(collection, this.db[collection]);
  }

  reset(): void {
    this.db = { ...INITIAL_DATABASE };
    this.saveAll();
  }

  // === Collection-specific helpers ===

  isInstalled(): boolean {
    return this.db.admin.length > 0;
  }

  getAdmin() {
    return this.db.admin[0];
  }

  getTeachers() {
    return this.getAll('teachers');
  }

  getStudents() {
    return this.getAll('students');
  }

  getParents() {
    return this.getAll('parents');
  }

  getConsultants() {
    return this.getAll('consultants');
  }

  getGrades() {
    return this.getAll('grades');
  }

  getBooks() {
    return this.getAll('books');
  }

  getNotes() {
    return this.getAll('notes');
  }

  getAttendance(studentId?: string, date?: string) {
    return this.query('attendance', (a: any) => {
      if (studentId && a.studentId !== studentId) return false;
      if (date && a.date !== date) return false;
      return true;
    });
  }

  getHomework(classId?: string) {
    if (classId) {
      return this.query('homework', (h: any) => h.classId === classId);
    }
    return this.getAll('homework');
  }

  getExams(classId?: string) {
    if (classId) {
      return this.query('exams', (e: any) => e.classId === classId);
    }
    return this.getAll('exams');
  }

  getExamScores(examId?: string, studentId?: string) {
    return this.query('examScores', (s: any) => {
      if (examId && s.examId !== examId) return false;
      if (studentId && s.studentId !== studentId) return false;
      return true;
    });
  }

  getBehaviorReports(studentId?: string) {
    if (studentId) {
      return this.query('behaviorReports', (b: any) => b.studentId === studentId);
    }
    return this.getAll('behaviorReports');
  }

  getMentalHealthForms(studentId?: string) {
    if (studentId) {
      return this.query('mentalHealthForms', (f: any) => f.studentId === studentId);
    }
    return this.getAll('mentalHealthForms');
  }

  getAIAnalysis(studentId?: string) {
    if (studentId) {
      return this.query('aiAnalysis', (a: any) => a.studentId === studentId);
    }
    return this.getAll('aiAnalysis');
  }

  getStudentsByClass(gradeId: string, classId: string) {
    return this.query('students', (s: any) => s.gradeId === gradeId && s.classId === classId);
  }

  createAdmin(admin: Omit<any, 'id' | 'createdAt' | 'updatedAt'>) {
    const newAdmin = {
      ...admin,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.add('admin', newAdmin);
    return newAdmin;
  }

  createTeacher(teacher: Omit<any, 'id' | 'createdAt' | 'updatedAt'>) {
    const newTeacher = {
      ...teacher,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.add('teachers', newTeacher);
    return newTeacher;
  }

  createStudent(student: Omit<any, 'id' | 'createdAt' | 'updatedAt'>) {
    const newStudent = {
      ...student,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.add('students', newStudent);
    return newStudent;
  }

  createParent(parent: Omit<any, 'id' | 'createdAt' | 'updatedAt'>) {
    const newParent = {
      ...parent,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.add('parents', newParent);
    return newParent;
  }

  createConsultant(consultant: Omit<any, 'id' | 'createdAt' | 'updatedAt'>) {
    const newConsultant = {
      ...consultant,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.add('consultants', newConsultant);
    return newConsultant;
  }

  createGrade(grade: Omit<any, 'id' | 'createdAt' | 'classes'>) {
    const newGrade = {
      ...grade,
      id: this.generateId(),
      classes: [],
      createdAt: new Date().toISOString(),
    };
    this.add('grades', newGrade);
    return newGrade;
  }

  addClassToGrade(gradeId: string, className: string) {
    const grade = this.getById('grades', gradeId);
    if (!grade) return undefined;

    const newClass = {
      id: this.generateId(),
      name: className,
      gradeId,
      createdAt: new Date().toISOString(),
    };

    const updatedClasses = [...grade.classes, newClass];
    return this.update('grades', gradeId, { classes: updatedClasses });
  }

  createBook(book: Omit<any, 'id' | 'createdAt'>) {
    const newBook = {
      ...book,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
    };
    this.add('books', newBook);
    return newBook;
  }

  createAttendance(record: Omit<any, 'id'>) {
    const newRecord = {
      ...record,
      id: this.generateId(),
    };
    this.add('attendance', newRecord);
    return newRecord;
  }

  createHomework(homework: Omit<any, 'id' | 'createdAt'>) {
    const newHomework = {
      ...homework,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
    };
    this.add('homework', newHomework);
    return newHomework;
  }

  createExam(exam: Omit<any, 'id' | 'createdAt'>) {
    const newExam = {
      ...exam,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
    };
    this.add('exams', newExam);
    return newExam;
  }

  createExamScore(score: Omit<any, 'id'>) {
    const newScore = {
      ...score,
      id: this.generateId(),
    };
    this.add('examScores', newScore);
    return newScore;
  }

  createBehaviorReport(report: Omit<any, 'id' | 'createdAt'>) {
    const newReport = {
      ...report,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
    };
    this.add('behaviorReports', newReport);
    return newReport;
  }

  createMentalHealthForm(form: Omit<any, 'id' | 'createdAt'>) {
    const newForm = {
      ...form,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
    };
    this.add('mentalHealthForms', newForm);
    return newForm;
  }

  createNote(note: Omit<any, 'id' | 'createdAt'>) {
    const newNote = {
      ...note,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
    };
    this.add('notes', newNote);
    return newNote;
  }

  createAIAnalysis(analysis: Omit<any, 'id'>) {
    const newAnalysis = {
      ...analysis,
      id: this.generateId(),
    };
    this.add('aiAnalysis', newAnalysis);
    return newAnalysis;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

export const db = new DBManager();
export default db;