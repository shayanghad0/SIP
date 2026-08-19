import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db/DBManager.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ============ Helper Functions ============

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'sip_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
}

// ============ API Routes ============

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/install/status', (req, res) => {
  const installed = db.isInstalled();
  res.json({ installed });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const collections = ['admin', 'teachers', 'students', 'parents', 'consultants'] as const;
  for (const collection of collections) {
    const users = db.getAll(collection);
    for (const user of users) {
      if (user.username === username) {
        const valid = await verifyPassword(password, user.password);
        if (valid) {
          const { password: _, ...userWithoutPassword } = user;
          return res.json({
            user: userWithoutPassword,
            role: user.role,
          });
        }
      }
    }
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/admin', async (req, res) => {
  const { fullName, username, password } = req.body;
  if (!fullName || !username || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const hashedPassword = await hashPassword(password);
  const admin = db.createAdmin({
    fullName,
    username,
    password: hashedPassword,
    role: 'admin',
  });
  const { password: _, ...adminWithoutPassword } = admin;
  res.json(adminWithoutPassword);
});

app.get('/api/admin', (req, res) => {
  const admin = db.getAdmin();
  if (!admin) return res.status(404).json({ error: 'Admin not found' });
  const { password: _, ...adminWithoutPassword } = admin;
  res.json(adminWithoutPassword);
});

app.get('/api/teachers', (req, res) => {
  const teachers = db.getTeachers().map((t: any) => {
    const { password, ...rest } = t;
    return rest;
  });
  res.json(teachers);
});

app.get('/api/teachers/:id', (req, res) => {
  const teacher = db.getById('teachers', req.params.id);
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
  const { password, ...rest } = teacher;
  res.json(rest);
});

app.post('/api/teachers', async (req, res) => {
  const { fullName, username, password, assignments } = req.body;
  if (!fullName || !username || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const hashedPassword = await hashPassword(password);
  const teacher = db.createTeacher({
    fullName,
    username,
    password: hashedPassword,
    role: 'teacher',
    assignments: assignments || [],
  });
  const { password: _, ...teacherWithoutPassword } = teacher;
  res.json(teacherWithoutPassword);
});

app.put('/api/teachers/:id', (req, res) => {
  const { fullName, username, assignments } = req.body;
  const updated = db.update('teachers', req.params.id, {
    fullName,
    username,
    assignments,
    updatedAt: new Date().toISOString(),
  });
  if (!updated) return res.status(404).json({ error: 'Teacher not found' });
  const { password, ...rest } = updated;
  res.json(rest);
});

app.delete('/api/teachers/:id', (req, res) => {
  const result = db.delete('teachers', req.params.id);
  res.json({ success: result });
});

app.get('/api/students', (req, res) => {
  const students = db.getStudents().map((s: any) => {
    const { password, ...rest } = s;
    return rest;
  });
  res.json(students);
});

app.get('/api/students/:id', (req, res) => {
  const student = db.getById('students', req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  const { password, ...rest } = student;
  res.json(rest);
});

app.post('/api/students', async (req, res) => {
  const { fullName, username, password, gradeId, classId, fatherName, motherName, phone, parentId } = req.body;
  if (!fullName || !username || !password || !gradeId || !classId || !fatherName || !motherName) {
    return res.status(400).json({ error: 'All required fields must be provided' });
  }
  const hashedPassword = await hashPassword(password);
  const student = db.createStudent({
    fullName,
    username,
    password: hashedPassword,
    role: 'student',
    gradeId,
    classId,
    fatherName,
    motherName,
    phone: phone || '',
    parentId: parentId || '',
  });
  const { password: _, ...studentWithoutPassword } = student;
  res.json(studentWithoutPassword);
});

app.put('/api/students/:id', (req, res) => {
  const { fullName, username, gradeId, classId, fatherName, motherName, phone } = req.body;
  const updated = db.update('students', req.params.id, {
    fullName,
    username,
    gradeId,
    classId,
    fatherName,
    motherName,
    phone,
    updatedAt: new Date().toISOString(),
  });
  if (!updated) return res.status(404).json({ error: 'Student not found' });
  const { password, ...rest } = updated;
  res.json(rest);
});

app.delete('/api/students/:id', (req, res) => {
  const result = db.delete('students', req.params.id);
  res.json({ success: result });
});

app.get('/api/parents', (req, res) => {
  const parents = db.getParents().map((p: any) => {
    const { password, ...rest } = p;
    return rest;
  });
  res.json(parents);
});

app.get('/api/parents/:id', (req, res) => {
  const parent = db.getById('parents', req.params.id);
  if (!parent) return res.status(404).json({ error: 'Parent not found' });
  const { password, ...rest } = parent;
  res.json(rest);
});

app.post('/api/parents', async (req, res) => {
  const { fullName, username, password, studentIds } = req.body;
  if (!fullName || !username || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const hashedPassword = await hashPassword(password);
  const parent = db.createParent({
    fullName,
    username,
    password: hashedPassword,
    role: 'parent',
    studentIds: studentIds || [],
  });
  const { password: _, ...parentWithoutPassword } = parent;
  res.json(parentWithoutPassword);
});

app.delete('/api/parents/:id', (req, res) => {
  const result = db.delete('parents', req.params.id);
  res.json({ success: result });
});

app.get('/api/consultants', (req, res) => {
  const consultants = db.getConsultants().map((c: any) => {
    const { password, ...rest } = c;
    return rest;
  });
  res.json(consultants);
});

app.get('/api/consultants/:id', (req, res) => {
  const consultant = db.getById('consultants', req.params.id);
  if (!consultant) return res.status(404).json({ error: 'Consultant not found' });
  const { password, ...rest } = consultant;
  res.json(rest);
});

app.post('/api/consultants', async (req, res) => {
  const { fullName, username, password, assignedGrades } = req.body;
  if (!fullName || !username || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const hashedPassword = await hashPassword(password);
  const consultant = db.createConsultant({
    fullName,
    username,
    password: hashedPassword,
    role: 'consultant',
    assignedGrades: assignedGrades || [],
  });
  const { password: _, ...consultantWithoutPassword } = consultant;
  res.json(consultantWithoutPassword);
});

app.delete('/api/consultants/:id', (req, res) => {
  const result = db.delete('consultants', req.params.id);
  res.json({ success: result });
});

app.get('/api/grades', (req, res) => {
  const grades = db.getGrades();
  res.json(grades);
});

app.get('/api/grades/:id', (req, res) => {
  const grade = db.getById('grades', req.params.id);
  if (!grade) return res.status(404).json({ error: 'Grade not found' });
  res.json(grade);
});

app.post('/api/grades', (req, res) => {
  const { name, order } = req.body;
  if (!name) return res.status(400).json({ error: 'Grade name required' });
  const grade = db.createGrade({ name, order: order || 0 });
  res.json(grade);
});

app.put('/api/grades/:id', (req, res) => {
  const { name, order, classes } = req.body;
  const updated = db.update('grades', req.params.id, { name, order, classes });
  if (!updated) return res.status(404).json({ error: 'Grade not found' });
  res.json(updated);
});

app.delete('/api/grades/:id', (req, res) => {
  const result = db.delete('grades', req.params.id);
  res.json({ success: result });
});

app.post('/api/grades/:id/classes', (req, res) => {
  const { className } = req.body;
  if (!className) return res.status(400).json({ error: 'Class name required' });
  const updated = db.addClassToGrade(req.params.id, className);
  if (!updated) return res.status(404).json({ error: 'Grade not found' });
  res.json(updated);
});

app.delete('/api/grades/:gradeId/classes/:classId', (req, res) => {
  const grade = db.getById('grades', req.params.gradeId);
  if (!grade) return res.status(404).json({ error: 'Grade not found' });
  const updatedClasses = grade.classes.filter((c: any) => c.id !== req.params.classId);
  const updated = db.update('grades', req.params.gradeId, { classes: updatedClasses });
  res.json({ success: true, grade: updated });
});

app.get('/api/books', (req, res) => {
  const books = db.getBooks();
  res.json(books);
});

app.get('/api/books/:id', (req, res) => {
  const book = db.getById('books', req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
});

app.post('/api/books', (req, res) => {
  const { name, importance } = req.body;
  if (!name) return res.status(400).json({ error: 'Book name required' });
  const book = db.createBook({ name, importance: importance || 5 });
  res.json(book);
});

app.delete('/api/books/:id', (req, res) => {
  const result = db.delete('books', req.params.id);
  res.json({ success: result });
});

app.get('/api/attendance', (req, res) => {
  const { studentId, date } = req.query;
  const records = db.getAttendance(
    studentId as string | undefined,
    date as string | undefined
  );
  res.json(records);
});

app.post('/api/attendance', (req, res) => {
  const record = db.createAttendance(req.body);
  res.json(record);
});

app.get('/api/homework', (req, res) => {
  const { classId } = req.query;
  const homework = db.getHomework(classId as string | undefined);
  res.json(homework);
});

app.post('/api/homework', (req, res) => {
  const homework = db.createHomework(req.body);
  res.json(homework);
});

app.get('/api/homework-submissions', (req, res) => {
  const { homeworkId, studentId } = req.query;
  let submissions = db.getAll('homeworkSubmissions');
  if (homeworkId) submissions = submissions.filter((s: any) => s.homeworkId === homeworkId);
  if (studentId) submissions = submissions.filter((s: any) => s.studentId === studentId);
  res.json(submissions);
});

app.post('/api/homework-submissions', (req, res) => {
  const submission = { ...req.body, id: generateId() };
  db.add('homeworkSubmissions', submission);
  res.json(submission);
});

app.get('/api/exams', (req, res) => {
  const { classId } = req.query;
  const exams = db.getExams(classId as string | undefined);
  res.json(exams);
});

app.post('/api/exams', (req, res) => {
  const exam = db.createExam(req.body);
  res.json(exam);
});

app.get('/api/exam-scores', (req, res) => {
  const { examId, studentId } = req.query;
  const scores = db.getExamScores(examId as string | undefined, studentId as string | undefined);
  res.json(scores);
});

app.post('/api/exam-scores', (req, res) => {
  const score = db.createExamScore(req.body);
  res.json(score);
});

app.get('/api/behavior-reports', (req, res) => {
  const { studentId } = req.query;
  const reports = db.getBehaviorReports(studentId as string | undefined);
  res.json(reports);
});

app.post('/api/behavior-reports', (req, res) => {
  const report = db.createBehaviorReport(req.body);
  res.json(report);
});

app.get('/api/mental-health-forms', (req, res) => {
  const { studentId } = req.query;
  const forms = db.getMentalHealthForms(studentId as string | undefined);
  res.json(forms);
});

app.post('/api/mental-health-forms', (req, res) => {
  const form = db.createMentalHealthForm(req.body);
  res.json(form);
});

app.get('/api/notes', (req, res) => {
  const { targetId } = req.query;
  const notes = db.getNotes(targetId as string | undefined);
  res.json(notes);
});

app.post('/api/notes', (req, res) => {
  const note = db.createNote(req.body);
  res.json(note);
});

app.get('/api/ai-analysis', (req, res) => {
  const { studentId } = req.query;
  const analyses = db.getAIAnalysis(studentId as string | undefined);
  res.json(analyses);
});

app.post('/api/ai-analysis', (req, res) => {
  const analysis = db.createAIAnalysis(req.body);
  res.json(analysis);
});

app.post('/api/install/finish', async (req, res) => {
  const { admin, grades, books, consultants, students, parents, teachers } = req.body;

  try {
    // Clear existing data
    db.clear('admin');
    db.clear('teachers');
    db.clear('students');
    db.clear('parents');
    db.clear('consultants');
    db.clear('grades');
    db.clear('books');

    // Admin
    if (admin) {
      const hashedPassword = await hashPassword(admin.password);
      db.createAdmin({
        fullName: admin.fullName,
        username: admin.username,
        password: hashedPassword,
        role: 'admin',
      });
    }

    // Grades
    if (grades) grades.forEach((g: any) => db.add('grades', g));

    // Books
    if (books) books.forEach((b: any) => db.add('books', b));

    // Consultants
    if (consultants) {
      for (const c of consultants) {
        const hashed = await hashPassword(c.password);
        db.createConsultant({
          fullName: c.fullName,
          username: c.username,
          password: hashed,
          role: 'consultant',
          assignedGrades: c.assignedGrades || [],
        });
      }
    }

    // Students and Parents
    if (students && parents) {
      for (const student of students) {
        const hashedStudent = await hashPassword(student.password);
        const newStudent = db.createStudent({
          fullName: student.fullName,
          username: student.username,
          password: hashedStudent,
          role: 'student',
          gradeId: student.gradeId,
          classId: student.classId,
          fatherName: student.fatherName,
          motherName: student.motherName,
          phone: student.phone || '',
          parentId: student.parentId || '',
        });

        // Find matching parent
        const parentData = parents.find((p: any) => p.studentIds?.includes(student.id));
        if (parentData) {
          const hashedParent = await hashPassword(parentData.password);
          db.createParent({
            fullName: parentData.fullName,
            username: parentData.username,
            password: hashedParent,
            role: 'parent',
            studentIds: [newStudent.id],
          });
        }
      }
    }

    // Teachers
    if (teachers) {
      for (const teacher of teachers) {
        const hashed = await hashPassword(teacher.password);
        db.createTeacher({
          fullName: teacher.fullName,
          username: teacher.username,
          password: hashed,
          role: 'teacher',
          assignments: teacher.assignments || [],
        });
      }
    }

    res.json({ success: true, message: 'Installation completed successfully' });
  } catch (error) {
    console.error('Installation error:', error);
    res.status(500).json({ error: 'Installation failed' });
  }
});

app.post('/api/reset', (req, res) => {
  db.reset();
  res.json({ success: true });
});

// Log the database path
const databasePath = path.join(__dirname, '../../database');
app.listen(PORT, () => {
  console.log(`🚀 SIP Server running on http://localhost:${PORT}`);
  console.log(`📁 Database directory: ${databasePath}`);
});