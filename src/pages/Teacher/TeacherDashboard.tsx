import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Users,
  ClipboardList,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Card, CardHeader, Badge, LoadingScreen } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import db from '../../services/database';
import { calculateRiskScore, analyzeTeacherPerformance } from '../../services/aiEngine';
import type { Teacher } from '../../types';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const teacher = user as Teacher;

  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [gradesData, booksData, studentsData] = await Promise.all([
          db.getGrades(),
          db.getBooks(),
          db.getStudents(),
        ]);
        setGrades(gradesData);
        setBooks(booksData);
        setAllStudents(studentsData);
      } catch (error) {
        console.error('Failed to load teacher dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Get students from teacher's assigned classes
  const myStudents = useMemo(() => {
    const studentSet = new Set<string>();
    teacher.assignments.forEach(assignment => {
      const classStudents = allStudents.filter(
        s => s.gradeId === assignment.gradeId && s.classId === assignment.classId
      );
      classStudents.forEach(s => studentSet.add(s.id));
    });
    return allStudents.filter(s => studentSet.has(s.id));
  }, [teacher.assignments, allStudents]);

  // Get students with risk analysis
  const studentsWithRisk = useMemo(() => {
    return myStudents
      .map(student => ({
        student,
        analysis: calculateRiskScore(student.id),
      }))
      .filter(item => item.analysis.riskScore > 60)
      .sort((a, b) => b.analysis.riskScore - a.analysis.riskScore)
      .slice(0, 5);
  }, [myStudents]);

  const performance = useMemo(() => analyzeTeacherPerformance(teacher.id), [teacher.id]);

  const uniqueClasses = useMemo(() => {
    const classSet = new Set<string>();
    teacher.assignments.forEach(a => classSet.add(`${a.gradeId}-${a.classId}`));
    return classSet.size;
  }, [teacher.assignments]);

  // Mock performance data
  const performanceData = [
    { month: 'مهر', average: 72 },
    { month: 'آبان', average: 75 },
    { month: 'آذر', average: 78 },
    { month: 'دی', average: 74 },
    { month: 'بهمن', average: 80 },
    { month: 'اسفند', average: 82 },
  ];

  const lessonStats = useMemo(() => {
    const stats: Record<string, { name: string; students: number; classes: number }> = {};
    teacher.assignments.forEach(assignment => {
      const book = books.find(b => b.id === assignment.lessonId);
      if (!book) return;
      if (!stats[assignment.lessonId]) {
        stats[assignment.lessonId] = { name: book.name, students: 0, classes: 0 };
      }
      const classStudents = allStudents.filter(
        s => s.gradeId === assignment.gradeId && s.classId === assignment.classId
      );
      stats[assignment.lessonId].students += classStudents.length;
      stats[assignment.lessonId].classes += 1;
    });
    return Object.values(stats);
  }, [teacher.assignments, books, allStudents]);

  const stats = [
    { label: 'دانش‌آموزان من', value: myStudents.length, icon: Users, color: 'primary' },
    { label: 'کلاس‌های تدریس', value: uniqueClasses, icon: GraduationCap, color: 'green' },
    { label: 'دروس تدریس', value: lessonStats.length, icon: BookOpen, color: 'yellow' },
    { label: 'دانش‌آموزان در خطر', value: studentsWithRisk.length, icon: AlertTriangle, color: 'red' },
  ];

  if (loading) return <LoadingScreen message="در حال بارگذاری داشبورد دبیر..." />;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-100">خوش آمدید، {teacher.fullName}</h1>
          <p className="text-dark-400 mt-1">پنل دبیر</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-dark-800 rounded-xl">
          <Calendar className="w-4 h-4 text-dark-400" />
          <span className="text-dark-300 text-sm">{new Date().toLocaleDateString('fa-IR')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">{stat.label}</p>
                <p className="text-3xl font-bold text-dark-100 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${
                stat.color === 'primary' ? 'bg-primary-600/20' :
                stat.color === 'green' ? 'bg-green-500/20' :
                stat.color === 'yellow' ? 'bg-yellow-500/20' :
                'bg-red-500/20'
              }`}>
                <stat.icon className={`w-6 h-6 ${
                  stat.color === 'primary' ? 'text-primary-400' :
                  stat.color === 'green' ? 'text-green-400' :
                  stat.color === 'yellow' ? 'text-yellow-400' :
                  'text-red-400'
                }`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="میانگین نمرات کلاس‌ها" subtitle="روند ۶ ماه اخیر" icon={<TrendingUp className="w-5 h-5" />} />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="average" stroke="#22c55e" fillOpacity={1} fill="url(#colorAvg)" name="میانگین" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="آمار دروس" subtitle="تعداد دانش‌آموزان" icon={<BookOpen className="w-5 h-5" />} />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lessonStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={80} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Bar dataKey="students" fill="#3b82f6" radius={[0, 4, 4, 0]} name="دانش‌آموز" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="تحلیل عملکرد" subtitle="شاخص‌های کلیدی" icon={<ClipboardList className="w-5 h-5" />} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-dark-800 rounded-xl text-center">
            <p className="text-dark-500 text-sm mb-1">میانگین نمرات</p>
            <p className="text-2xl font-bold text-primary-400">{performance.averageClassScore.toFixed(1)}</p>
          </div>
          <div className="p-4 bg-dark-800 rounded-xl text-center">
            <p className="text-dark-500 text-sm mb-1">نرخ پیشرفت</p>
            <p className="text-2xl font-bold text-green-400">{performance.improvementRate.toFixed(0)}%</p>
          </div>
          <div className="p-4 bg-dark-800 rounded-xl text-center">
            <p className="text-dark-500 text-sm mb-1">تکمیل تکالیف</p>
            <p className="text-2xl font-bold text-yellow-400">{performance.homeworkCompletionRate.toFixed(0)}%</p>
          </div>
          <div className="p-4 bg-dark-800 rounded-xl text-center">
            <p className="text-dark-500 text-sm mb-1">اثربخشی</p>
            <p className="text-2xl font-bold text-purple-400">{performance.effectiveness.toFixed(0)}%</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="دانش‌آموزان نیازمند توجه" icon={<AlertTriangle className="w-5 h-5" />} action={<Badge variant="warning">{studentsWithRisk.length} نفر</Badge>} />
          {studentsWithRisk.length > 0 ? (
            <div className="space-y-3">
              {studentsWithRisk.map(({ student, analysis }) => {
                const grade = grades.find(g => g.id === student.gradeId);
                const cls = grade?.classes.find(c => c.id === student.classId);
                return (
                  <div key={student.id} className="flex items-center justify-between p-4 bg-dark-800 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                        analysis.riskScore > 75 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>{analysis.riskScore}</div>
                      <div><p className="font-medium text-dark-100">{student.fullName}</p><p className="text-sm text-dark-500">{grade?.name} - {cls?.name}</p></div>
                    </div>
                    <div className="text-sm text-dark-400">{analysis.factors[0]?.description}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8"><CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" /><p className="text-dark-400">همه دانش‌آموزان در وضعیت خوب هستند</p></div>
          )}
        </Card>

        <Card>
          <CardHeader title="دسترسی سریع" icon={<Clock className="w-5 h-5" />} />
          <div className="space-y-3">
            <button className="w-full flex items-center gap-3 p-4 bg-dark-800 hover:bg-dark-700 rounded-xl transition-colors text-right">
              <div className="p-2 bg-primary-600/20 rounded-lg"><ClipboardList className="w-5 h-5 text-primary-400" /></div>
              <span className="text-dark-200">ثبت حضور و غیاب</span>
            </button>
            <button className="w-full flex items-center gap-3 p-4 bg-dark-800 hover:bg-dark-700 rounded-xl transition-colors text-right">
              <div className="p-2 bg-green-500/20 rounded-lg"><BookOpen className="w-5 h-5 text-green-400" /></div>
              <span className="text-dark-200">ثبت نمره جدید</span>
            </button>
            <button className="w-full flex items-center gap-3 p-4 bg-dark-800 hover:bg-dark-700 rounded-xl transition-colors text-right">
              <div className="p-2 bg-yellow-500/20 rounded-lg"><GraduationCap className="w-5 h-5 text-yellow-400" /></div>
              <span className="text-dark-200">افزودن تکلیف</span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboard;