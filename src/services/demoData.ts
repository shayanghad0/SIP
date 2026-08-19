import db, { generateId, hashPassword } from './database';
import type {
  Grade,
  Book,
  Student,
  Parent,
  Teacher,
  Consultant,
  AttendanceRecord,
  ExamScore,
  Exam,
  BehaviorReport,
  MentalHealthForm,
} from '../types';

// Generate demo data for testing
export const generateDemoData = async (): Promise<void> => {
  // Create demo grades
  const grades: Grade[] = [
    { id: generateId(), name: 'پایه دهم', order: 1, classes: [], createdAt: new Date().toISOString() },
    { id: generateId(), name: 'پایه یازدهم', order: 2, classes: [], createdAt: new Date().toISOString() },
    { id: generateId(), name: 'پایه دوازدهم', order: 3, classes: [], createdAt: new Date().toISOString() },
  ];

  // Add classes to each grade
  const classNames = ['کلاس الف', 'کلاس ب', 'کلاس ج'];
  grades.forEach(grade => {
    classNames.forEach(className => {
      grade.classes.push({
        id: generateId(),
        name: className,
        gradeId: grade.id,
        createdAt: new Date().toISOString(),
      });
    });
    db.add('grades', grade);
  });

  // Create demo books/lessons
  const booksData = [
    { name: 'ریاضی', importance: 10 },
    { name: 'فیزیک', importance: 9 },
    { name: 'شیمی', importance: 9 },
    { name: 'ادبیات فارسی', importance: 8 },
    { name: 'زبان انگلیسی', importance: 7 },
    { name: 'عربی', importance: 6 },
    { name: 'دین و زندگی', importance: 7 },
    { name: 'تاریخ', importance: 5 },
  ];

  const books: Book[] = booksData.map(b => ({
    id: generateId(),
    name: b.name,
    importance: b.importance,
    createdAt: new Date().toISOString(),
  }));

  books.forEach(book => db.add('books', book));

  // Create demo consultant
  const consultantPassword = await hashPassword('123456');
  const consultant: Consultant = {
    id: generateId(),
    fullName: 'دکتر احمد محمدی',
    username: 'consultant',
    password: consultantPassword,
    role: 'consultant',
    assignedGrades: grades.map(g => g.id),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.add('consultants', consultant);

  // Create demo students and parents
  const studentNames = [
    { fullName: 'علی رضایی', father: 'محمد رضایی', mother: 'فاطمه رضایی' },
    { fullName: 'مهدی کریمی', father: 'حسین کریمی', mother: 'زهرا کریمی' },
    { fullName: 'سارا احمدی', father: 'علی احمدی', mother: 'مریم احمدی' },
    { fullName: 'محمد حسینی', father: 'رضا حسینی', mother: 'نرگس حسینی' },
    { fullName: 'فاطمه محمدی', father: 'احمد محمدی', mother: 'سمیه محمدی' },
    { fullName: 'امیر علیزاده', father: 'حسن علیزاده', mother: 'لیلا علیزاده' },
    { fullName: 'زهرا موسوی', father: 'سید علی موسوی', mother: 'فاطمه موسوی' },
    { fullName: 'حسین جعفری', father: 'مهدی جعفری', mother: 'زینب جعفری' },
  ];

  const studentPassword = await hashPassword('123456');
  const parentPassword = await hashPassword('123456');

  const students: Student[] = [];

  for (let i = 0; i < studentNames.length; i++) {
    const data = studentNames[i];
    const grade = grades[i % 3];
    const cls = grade.classes[i % 3];

    const parentId = generateId();
    const studentId = generateId();

    const parent: Parent = {
      id: parentId,
      fullName: `خانواده ${data.fullName.split(' ')[1]}`,
      username: `parent${i + 1}`,
      password: parentPassword,
      role: 'parent',
      studentIds: [studentId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const student: Student = {
      id: studentId,
      fullName: data.fullName,
      username: `student${i + 1}`,
      password: studentPassword,
      role: 'student',
      gradeId: grade.id,
      classId: cls.id,
      fatherName: data.father,
      motherName: data.mother,
      phone: `0912${Math.floor(1000000 + Math.random() * 9000000)}`,
      parentId: parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    students.push(student);
    db.add('students', student);
    db.add('parents', parent);
  }

  // Create demo teachers
  const teacherNames = [
    { fullName: 'استاد رضایی', lessons: ['ریاضی'] },
    { fullName: 'استاد کریمی', lessons: ['فیزیک', 'شیمی'] },
    { fullName: 'استاد محمدی', lessons: ['ادبیات فارسی', 'عربی'] },
    { fullName: 'استاد حسینی', lessons: ['زبان انگلیسی'] },
  ];

  const teacherPassword = await hashPassword('123456');

  teacherNames.forEach((data, index) => {
    const assignments: { lessonId: string; gradeId: string; classId: string }[] = [];

    data.lessons.forEach(lessonName => {
      const book = books.find(b => b.name === lessonName);
      if (!book) return;

      grades.forEach(grade => {
        grade.classes.forEach(cls => {
          if (Math.random() > 0.3) {
            assignments.push({
              lessonId: book.id,
              gradeId: grade.id,
              classId: cls.id,
            });
          }
        });
      });
    });

    const teacher: Teacher = {
      id: generateId(),
      fullName: data.fullName,
      username: `teacher${index + 1}`,
      password: teacherPassword,
      role: 'teacher',
      assignments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.add('teachers', teacher);
  });

  // Generate attendance records
  const today = new Date();
  students.forEach(student => {
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const statuses: Array<'present' | 'absent' | 'late' | 'excused'> = ['present', 'present', 'present', 'present', 'late', 'absent'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      const record: AttendanceRecord = {
        id: generateId(),
        studentId: student.id,
        date: date.toISOString().split('T')[0],
        status,
        teacherId: '',
        lessonId: books[0].id,
      };

      db.add('attendance', record);
    }
  });

  // Generate exams and scores
  books.forEach(book => {
    grades.forEach(grade => {
      grade.classes.forEach(cls => {
        const exam: Exam = {
          id: generateId(),
          title: `آزمون ${book.name}`,
          lessonId: book.id,
          gradeId: grade.id,
          classId: cls.id,
          teacherId: '',
          date: new Date().toISOString().split('T')[0],
          maxScore: 20,
          createdAt: new Date().toISOString(),
        };

        db.add('exams', exam);

        const classStudents = students.filter(
          s => s.gradeId === grade.id && s.classId === cls.id
        );

        classStudents.forEach(student => {
          const score: ExamScore = {
            id: generateId(),
            examId: exam.id,
            studentId: student.id,
            score: Math.floor(10 + Math.random() * 11),
          };
          db.add('examScores', score);
        });
      });
    });
  });

  // Generate behavior reports
  students.forEach(student => {
    const types: Array<'positive' | 'negative' | 'neutral'> = ['positive', 'positive', 'neutral', 'negative'];
    const descriptions = {
      positive: ['مشارکت فعال در کلاس', 'کمک به همکلاسی‌ها', 'انجام تکالیف اضافی'],
      negative: ['عدم توجه در کلاس', 'تأخیر در انجام تکالیف', 'صحبت کردن در کلاس'],
      neutral: ['حضور منظم', 'عملکرد معمولی'],
    };

    for (let i = 0; i < 3; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const descs = descriptions[type];
      const desc = descs[Math.floor(Math.random() * descs.length)];

      const report: BehaviorReport = {
        id: generateId(),
        studentId: student.id,
        teacherId: '',
        type,
        description: desc,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };

      db.add('behaviorReports', report);
    }
  });

  // Generate mental health forms
  students.forEach(student => {
    for (let i = 0; i < 4; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i * 7);

      const form: MentalHealthForm = {
        id: generateId(),
        studentId: student.id,
        date: date.toISOString().split('T')[0],
        stressLevel: Math.floor(3 + Math.random() * 5),
        anxietyLevel: Math.floor(2 + Math.random() * 5),
        motivationLevel: Math.floor(5 + Math.random() * 4),
        sleepQuality: Math.floor(5 + Math.random() * 4),
        socialInteraction: Math.floor(5 + Math.random() * 4),
        createdAt: date.toISOString(),
      };

      db.add('mentalHealthForms', form);
    }
  });

  console.log('Demo data generated successfully!');
};

export default generateDemoData;
