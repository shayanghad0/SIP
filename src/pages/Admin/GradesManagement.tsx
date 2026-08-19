import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  School,
  Plus,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardHeader, Button, Input, Badge } from '../../components/ui';
import db, { generateId } from '../../services/database';
import type { Grade } from '../../types';

export const GradesManagement: React.FC = () => {
  const [grades, setGrades] = useState(() => db.getGrades());
  const [expandedGrade, setExpandedGrade] = useState<string | null>(null);
  const [newGradeName, setNewGradeName] = useState('');
  const [newClassNames, setNewClassNames] = useState<Record<string, string>>({});

  const students = db.getStudents();

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

    db.add('grades', newGrade);
    setGrades(db.getGrades());
    setNewGradeName('');
    toast.success('پایه اضافه شد');
  };

  const removeClass = (gradeId: string, classId: string) => {
    const studentsInClass = students.filter(s => s.classId === classId);
    if (studentsInClass.length > 0) {
      toast.error('این کلاس دارای دانش‌آموز است و قابل حذف نیست');
      return;
    }

    const grade = grades.find(g => g.id === gradeId);
    if (grade) {
      const updatedClasses = grade.classes.filter(c => c.id !== classId);
      db.update('grades', gradeId, { classes: updatedClasses });
      setGrades(db.getGrades());
      toast.success('کلاس حذف شد');
    }
  };

  const addClass = (gradeId: string) => {
    const className = newClassNames[gradeId]?.trim();
    if (!className) {
      toast.error('نام کلاس را وارد کنید');
      return;
    }

    const grade = grades.find(g => g.id === gradeId);
    if (grade) {
      const newClass = {
        id: generateId(),
        name: className,
        gradeId,
        createdAt: new Date().toISOString(),
      };
      const updatedClasses = [...grade.classes, newClass];
      db.update('grades', gradeId, { classes: updatedClasses });
      setGrades(db.getGrades());
      setNewClassNames({ ...newClassNames, [gradeId]: '' });
      toast.success('کلاس اضافه شد');
    }
  };

  const removeGrade = (gradeId: string) => {
    const studentsInGrade = students.filter(s => s.gradeId === gradeId);
    if (studentsInGrade.length > 0) {
      toast.error('این پایه دارای دانش‌آموز است و قابل حذف نیست');
      return;
    }

    if (window.confirm('آیا از حذف این پایه اطمینان دارید؟')) {
      db.delete('grades', gradeId);
      setGrades(db.getGrades());
      toast.success('پایه حذف شد');
    }
  };

  const getStudentCount = (gradeId: string, classId?: string) => {
    if (classId) {
      return students.filter(s => s.classId === classId).length;
    }
    return students.filter(s => s.gradeId === gradeId).length;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">مدیریت پایه‌ها و کلاس‌ها</h1>
          <p className="text-dark-400 mt-1">{grades.length} پایه تحصیلی</p>
        </div>
      </div>

      {/* Add Grade */}
      <Card>
        <CardHeader
          title="افزودن پایه جدید"
          icon={<School className="w-5 h-5" />}
        />
        <div className="flex gap-3">
          <Input
            value={newGradeName}
            onChange={(e) => setNewGradeName(e.target.value)}
            placeholder="مثال: پایه دهم"
            className="flex-1"
          />
          <Button onClick={addGrade} icon={<Plus className="w-4 h-4" />}>
            افزودن پایه
          </Button>
        </div>
      </Card>

      {/* Grades List */}
      <div className="space-y-4">
        {grades.map((grade) => (
          <Card key={grade.id} padding="none">
            {/* Grade Header */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-dark-800/50 transition-colors"
              onClick={() => setExpandedGrade(expandedGrade === grade.id ? null : grade.id)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary-600/20 rounded-xl flex items-center justify-center">
                  <School className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <h3 className="font-medium text-dark-100">{grade.name}</h3>
                  <p className="text-sm text-dark-500">{grade.classes.length} کلاس</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="info">
                  <Users className="w-3 h-3 ml-1" />
                  {getStudentCount(grade.id)} دانش‌آموز
                </Badge>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeGrade(grade.id);
                  }}
                  className="p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {expandedGrade === grade.id ? (
                  <ChevronUp className="w-5 h-5 text-dark-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-dark-400" />
                )}
              </div>
            </div>

            {/* Classes */}
            {expandedGrade === grade.id && (
              <div className="p-4 pt-0 border-t border-dark-700">
                {/* Add Class */}
                <div className="flex gap-3 mb-4">
                  <Input
                    value={newClassNames[grade.id] || ''}
                    onChange={(e) => setNewClassNames({ ...newClassNames, [grade.id]: e.target.value })}
                    placeholder="نام کلاس جدید"
                    className="flex-1"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => addClass(grade.id)}
                    icon={<Plus className="w-4 h-4" />}
                  >
                    افزودن کلاس
                  </Button>
                </div>

                {/* Classes List */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {grade.classes.map((cls) => (
                    <div
                      key={cls.id}
                      className="flex items-center justify-between p-3 bg-dark-800 rounded-xl"
                    >
                      <div>
                        <p className="text-dark-200">{cls.name}</p>
                        <p className="text-dark-500 text-xs">
                          {getStudentCount(grade.id, cls.id)} دانش‌آموز
                        </p>
                      </div>
                      <button
                        onClick={() => removeClass(grade.id, cls.id)}
                        className="p-1.5 hover:bg-dark-700 rounded-lg text-dark-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {grade.classes.length === 0 && (
                  <p className="text-dark-500 text-center py-4">کلاسی وجود ندارد</p>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {grades.length === 0 && (
        <Card className="text-center py-12">
          <School className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400">پایه‌ای وجود ندارد</p>
        </Card>
      )}
    </div>
  );
};

export default GradesManagement;
