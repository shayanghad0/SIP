import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  AlertTriangle,
  Heart,
  TrendingDown,
  Calendar,
  FileText,
  Brain,
  CheckCircle,
  Clock,
  MessageCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardHeader, Badge, LoadingScreen } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import db from '../../services/database';
import { calculateRiskScore } from '../../services/aiEngine';
import type { Consultant } from '../../types';

export const ConsultantDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const consultant = user as Consultant;

  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [mentalHealthForms, setMentalHealthForms] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [gradesData, studentsData, formsData] = await Promise.all([
          db.getGrades(),
          db.getStudents(),
          db.getMentalHealthForms(),
        ]);
        setGrades(gradesData);
        setStudents(studentsData);
        setMentalHealthForms(formsData);
      } catch (error) {
        console.error('Failed to load consultant dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const studentsWithAnalysis = useMemo(() => {
    return students.map(student => ({
      student,
      analysis: calculateRiskScore(student.id),
      forms: mentalHealthForms.filter(f => f.studentId === student.id),
    }));
  }, [students, mentalHealthForms]);

  const highRiskStudents = useMemo(() => {
    return studentsWithAnalysis
      .filter(item => item.analysis.riskScore > 60)
      .sort((a, b) => b.analysis.riskScore - a.analysis.riskScore);
  }, [studentsWithAnalysis]);

  const mentalHealthConcerns = useMemo(() => {
    return studentsWithAnalysis.filter(item => {
      const latestForm = item.forms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      if (!latestForm) return false;
      return latestForm.stressLevel > 7 || latestForm.anxietyLevel > 7 || latestForm.motivationLevel < 4;
    });
  }, [studentsWithAnalysis]);

  const riskDistribution = useMemo(() => {
    const low = studentsWithAnalysis.filter(s => s.analysis.riskScore <= 30).length;
    const medium = studentsWithAnalysis.filter(s => s.analysis.riskScore > 30 && s.analysis.riskScore <= 60).length;
    const high = studentsWithAnalysis.filter(s => s.analysis.riskScore > 60 && s.analysis.riskScore <= 80).length;
    const critical = studentsWithAnalysis.filter(s => s.analysis.riskScore > 80).length;
    return [
      { name: 'کم خطر', value: low, color: '#22c55e' },
      { name: 'متوسط', value: medium, color: '#eab308' },
      { name: 'پرخطر', value: high, color: '#f97316' },
      { name: 'بحرانی', value: critical, color: '#ef4444' },
    ];
  }, [studentsWithAnalysis]);

  const mentalHealthTrends = useMemo(() => {
    const trends: Record<string, { stress: number; anxiety: number; motivation: number; count: number }> = {};
    mentalHealthForms.forEach(form => {
      const month = new Date(form.createdAt).toLocaleDateString('fa-IR', { month: 'short' });
      if (!trends[month]) trends[month] = { stress: 0, anxiety: 0, motivation: 0, count: 0 };
      trends[month].stress += form.stressLevel;
      trends[month].anxiety += form.anxietyLevel;
      trends[month].motivation += form.motivationLevel;
      trends[month].count += 1;
    });
    return Object.entries(trends).map(([month, data]) => ({
      month,
      stress: data.count > 0 ? data.stress / data.count : 0,
      anxiety: data.count > 0 ? data.anxiety / data.count : 0,
      motivation: data.count > 0 ? data.motivation / data.count : 0,
    })).slice(-6);
  }, [mentalHealthForms]);

  const stats = [
    { label: 'کل دانش‌آموزان', value: students.length, icon: Users, color: 'primary' },
    { label: 'دانش‌آموزان پرخطر', value: highRiskStudents.length, icon: AlertTriangle, color: 'red' },
    { label: 'نگرانی سلامت روان', value: mentalHealthConcerns.length, icon: Heart, color: 'yellow' },
    { label: 'فرم‌های ثبت شده', value: mentalHealthForms.length, icon: FileText, color: 'green' },
  ];

  if (loading) return <LoadingScreen message="در حال بارگذاری داشبورد مشاور..." />;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-dark-100">سلام، {consultant.fullName}</h1><p className="text-dark-400 mt-1">پنل مشاوره</p></div>
        <div className="flex items-center gap-2 px-4 py-2 bg-dark-800 rounded-xl">
          <Calendar className="w-4 h-4 text-dark-400" />
          <span className="text-dark-300 text-sm">{new Date().toLocaleDateString('fa-IR')}</span>
        </div>
      </div>

      {highRiskStudents.filter(s => s.analysis.riskScore > 80).length > 0 && (
        <Card className="border-red-500/50 bg-red-500/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/20 rounded-xl"><AlertTriangle className="w-6 h-6 text-red-400" /></div>
            <div className="flex-1">
              <h3 className="font-medium text-dark-100">هشدار فوری</h3>
              <p className="text-dark-400 text-sm">{highRiskStudents.filter(s => s.analysis.riskScore > 80).length} دانش‌آموز در وضعیت بحرانی هستند و نیاز به توجه فوری دارند</p>
            </div>
            <Badge variant="danger">فوری</Badge>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} hover>
            <div className="flex items-center justify-between">
              <div><p className="text-dark-400 text-sm">{stat.label}</p><p className="text-3xl font-bold text-dark-100 mt-1">{stat.value}</p></div>
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
          <CardHeader title="توزیع ریسک" subtitle="وضعیت کلی دانش‌آموزان" icon={<Brain className="w-5 h-5" />} />
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {riskDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {riskDistribution.map((item, index) => <div key={index} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-dark-400 text-sm">{item.name}</span></div>)}
          </div>
        </Card>

        <Card>
          <CardHeader title="روند سلامت روان" subtitle="میانگین ماهانه" icon={<Heart className="w-5 h-5" />} />
          <div className="h-64">
            {mentalHealthTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mentalHealthTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={[0, 10]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Bar dataKey="stress" fill="#ef4444" name="استرس" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="anxiety" fill="#f97316" name="اضطراب" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="motivation" fill="#22c55e" name="انگیزه" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center"><p className="text-dark-500">داده‌ای موجود نیست</p></div>}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="دانش‌آموزان نیازمند توجه" subtitle="بر اساس امتیاز ریسک" icon={<AlertTriangle className="w-5 h-5" />} action={<Badge variant="danger">{highRiskStudents.length} نفر</Badge>} />
        {highRiskStudents.length > 0 ? (
          <div className="space-y-3">
            {highRiskStudents.slice(0, 8).map(({ student, analysis }) => {
              const grade = grades.find(g => g.id === student.gradeId);
              const cls = grade?.classes.find(c => c.id === student.classId);
              const mainIssue = analysis.factors.sort((a, b) => b.score - a.score)[0];
              return (
                <div key={student.id} className="flex items-center justify-between p-4 bg-dark-800 rounded-xl hover:bg-dark-700 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
                      analysis.riskScore > 80 ? 'bg-red-500/20 text-red-400' :
                      analysis.riskScore > 60 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>{analysis.riskScore}</div>
                    <div><p className="font-medium text-dark-100">{student.fullName}</p><p className="text-sm text-dark-500">{grade?.name} - {cls?.name}</p></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-left"><p className="text-dark-300 text-sm">{mainIssue?.category}</p><p className="text-dark-500 text-xs">{mainIssue?.description}</p></div>
                    <Badge variant={analysis.riskScore > 80 ? 'danger' : 'warning'}>{analysis.riskScore > 80 ? 'بحرانی' : 'پرخطر'}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12"><CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" /><p className="text-dark-400">همه دانش‌آموزان در وضعیت خوب هستند</p></div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card hover className="cursor-pointer"><div className="flex items-center gap-4"><div className="p-4 bg-primary-600/20 rounded-xl"><MessageCircle className="w-8 h-8 text-primary-400" /></div><div><h3 className="font-medium text-dark-100">ثبت جلسه مشاوره</h3><p className="text-dark-500 text-sm">ثبت گزارش جلسه جدید</p></div></div></Card>
        <Card hover className="cursor-pointer"><div className="flex items-center gap-4"><div className="p-4 bg-yellow-500/20 rounded-xl"><Clock className="w-8 h-8 text-yellow-400" /></div><div><h3 className="font-medium text-dark-100">جلسات پیش‌رو</h3><p className="text-dark-500 text-sm">برنامه‌ریزی جلسات</p></div></div></Card>
        <Card hover className="cursor-pointer"><div className="flex items-center gap-4"><div className="p-4 bg-green-500/20 rounded-xl"><TrendingDown className="w-8 h-8 text-green-400" /></div><div><h3 className="font-medium text-dark-100">گزارش پیشرفت</h3><p className="text-dark-500 text-sm">مشاهده روند بهبود</p></div></div></Card>
      </div>
    </div>
  );
};

export default ConsultantDashboard;