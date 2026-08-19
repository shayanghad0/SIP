import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  User,
  GraduationCap,
  BookOpen,
  Users,
  UserCheck,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  School,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button, Input, Card, Select, Badge } from '../../components/ui';
import db, { generateId } from '../../services/database';
import type { Grade, Book, Consultant, Student, Teacher, Parent, SchoolClass } from '../../types';

const STEPS = [
  { id: 1, title: 'مدیر سیستم', icon: User },
  { id: 2, title: 'پایه‌های تحصیلی', icon: School },
  { id: 3, title: 'کلاس‌ها', icon: GraduationCap },
  { id: 4, title: 'دروس', icon: BookOpen },
  { id: 5, title: 'مشاوران', icon: UserCheck },
  { id: 6, title: 'دانش‌آموزان', icon: Users },
  { id: 7, title: 'دبیران', icon: User },
  { id: 8, title: 'اتمام', icon: CheckCircle },
];

interface AdminForm {
  fullName: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export const InstallWizard: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Step 1: Admin
  const [adminForm, setAdminForm] = useState<AdminForm>({
    fullName: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  // Step 2: Grades
  const [grades, setGrades] = useState<Grade[]>([]);
  const [newGradeName, setNewGradeName] = useState('');

  // Step 3: Classes
  const [selectedGradeForClass, setSelectedGradeForClass] = useState('');
  const [newClassName, setNewClassName] = useState('');

  // Step 4: Books/Lessons
  const [books, setBooks] = useState<Book[]>([]);
  const [newBookName, setNewBookName] = useState('');
  const [newBookImportance, setNewBookImportance] = useState(5);

  // Step 5: Consultants
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [consultantForm, setConsultantForm] = useState({
    fullName: '',
    username: '',
    password: '',
  });

  // Step 6: Students & Parents
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [studentForm, setStudentForm] = useState({
    fullName: '',
    username: '',
    password: '',
    gradeId: '',
    classId: '',
    fatherName: '',
    motherName: '',
    phone: '',
  });

  // Step 7: Teachers
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherForm, setTeacherForm] = useState({
    fullName: '',
    username: '',
    password: '',
  });
  const [teacherAssignments, setTeacherAssignments] = useState<{
    lessonId: string;
    gradeId: string;
    classId: string;
  }[]>([]);

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Validate Admin
  const validateAdmin = (): boolean => {
    if (!adminForm.fullName.trim()) {
      toast.error('نام و نام خانوادگی الزامی است');
      return false;
    }
    if (!adminForm.username.trim() || adminForm.username.length < 4) {
      toast.error('نام کاربری باید حداقل ۴ کاراکتر باشد');
      return false;
    }
    if (!adminForm.password || adminForm.password.length < 6) {
      toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return false;
    }
    if (adminForm.password !== adminForm.confirmPassword) {
      toast.error('رمز عبور و تکرار آن مطابقت ندارند');
      return false;
    }
    return true;
  };

  // Add Grade
  const addGrade = () => {
    if (!newGradeName.trim()) {
      toast.error('نام پایه را وارد کنید');
      return;
    }
    const newGrade: Grade = {
      id: generateId(),
      name: newGradeName.trim(),
      order: grades.length + 1,
      classes: [],
      createdAt: new Date().toISOString(),
    };
    setGrades([...grades, newGrade]);
    setNewGradeName('');
    toast.success('پایه اضافه شد');
  };

  const removeGrade = (id: string) => {
    setGrades(grades.filter(g => g.id !== id));
  };

  // Add Class
  const addClass = () => {
    if (!selectedGradeForClass) {
      toast.error('پایه را انتخاب کنید');
      return;
    }
    if (!newClassName.trim()) {
      toast.error('نام کلاس را وارد کنید');
      return;
    }
    setGrades(grades.map(g => {
      if (g.id === selectedGradeForClass) {
        return {
          ...g,
          classes: [
            ...g.classes,
            {
              id: generateId(),
              name: newClassName.trim(),
              gradeId: g.id,
              createdAt: new Date().toISOString(),
            },
          ],
        };
      }
      return g;
    }));
    setNewClassName('');
    toast.success('کلاس اضافه شد');
  };

  const removeClass = (gradeId: string, classId: string) => {
    setGrades(grades.map(g => {
      if (g.id === gradeId) {
        return {
          ...g,
          classes: g.classes.filter(c => c.id !== classId),
        };
      }
      return g;
    }));
  };

  // Add Book
  const addBook = () => {
    if (!newBookName.trim()) {
      toast.error('نام درس را وارد کنید');
      return;
    }
    if (newBookImportance < 3 || newBookImportance > 10) {
      toast.error('درجه اهمیت باید بین ۳ تا ۱۰ باشد');
      return;
    }
    const newBook: Book = {
      id: generateId(),
      name: newBookName.trim(),
      importance: newBookImportance,
      createdAt: new Date().toISOString(),
    };
    setBooks([...books, newBook]);
    setNewBookName('');
    setNewBookImportance(5);
    toast.success('درس اضافه شد');
  };

  const removeBook = (id: string) => {
    setBooks(books.filter(b => b.id !== id));
  };

  // Add Consultant
  const addConsultant = () => {
    if (!consultantForm.fullName.trim() || !consultantForm.username.trim() || !consultantForm.password) {
      toast.error('همه فیلدها الزامی هستند');
      return;
    }
    const newConsultant: Consultant = {
      id: generateId(),
      fullName: consultantForm.fullName.trim(),
      username: consultantForm.username.trim(),
      password: consultantForm.password, // will be hashed on server
      role: 'consultant',
      assignedGrades: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConsultants([...consultants, newConsultant]);
    setConsultantForm({ fullName: '', username: '', password: '' });
    toast.success('مشاور اضافه شد');
  };

  // Add Student
  const addStudent = () => {
    if (
      !studentForm.fullName.trim() ||
      !studentForm.username.trim() ||
      !studentForm.password ||
      !studentForm.gradeId ||
      !studentForm.classId ||
      !studentForm.fatherName.trim() ||
      !studentForm.motherName.trim()
    ) {
      toast.error('همه فیلدها الزامی هستند');
      return;
    }

    const parentUsername = `parent_${studentForm.username}`;
    const parentPassword = '123456';

    const newParent: Parent = {
      id: generateId(),
      fullName: `خانواده ${studentForm.fullName}`,
      username: parentUsername,
      password: parentPassword, // will be hashed on server
      role: 'parent',
      studentIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newStudent: Student = {
      id: generateId(),
      fullName: studentForm.fullName.trim(),
      username: studentForm.username.trim(),
      password: studentForm.password, // will be hashed on server
      role: 'student',
      gradeId: studentForm.gradeId,
      classId: studentForm.classId,
      fatherName: studentForm.fatherName.trim(),
      motherName: studentForm.motherName.trim(),
      phone: studentForm.phone,
      parentId: newParent.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    newParent.studentIds = [newStudent.id];

    setStudents([...students, newStudent]);
    setParents([...parents, newParent]);
    setStudentForm({
      fullName: '',
      username: '',
      password: '',
      gradeId: '',
      classId: '',
      fatherName: '',
      motherName: '',
      phone: '',
    });
    toast.success('دانش‌آموز و والدین اضافه شدند');
  };

  // Teacher Assignments
  const addTeacherAssignment = () => {
    setTeacherAssignments([
      ...teacherAssignments,
      { lessonId: '', gradeId: '', classId: '' },
    ]);
  };

  const updateTeacherAssignment = (index: number, field: string, value: string) => {
    setTeacherAssignments(teacherAssignments.map((a, i) => {
      if (i === index) {
        return { ...a, [field]: value };
      }
      return a;
    }));
  };

  const removeTeacherAssignment = (index: number) => {
    setTeacherAssignments(teacherAssignments.filter((_, i) => i !== index));
  };

  // Add Teacher
  const addTeacher = () => {
    if (!teacherForm.fullName.trim() || !teacherForm.username.trim() || !teacherForm.password) {
      toast.error('همه فیلدها الزامی هستند');
      return;
    }

    const validAssignments = teacherAssignments.filter(
      a => a.lessonId && a.gradeId && a.classId
    );

    const newTeacher: Teacher = {
      id: generateId(),
      fullName: teacherForm.fullName.trim(),
      username: teacherForm.username.trim(),
      password: teacherForm.password, // will be hashed on server
      role: 'teacher',
      assignments: validAssignments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTeachers([...teachers, newTeacher]);
    setTeacherForm({ fullName: '', username: '', password: '' });
    setTeacherAssignments([]);
    toast.success('دبیر اضافه شد');
  };

  // Finish Installation (using API)
  const finishInstallation = async () => {
    setIsProcessing(true);

    try {
      const installData = {
        admin: {
          fullName: adminForm.fullName,
          username: adminForm.username,
          password: adminForm.password,
        },
        grades: grades,
        books: books,
        consultants: consultants.map(c => ({
          fullName: c.fullName,
          username: c.username,
          password: c.password,
          assignedGrades: c.assignedGrades || [],
        })),
        students: students.map(s => ({
          ...s,
          password: s.password,
        })),
        parents: parents.map(p => ({
          ...p,
          password: p.password,
        })),
        teachers: teachers.map(t => ({
          fullName: t.fullName,
          username: t.username,
          password: t.password,
          assignments: t.assignments || [],
        })),
      };

      await db.finishInstallation(installData);
      toast.success('نصب با موفقیت انجام شد!');
      handleNext();
    } catch (error) {
      toast.error('خطا در نصب سیستم');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick setup with demo data (optional)
  const setupWithDemoData = async () => {
    if (!validateAdmin()) return;
    setIsProcessing(true);
    try {
      // We'll just call finish with empty data and then use the demo generation on server if needed
      // For simplicity, we redirect to normal install flow
      toast.error('ویژگی داده‌های نمونه در نسخه API در حال توسعه است');
      setIsProcessing(false);
    } catch (error) {
      toast.error('خطا در نصب');
      console.error(error);
      setIsProcessing(false);
    }
  };

  const goToLogin = () => {
    navigate('/login');
  };

  const getAvailableClasses = (gradeId: string): SchoolClass[] => {
    const grade = grades.find(g => g.id === gradeId);
    return grade?.classes || [];
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return validateAdmin();
      case 2:
        if (grades.length < 2) {
          toast.error('حداقل ۲ پایه تحصیلی باید ایجاد شود');
          return false;
        }
        return true;
      case 3:
        const hasClasses = grades.every(g => g.classes.length > 0);
        if (!hasClasses) {
          toast.error('هر پایه باید حداقل یک کلاس داشته باشد');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleStepAction = () => {
    if (currentStep === 7) {
      finishInstallation();
    } else if (validateCurrentStep()) {
      handleNext();
    }
  };

  // Render step content (kept as in original, only finishInstallation changed)
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600/20 rounded-2xl mb-4">
                <User className="w-8 h-8 text-primary-400" />
              </div>
              <h2 className="text-2xl font-bold text-dark-100">ایجاد حساب مدیر</h2>
              <p className="text-dark-400 mt-2">اطلاعات مدیر سیستم را وارد کنید</p>
            </div>
            <Input
              label="نام و نام خانوادگی"
              value={adminForm.fullName}
              onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
              placeholder="محمد احمدی"
            />
            <Input
              label="نام کاربری"
              value={adminForm.username}
              onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
              placeholder="admin"
            />
            <Input
              label="رمز عبور"
              type="password"
              value={adminForm.password}
              onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
              placeholder="حداقل ۶ کاراکتر"
            />
            <Input
              label="تکرار رمز عبور"
              type="password"
              value={adminForm.confirmPassword}
              onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
              placeholder="تکرار رمز عبور"
            />
            <div className="mt-8 pt-6 border-t border-dark-700">
              <p className="text-dark-400 text-sm text-center mb-4">
                برای تست سریع سیستم، می‌توانید با داده‌های نمونه نصب کنید
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={setupWithDemoData}
                loading={isProcessing}
              >
                نصب سریع با داده‌های نمونه
              </Button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600/20 rounded-2xl mb-4">
                <School className="w-8 h-8 text-primary-400" />
              </div>
              <h2 className="text-2xl font-bold text-dark-100">پایه‌های تحصیلی</h2>
              <p className="text-dark-400 mt-2">حداقل ۲ پایه تحصیلی ایجاد کنید</p>
            </div>
            <div className="flex gap-3">
              <Input
                value={newGradeName}
                onChange={(e) => setNewGradeName(e.target.value)}
                placeholder="مثال: پایه دهم"
                className="flex-1"
              />
              <Button onClick={addGrade} icon={<Plus className="w-4 h-4" />}>
                افزودن
              </Button>
            </div>
            <div className="space-y-2">
              {grades.map((grade, index) => (
                <div key={grade.id} className="flex items-center justify-between p-4 bg-dark-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center bg-primary-600/20 text-primary-400 rounded-lg font-medium">
                      {index + 1}
                    </span>
                    <span className="text-dark-100">{grade.name}</span>
                  </div>
                  <button onClick={() => removeGrade(grade.id)} className="p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600/20 rounded-2xl mb-4">
                <GraduationCap className="w-8 h-8 text-primary-400" />
              </div>
              <h2 className="text-2xl font-bold text-dark-100">کلاس‌ها</h2>
              <p className="text-dark-400 mt-2">برای هر پایه کلاس‌های مربوطه را اضافه کنید</p>
            </div>
            <div className="flex gap-3">
              <Select
                value={selectedGradeForClass}
                onChange={(e) => setSelectedGradeForClass(e.target.value)}
                options={grades.map(g => ({ value: g.id, label: g.name }))}
                placeholder="انتخاب پایه"
                className="w-40"
              />
              <Input
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="مثال: کلاس الف"
                className="flex-1"
              />
              <Button onClick={addClass} icon={<Plus className="w-4 h-4" />}>
                افزودن
              </Button>
            </div>
            <div className="space-y-4">
              {grades.map(grade => (
                <Card key={grade.id} padding="sm">
                  <h4 className="font-semibold text-dark-100 mb-3">{grade.name}</h4>
                  <div className="flex flex-wrap gap-2">
                    {grade.classes.map(cls => (
                      <div key={cls.id} className="flex items-center gap-2 px-3 py-1.5 bg-dark-800 rounded-lg">
                        <span className="text-dark-200 text-sm">{cls.name}</span>
                        <button onClick={() => removeClass(grade.id, cls.id)} className="text-dark-500 hover:text-red-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {grade.classes.length === 0 && (
                      <span className="text-dark-500 text-sm">کلاسی اضافه نشده</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600/20 rounded-2xl mb-4">
                <BookOpen className="w-8 h-8 text-primary-400" />
              </div>
              <h2 className="text-2xl font-bold text-dark-100">دروس</h2>
              <p className="text-dark-400 mt-2">دروس مدرسه را با درجه اهمیت اضافه کنید (اختیاری)</p>
            </div>
            <div className="flex gap-3">
              <Input
                value={newBookName}
                onChange={(e) => setNewBookName(e.target.value)}
                placeholder="نام درس"
                className="flex-1"
              />
              <div className="w-32">
                <Input
                  type="number"
                  min={3}
                  max={10}
                  value={newBookImportance}
                  onChange={(e) => setNewBookImportance(Number(e.target.value))}
                  placeholder="اهمیت"
                />
              </div>
              <Button onClick={addBook} icon={<Plus className="w-4 h-4" />}>
                افزودن
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {books.map(book => (
                <div key={book.id} className="flex items-center justify-between p-4 bg-dark-800 rounded-xl">
                  <div>
                    <span className="text-dark-100">{book.name}</span>
                    <Badge variant="info" size="sm" className="mr-2">اهمیت: {book.importance}</Badge>
                  </div>
                  <button onClick={() => removeBook(book.id)} className="p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600/20 rounded-2xl mb-4">
                <UserCheck className="w-8 h-8 text-primary-400" />
              </div>
              <h2 className="text-2xl font-bold text-dark-100">مشاوران</h2>
              <p className="text-dark-400 mt-2">مشاوران مدرسه را اضافه کنید</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                value={consultantForm.fullName}
                onChange={(e) => setConsultantForm({ ...consultantForm, fullName: e.target.value })}
                placeholder="نام و نام خانوادگی"
              />
              <Input
                value={consultantForm.username}
                onChange={(e) => setConsultantForm({ ...consultantForm, username: e.target.value })}
                placeholder="نام کاربری"
              />
              <Input
                type="password"
                value={consultantForm.password}
                onChange={(e) => setConsultantForm({ ...consultantForm, password: e.target.value })}
                placeholder="رمز عبور"
              />
            </div>
            <Button onClick={addConsultant} icon={<Plus className="w-4 h-4" />} className="w-full">
              افزودن مشاور
            </Button>
            <div className="space-y-2">
              {consultants.map(consultant => (
                <div key={consultant.id} className="flex items-center justify-between p-4 bg-dark-800 rounded-xl">
                  <div>
                    <span className="text-dark-100">{consultant.fullName}</span>
                    <span className="text-dark-500 text-sm mr-2">@{consultant.username}</span>
                  </div>
                  <Badge variant="success">ثبت شده</Badge>
                </div>
              ))}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600/20 rounded-2xl mb-4">
                <Users className="w-8 h-8 text-primary-400" />
              </div>
              <h2 className="text-2xl font-bold text-dark-100">دانش‌آموزان</h2>
              <p className="text-dark-400 mt-2">دانش‌آموزان را اضافه کنید</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="نام و نام خانوادگی"
                value={studentForm.fullName}
                onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
              />
              <Input
                label="نام کاربری"
                value={studentForm.username}
                onChange={(e) => setStudentForm({ ...studentForm, username: e.target.value })}
              />
              <Input
                label="رمز عبور"
                type="password"
                value={studentForm.password}
                onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
              />
              <Select
                label="پایه تحصیلی"
                value={studentForm.gradeId}
                onChange={(e) => setStudentForm({ ...studentForm, gradeId: e.target.value, classId: '' })}
                options={grades.map(g => ({ value: g.id, label: g.name }))}
                placeholder="انتخاب پایه"
              />
              <Select
                label="کلاس"
                value={studentForm.classId}
                onChange={(e) => setStudentForm({ ...studentForm, classId: e.target.value })}
                options={getAvailableClasses(studentForm.gradeId).map(c => ({ value: c.id, label: c.name }))}
                placeholder="انتخاب کلاس"
                disabled={!studentForm.gradeId}
              />
              <Input
                label="نام پدر"
                value={studentForm.fatherName}
                onChange={(e) => setStudentForm({ ...studentForm, fatherName: e.target.value })}
              />
              <Input
                label="نام مادر"
                value={studentForm.motherName}
                onChange={(e) => setStudentForm({ ...studentForm, motherName: e.target.value })}
              />
              <Input
                label="شماره تماس"
                value={studentForm.phone}
                onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
              />
            </div>
            <Button onClick={addStudent} icon={<Plus className="w-4 h-4" />} className="w-full">
              افزودن دانش‌آموز
            </Button>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {students.map(student => {
                const grade = grades.find(g => g.id === student.gradeId);
                const cls = grade?.classes.find(c => c.id === student.classId);
                return (
                  <div key={student.id} className="flex items-center justify-between p-3 bg-dark-800 rounded-xl">
                    <div>
                      <span className="text-dark-100">{student.fullName}</span>
                      <span className="text-dark-500 text-sm mr-2">{grade?.name} - {cls?.name}</span>
                    </div>
                    <Badge variant="info">ثبت شده</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600/20 rounded-2xl mb-4">
                <User className="w-8 h-8 text-primary-400" />
              </div>
              <h2 className="text-2xl font-bold text-dark-100">دبیران</h2>
              <p className="text-dark-400 mt-2">دبیران و تخصیص کلاس‌های آنها را مشخص کنید</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                value={teacherForm.fullName}
                onChange={(e) => setTeacherForm({ ...teacherForm, fullName: e.target.value })}
                placeholder="نام و نام خانوادگی"
              />
              <Input
                value={teacherForm.username}
                onChange={(e) => setTeacherForm({ ...teacherForm, username: e.target.value })}
                placeholder="نام کاربری"
              />
              <Input
                type="password"
                value={teacherForm.password}
                onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                placeholder="رمز عبور"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-dark-200 text-sm">تخصیص کلاس‌ها:</span>
                <Button variant="ghost" size="sm" onClick={addTeacherAssignment} icon={<Plus className="w-4 h-4" />}>
                  افزودن
                </Button>
              </div>
              {teacherAssignments.map((assignment, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Select
                    value={assignment.lessonId}
                    onChange={(e) => updateTeacherAssignment(index, 'lessonId', e.target.value)}
                    options={books.map(b => ({ value: b.id, label: b.name }))}
                    placeholder="درس"
                    className="flex-1"
                  />
                  <Select
                    value={assignment.gradeId}
                    onChange={(e) => {
                      updateTeacherAssignment(index, 'gradeId', e.target.value);
                      updateTeacherAssignment(index, 'classId', '');
                    }}
                    options={grades.map(g => ({ value: g.id, label: g.name }))}
                    placeholder="پایه"
                    className="flex-1"
                  />
                  <Select
                    value={assignment.classId}
                    onChange={(e) => updateTeacherAssignment(index, 'classId', e.target.value)}
                    options={getAvailableClasses(assignment.gradeId).map(c => ({ value: c.id, label: c.name }))}
                    placeholder="کلاس"
                    className="flex-1"
                    disabled={!assignment.gradeId}
                  />
                  <button onClick={() => removeTeacherAssignment(index)} className="p-2 text-dark-400 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <Button onClick={addTeacher} icon={<Plus className="w-4 h-4" />} className="w-full">
              افزودن دبیر
            </Button>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {teachers.map(teacher => (
                <div key={teacher.id} className="flex items-center justify-between p-3 bg-dark-800 rounded-xl">
                  <div>
                    <span className="text-dark-100">{teacher.fullName}</span>
                    <span className="text-dark-500 text-sm mr-2">({teacher.assignments.length} کلاس)</span>
                  </div>
                  <Badge variant="success">ثبت شده</Badge>
                </div>
              ))}
            </div>
          </div>
        );
      case 8:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-2xl mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-dark-100">نصب کامل شد!</h2>
              <p className="text-dark-400 mt-2">سیستم با موفقیت نصب شد. اکنون می‌توانید وارد شوید.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-dark-800 rounded-xl text-center">
                <p className="text-2xl font-bold text-primary-400">{grades.length}</p>
                <p className="text-dark-500 text-sm">پایه تحصیلی</p>
              </div>
              <div className="p-4 bg-dark-800 rounded-xl text-center">
                <p className="text-2xl font-bold text-green-400">{students.length}</p>
                <p className="text-dark-500 text-sm">دانش‌آموز</p>
              </div>
              <div className="p-4 bg-dark-800 rounded-xl text-center">
                <p className="text-2xl font-bold text-yellow-400">{teachers.length}</p>
                <p className="text-dark-500 text-sm">دبیر</p>
              </div>
              <div className="p-4 bg-dark-800 rounded-xl text-center">
                <p className="text-2xl font-bold text-purple-400">{consultants.length}</p>
                <p className="text-dark-500 text-sm">مشاور</p>
              </div>
            </div>
            <Button onClick={goToLogin} className="w-full" size="lg">
              ورود به سیستم
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 overflow-x-auto pb-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    isActive ? 'bg-primary-600 text-white' :
                    isCompleted ? 'bg-green-500/20 text-green-400' :
                    'bg-dark-800 text-dark-500'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs mt-2 whitespace-nowrap ${
                    isActive ? 'text-primary-400' : 'text-dark-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${currentStep > step.id ? 'bg-green-500' : 'bg-dark-700'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Content Card */}
        <Card className="animate-fade-in">
          {renderStepContent()}

          {/* Navigation */}
          {currentStep < 8 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-dark-700">
              <Button variant="ghost" onClick={handlePrev} disabled={currentStep === 1} icon={<ArrowRight className="w-4 h-4" />}>
                قبلی
              </Button>
              <Button
                onClick={handleStepAction}
                loading={isProcessing}
                icon={currentStep === 7 ? <CheckCircle className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              >
                {currentStep === 7 ? 'اتمام نصب' : currentStep === 4 ? 'بعدی / رد کردن' : 'بعدی'}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default InstallWizard;