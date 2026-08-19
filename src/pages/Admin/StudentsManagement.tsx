import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
  Users,
  Plus,
  Search,
  Eye,
  Trash2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Card, Button, Input, Select, Badge, Modal } from '../../components/ui';
import db, { hashPassword, generateId } from '../../services/database';
import { calculateRiskScore } from '../../services/aiEngine';
import type { Student, Parent } from '../../types';

interface StudentFormData {
  fullName: string;
  username: string;
  password: string;
  gradeId: string;
  classId: string;
  fatherName: string;
  motherName: string;
  phone: string;
}

export const StudentsManagement: React.FC = () => {
  const [students, setStudents] = useState(() => db.getStudents());
  const [grades] = useState(() => db.getGrades());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<StudentFormData>();
  const selectedGradeId = watch('gradeId');

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.username.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGrade = !filterGrade || student.gradeId === filterGrade;
      return matchesSearch && matchesGrade;
    });
  }, [students, searchTerm, filterGrade]);

  const studentsWithAnalysis = useMemo(() => {
    return filteredStudents.map(student => ({
      student,
      analysis: calculateRiskScore(student.id),
      grade: grades.find(g => g.id === student.gradeId),
      className: grades.find(g => g.id === student.gradeId)?.classes.find(c => c.id === student.classId)?.name,
    }));
  }, [filteredStudents, grades]);

  const availableClasses = useMemo(() => {
    if (!selectedGradeId) return [];
    const grade = grades.find(g => g.id === selectedGradeId);
    return grade?.classes || [];
  }, [selectedGradeId, grades]);

  const onSubmit = async (data: StudentFormData) => {
    try {
      const hashedStudentPassword = await hashPassword(data.password);
      const parentUsername = `parent_${data.username}`;
      const parentPassword = '123456';
      const hashedParentPassword = await hashPassword(parentPassword);

      const newParent: Parent = {
        id: generateId(),
        fullName: `خانواده ${data.fullName}`,
        username: parentUsername,
        password: hashedParentPassword,
        role: 'parent',
        studentIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newStudent: Student = {
        id: generateId(),
        fullName: data.fullName,
        username: data.username,
        password: hashedStudentPassword,
        role: 'student',
        gradeId: data.gradeId,
        classId: data.classId,
        fatherName: data.fatherName,
        motherName: data.motherName,
        phone: data.phone,
        parentId: newParent.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      newParent.studentIds = [newStudent.id];

      db.add('students', newStudent);
      db.add('parents', newParent);

      setStudents(db.getStudents());
      setIsModalOpen(false);
      reset();
      toast.success(`دانش‌آموز ${data.fullName} اضافه شد`);
    } catch (error) {
      toast.error('خطا در افزودن دانش‌آموز');
    }
  };

  const handleDelete = (student: Student) => {
    if (window.confirm(`آیا از حذف ${student.fullName} اطمینان دارید؟`)) {
      db.delete('students', student.id);
      setStudents(db.getStudents());
      toast.success('دانش‌آموز حذف شد');
    }
  };

  const viewStudentDetails = (student: Student) => {
    setSelectedStudent(student);
    setIsDetailModalOpen(true);
  };

  const selectedStudentAnalysis = selectedStudent ? calculateRiskScore(selectedStudent.id) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">مدیریت دانش‌آموزان</h1>
          <p className="text-dark-400 mt-1">{students.length} دانش‌آموز ثبت شده</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
          افزودن دانش‌آموز
        </Button>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="جستجو بر اساس نام یا نام کاربری..."
              icon={<Search className="w-4 h-4" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            options={[
              { value: '', label: 'همه پایه‌ها' },
              ...grades.map(g => ({ value: g.id, label: g.name })),
            ]}
            className="w-48"
          />
        </div>
      </Card>

      {/* Students Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-right px-6 py-4 text-sm font-medium text-dark-400">دانش‌آموز</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-dark-400">پایه / کلاس</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-dark-400">ریسک</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-dark-400">روند</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-dark-400">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {studentsWithAnalysis.map(({ student, analysis, grade, className }) => (
                <tr key={student.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-600/20 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary-400" />
                      </div>
                      <div>
                        <p className="font-medium text-dark-100">{student.fullName}</p>
                        <p className="text-sm text-dark-500">@{student.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-dark-200">{grade?.name}</span>
                    <span className="text-dark-500 mx-2">-</span>
                    <span className="text-dark-400">{className}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                        analysis.riskScore > 75 ? 'bg-red-500/20 text-red-400' :
                        analysis.riskScore > 50 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {analysis.riskScore}
                      </div>
                      <Badge
                        variant={
                          analysis.riskScore > 75 ? 'danger' :
                          analysis.riskScore > 50 ? 'warning' : 'success'
                        }
                        size="sm"
                      >
                        {analysis.riskScore > 75 ? 'بحرانی' :
                         analysis.riskScore > 50 ? 'متوسط' : 'خوب'}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {analysis.factors[0]?.trend === 'improving' ? (
                      <div className="flex items-center gap-1 text-green-400">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm">رو به بهبود</span>
                      </div>
                    ) : analysis.factors[0]?.trend === 'declining' ? (
                      <div className="flex items-center gap-1 text-red-400">
                        <TrendingDown className="w-4 h-4" />
                        <span className="text-sm">رو به کاهش</span>
                      </div>
                    ) : (
                      <span className="text-dark-500 text-sm">ثابت</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => viewStudentDetails(student)}
                        className="p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-primary-400 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(student)}
                        className="p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-dark-600 mx-auto mb-4" />
              <p className="text-dark-400">دانش‌آموزی یافت نشد</p>
            </div>
          )}
        </div>
      </Card>

      {/* Add Student Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="افزودن دانش‌آموز جدید"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="نام و نام خانوادگی"
              error={errors.fullName?.message}
              {...register('fullName', { required: 'نام الزامی است' })}
            />
            <Input
              label="نام کاربری"
              error={errors.username?.message}
              {...register('username', { required: 'نام کاربری الزامی است' })}
            />
            <Input
              label="رمز عبور"
              type="password"
              error={errors.password?.message}
              {...register('password', { required: 'رمز عبور الزامی است', minLength: { value: 6, message: 'حداقل ۶ کاراکتر' } })}
            />
            <Select
              label="پایه تحصیلی"
              options={grades.map(g => ({ value: g.id, label: g.name }))}
              placeholder="انتخاب پایه"
              error={errors.gradeId?.message}
              {...register('gradeId', { required: 'پایه الزامی است' })}
            />
            <Select
              label="کلاس"
              options={availableClasses.map(c => ({ value: c.id, label: c.name }))}
              placeholder="انتخاب کلاس"
              disabled={!selectedGradeId}
              error={errors.classId?.message}
              {...register('classId', { required: 'کلاس الزامی است' })}
            />
            <Input
              label="نام پدر"
              error={errors.fatherName?.message}
              {...register('fatherName', { required: 'نام پدر الزامی است' })}
            />
            <Input
              label="نام مادر"
              error={errors.motherName?.message}
              {...register('motherName', { required: 'نام مادر الزامی است' })}
            />
            <Input
              label="شماره تماس"
              {...register('phone')}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>انصراف</Button>
            <Button type="submit">افزودن دانش‌آموز</Button>
          </div>
        </form>
      </Modal>

      {/* Student Details Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedStudent?.fullName || ''}
        size="lg"
      >
        {selectedStudent && selectedStudentAnalysis && (
          <div className="space-y-6">
            {/* Risk Score */}
            <div className="flex items-center justify-center">
              <div className={`w-24 h-24 rounded-2xl flex flex-col items-center justify-center ${
                selectedStudentAnalysis.riskScore > 75 ? 'bg-red-500/20' :
                selectedStudentAnalysis.riskScore > 50 ? 'bg-yellow-500/20' :
                'bg-green-500/20'
              }`}>
                <span className={`text-3xl font-bold ${
                  selectedStudentAnalysis.riskScore > 75 ? 'text-red-400' :
                  selectedStudentAnalysis.riskScore > 50 ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {selectedStudentAnalysis.riskScore}
                </span>
                <span className="text-dark-400 text-sm">امتیاز ریسک</span>
              </div>
            </div>

            {/* Risk Factors */}
            <div>
              <h4 className="font-medium text-dark-100 mb-3">عوامل ریسک</h4>
              <div className="grid grid-cols-2 gap-3">
                {selectedStudentAnalysis.factors.map((factor, index) => (
                  <div key={index} className="p-3 bg-dark-800 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-dark-200 text-sm">{factor.category}</span>
                      <Badge
                        variant={factor.score > 50 ? 'danger' : factor.score > 25 ? 'warning' : 'success'}
                        size="sm"
                      >
                        {factor.score.toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="text-dark-500 text-xs">{factor.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {selectedStudentAnalysis.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium text-dark-100 mb-3">توصیه‌ها</h4>
                <ul className="space-y-2">
                  {selectedStudentAnalysis.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-dark-300 text-sm">
                      <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Student Info */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dark-700">
              <div>
                <span className="text-dark-500 text-sm">نام پدر</span>
                <p className="text-dark-200">{selectedStudent.fatherName}</p>
              </div>
              <div>
                <span className="text-dark-500 text-sm">نام مادر</span>
                <p className="text-dark-200">{selectedStudent.motherName}</p>
              </div>
              <div>
                <span className="text-dark-500 text-sm">شماره تماس</span>
                <p className="text-dark-200">{selectedStudent.phone || '-'}</p>
              </div>
              <div>
                <span className="text-dark-500 text-sm">نام کاربری</span>
                <p className="text-dark-200">@{selectedStudent.username}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StudentsManagement;
