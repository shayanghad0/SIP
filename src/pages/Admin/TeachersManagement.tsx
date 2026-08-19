import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
  GraduationCap,
  Plus,
  Search,
  Eye,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { Card, Button, Input, Select, Badge, Modal, LoadingScreen } from '../../components/ui';
import db, { generateId } from '../../services/database';
import { analyzeTeacherPerformance } from '../../services/aiEngine';
import type { Teacher, TeacherAssignment } from '../../types';

interface TeacherFormData {
  fullName: string;
  username: string;
  password: string;
}

export const TeachersManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TeacherFormData>();

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [teachersData, gradesData, booksData] = await Promise.all([
          db.getTeachers(),
          db.getGrades(),
          db.getBooks(),
        ]);
        setTeachers(teachersData);
        setGrades(gradesData);
        setBooks(booksData);
      } catch (error) {
        console.error('Failed to load teachers:', error);
        toast.error('خطا در بارگیری اطلاعات');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(teacher =>
      teacher.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [teachers, searchTerm]);

  const teachersWithAnalysis = useMemo(() => {
    return filteredTeachers.map(teacher => ({
      teacher,
      analysis: analyzeTeacherPerformance(teacher.id),
    }));
  }, [filteredTeachers]);

  const addAssignment = () => {
    setAssignments([...assignments, { lessonId: '', gradeId: '', classId: '' }]);
  };

  const updateAssignment = (index: number, field: keyof TeacherAssignment, value: string) => {
    setAssignments(assignments.map((a, i) => {
      if (i === index) return { ...a, [field]: value };
      return a;
    }));
  };

  const removeAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const getAvailableClasses = (gradeId: string) => {
    const grade = grades.find(g => g.id === gradeId);
    return grade?.classes || [];
  };

  const onSubmit = async (data: TeacherFormData) => {
    try {
      const validAssignments = assignments.filter(a => a.lessonId && a.gradeId && a.classId);
      const newTeacher: Teacher = {
        id: generateId(),
        fullName: data.fullName,
        username: data.username,
        password: data.password, // plain, server will hash
        role: 'teacher',
        assignments: validAssignments,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.createTeacher(newTeacher);
      const updated = await db.getTeachers();
      setTeachers(updated);
      setIsModalOpen(false);
      reset();
      setAssignments([]);
      toast.success(`دبیر ${data.fullName} اضافه شد`);
    } catch (error) {
      toast.error('خطا در افزودن دبیر');
    }
  };

  const handleDelete = async (teacher: Teacher) => {
    if (window.confirm(`آیا از حذف ${teacher.fullName} اطمینان دارید؟`)) {
      try {
        await db.deleteTeacher(teacher.id);
        const updated = await db.getTeachers();
        setTeachers(updated);
        toast.success('دبیر حذف شد');
      } catch {
        toast.error('خطا در حذف');
      }
    }
  };

  const viewTeacherDetails = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsDetailModalOpen(true);
  };

  const selectedTeacherAnalysis = selectedTeacher ? analyzeTeacherPerformance(selectedTeacher.id) : null;

  if (loading) return <LoadingScreen message="در حال بارگذاری دبیران..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">مدیریت دبیران</h1>
          <p className="text-dark-400 mt-1">{teachers.length} دبیر ثبت شده</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
          افزودن دبیر
        </Button>
      </div>

      <Card padding="sm">
        <Input
          placeholder="جستجو بر اساس نام یا نام کاربری..."
          icon={<Search className="w-4 h-4" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachersWithAnalysis.map(({ teacher, analysis }) => (
          <Card key={teacher.id} hover>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-600/20 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <h3 className="font-medium text-dark-100">{teacher.fullName}</h3>
                  <p className="text-sm text-dark-500">@{teacher.username}</p>
                </div>
              </div>
              <Badge variant="info">{teacher.assignments.length} کلاس</Badge>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">میانگین نمرات</span>
                <span className="text-dark-200">{analysis.averageClassScore.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">اثربخشی</span>
                <span className="text-dark-200">{analysis.effectiveness.toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">تکمیل تکالیف</span>
                <span className="text-dark-200">{analysis.homeworkCompletionRate.toFixed(0)}%</span>
              </div>
            </div>
            <div className="flex items-center justify-end pt-4 border-t border-dark-700">
              <div className="flex items-center gap-2">
                <button onClick={() => viewTeacherDetails(teacher)} className="p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-primary-400 transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(teacher)} className="p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredTeachers.length === 0 && (
        <Card className="text-center py-12">
          <GraduationCap className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400">دبیری یافت نشد</p>
        </Card>
      )}

      {/* Modal for adding teacher */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="افزودن دبیر جدید" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input label="نام و نام خانوادگی" error={errors.fullName?.message} {...register('fullName', { required: 'نام الزامی است' })} />
            <Input label="نام کاربری" error={errors.username?.message} {...register('username', { required: 'نام کاربری الزامی است' })} />
            <Input label="رمز عبور" type="password" error={errors.password?.message} {...register('password', { required: 'رمز عبور الزامی است', minLength: { value: 6, message: 'حداقل ۶ کاراکتر' } })} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-dark-200 text-sm">تخصیص کلاس‌ها</span>
              <Button type="button" variant="ghost" size="sm" onClick={addAssignment} icon={<Plus className="w-4 h-4" />}>افزودن</Button>
            </div>
            {assignments.map((assignment, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Select
                  value={assignment.lessonId}
                  onChange={(e) => updateAssignment(index, 'lessonId', e.target.value)}
                  options={books.map(b => ({ value: b.id, label: b.name }))}
                  placeholder="درس"
                  className="flex-1"
                />
                <Select
                  value={assignment.gradeId}
                  onChange={(e) => {
                    setAssignments(assignments.map((a, i) => {
                      if (i === index) return { ...a, gradeId: e.target.value, classId: '' };
                      return a;
                    }));
                  }}
                  options={grades.map(g => ({ value: g.id, label: g.name }))}
                  placeholder="پایه"
                  className="flex-1"
                />
                <Select
                  value={assignment.classId}
                  onChange={(e) => updateAssignment(index, 'classId', e.target.value)}
                  options={getAvailableClasses(assignment.gradeId).map(c => ({ value: c.id, label: c.name }))}
                  placeholder="کلاس"
                  className="flex-1"
                  disabled={!assignment.gradeId}
                />
                <button type="button" onClick={() => removeAssignment(index)} className="p-2 text-dark-400 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>انصراف</Button>
            <Button type="submit">افزودن دبیر</Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title={selectedTeacher?.fullName || ''} size="lg">
        {selectedTeacher && selectedTeacherAnalysis && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-dark-800 rounded-xl text-center">
                <p className="text-dark-500 text-sm mb-1">میانگین نمرات</p>
                <p className="text-2xl font-bold text-primary-400">{selectedTeacherAnalysis.averageClassScore.toFixed(1)}</p>
              </div>
              <div className="p-4 bg-dark-800 rounded-xl text-center">
                <p className="text-dark-500 text-sm mb-1">نرخ پیشرفت</p>
                <p className="text-2xl font-bold text-green-400">{selectedTeacherAnalysis.improvementRate.toFixed(0)}%</p>
              </div>
              <div className="p-4 bg-dark-800 rounded-xl text-center">
                <p className="text-dark-500 text-sm mb-1">تکمیل تکالیف</p>
                <p className="text-2xl font-bold text-yellow-400">{selectedTeacherAnalysis.homeworkCompletionRate.toFixed(0)}%</p>
              </div>
              <div className="p-4 bg-dark-800 rounded-xl text-center">
                <p className="text-dark-500 text-sm mb-1">سختی آزمون</p>
                <p className="text-2xl font-bold text-purple-400">{selectedTeacherAnalysis.examDifficulty.toFixed(0)}%</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-dark-100 mb-3">کلاس‌های تدریس</h4>
              <div className="space-y-2">
                {selectedTeacher.assignments.map((assignment, index) => {
                  const book = books.find(b => b.id === assignment.lessonId);
                  const grade = grades.find(g => g.id === assignment.gradeId);
                  const cls = grade?.classes.find(c => c.id === assignment.classId);
                  return (
                    <div key={index} className="flex items-center gap-3 p-3 bg-dark-800 rounded-xl">
                      <BookOpen className="w-5 h-5 text-primary-400" />
                      <span className="text-dark-200">{book?.name}</span>
                      <span className="text-dark-500">-</span>
                      <span className="text-dark-400">{grade?.name}</span>
                      <span className="text-dark-500">-</span>
                      <span className="text-dark-400">{cls?.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="pt-4 border-t border-dark-700">
              <div>
                <span className="text-dark-500 text-sm">نام کاربری</span>
                <p className="text-dark-200">@{selectedTeacher.username}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TeachersManagement;