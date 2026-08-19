import React, { useMemo } from 'react';
import {
  Users,
  GraduationCap,
  UserCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Brain,
  BookOpen,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { Card, CardHeader, Badge } from '../../components/ui';
import db from '../../services/database';
import { getSchoolAnalytics, calculateRiskScore } from '../../services/aiEngine';

// Colors for charts - used in components below

export const AdminDashboard: React.FC = () => {
  const analytics = useMemo(() => getSchoolAnalytics(), []);
  const students = useMemo(() => db.getStudents(), []);
  const teachers = useMemo(() => db.getTeachers(), []);
  const consultants = useMemo(() => db.getConsultants(), []);
  const grades = useMemo(() => db.getGrades(), []);

  const riskStudents = useMemo(() => {
    return students
      .map(student => ({
        student,
        analysis: calculateRiskScore(student.id),
      }))
      .filter(item => item.analysis.riskScore > 60)
      .sort((a, b) => b.analysis.riskScore - a.analysis.riskScore)
      .slice(0, 5);
  }, [students]);

  // Stats cards data
  const stats = [
    {
      title: 'دانش‌آموزان',
      value: students.length,
      icon: Users,
      color: 'primary',
      change: '+5%',
      trend: 'up',
    },
    {
      title: 'دبیران',
      value: teachers.length,
      icon: GraduationCap,
      color: 'green',
      change: '0%',
      trend: 'stable',
    },
    {
      title: 'مشاوران',
      value: consultants.length,
      icon: UserCheck,
      color: 'yellow',
      change: '0%',
      trend: 'stable',
    },
    {
      title: 'دانش‌آموزان در خطر',
      value: analytics.highRiskStudents,
      icon: AlertTriangle,
      color: 'red',
      change: analytics.highRiskStudents > 0 ? 'نیاز به توجه' : 'عالی',
      trend: analytics.highRiskStudents > 0 ? 'down' : 'up',
    },
  ];

  // Mock data for charts
  const attendanceData = [
    { name: 'فروردین', present: 92, absent: 8 },
    { name: 'اردیبهشت', present: 88, absent: 12 },
    { name: 'خرداد', present: 95, absent: 5 },
    { name: 'تیر', present: 90, absent: 10 },
    { name: 'مرداد', present: 85, absent: 15 },
    { name: 'شهریور', present: 93, absent: 7 },
  ];

  const gradeDistribution = analytics.gradeAnalytics.map(g => ({
    name: g.gradeName,
    students: g.studentCount,
    average: Math.round(g.averageScore),
    risk: g.riskCount,
  }));

  const riskDistribution = [
    { name: 'کم خطر', value: students.length - analytics.highRiskStudents },
    { name: 'پرخطر', value: analytics.highRiskStudents },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-100">داشبورد مدیریت</h1>
          <p className="text-dark-400 mt-1">نمای کلی وضعیت مدرسه</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-dark-800 rounded-xl">
          <Calendar className="w-4 h-4 text-dark-400" />
          <span className="text-dark-300 text-sm">
            {new Date().toLocaleDateString('fa-IR')}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} hover className="relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-dark-400 text-sm">{stat.title}</p>
                <p className="text-3xl font-bold text-dark-100 mt-1">{stat.value}</p>
                <div className="flex items-center gap-1 mt-2">
                  {stat.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  ) : stat.trend === 'down' ? (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  ) : (
                    <Activity className="w-4 h-4 text-yellow-400" />
                  )}
                  <span className={`text-xs ${
                    stat.trend === 'up' ? 'text-green-400' :
                    stat.trend === 'down' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>
                    {stat.change}
                  </span>
                </div>
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Chart */}
        <Card>
          <CardHeader
            title="روند حضور و غیاب"
            subtitle="۶ ماه اخیر"
            icon={<Activity className="w-5 h-5" />}
          />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceData}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="present"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorPresent)"
                  name="حضور"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Grade Distribution */}
        <Card>
          <CardHeader
            title="توزیع دانش‌آموزان"
            subtitle="بر اساس پایه تحصیلی"
            icon={<BookOpen className="w-5 h-5" />}
          />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="students" fill="#3b82f6" radius={[4, 4, 0, 0]} name="تعداد" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Risk Students & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Students List */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="دانش‌آموزان در معرض خطر"
            subtitle="نیاز به توجه فوری"
            icon={<AlertTriangle className="w-5 h-5" />}
            action={
              <Badge variant="danger">{riskStudents.length} نفر</Badge>
            }
          />
          {riskStudents.length > 0 ? (
            <div className="space-y-3">
              {riskStudents.map(({ student, analysis }) => {
                const grade = grades.find(g => g.id === student.gradeId);
                const cls = grade?.classes.find(c => c.id === student.classId);
                return (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 bg-dark-800 rounded-xl hover:bg-dark-700 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                        <span className="text-red-400 font-bold">{analysis.riskScore}</span>
                      </div>
                      <div>
                        <p className="font-medium text-dark-100">{student.fullName}</p>
                        <p className="text-sm text-dark-500">
                          {grade?.name} - {cls?.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          analysis.riskScore > 80 ? 'danger' :
                          analysis.riskScore > 60 ? 'warning' : 'default'
                        }
                      >
                        {analysis.riskScore > 80 ? 'بحرانی' :
                         analysis.riskScore > 60 ? 'پرخطر' : 'متوسط'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-dark-400">هیچ دانش‌آموز پرخطری وجود ندارد</p>
              <p className="text-dark-500 text-sm mt-1">وضعیت عالی است!</p>
            </div>
          )}
        </Card>

        {/* Risk Distribution Pie */}
        <Card>
          <CardHeader
            title="توزیع ریسک"
            subtitle="وضعیت کلی"
            icon={<Brain className="w-5 h-5" />}
          />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskDistribution.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? '#22c55e' : '#ef4444'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-dark-400 text-sm">کم خطر</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-dark-400 text-sm">پرخطر</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="sm" className="text-center">
          <p className="text-dark-500 text-sm">میانگین حضور</p>
          <p className="text-2xl font-bold text-green-400 mt-1">
            {analytics.averageAttendance.toFixed(0)}%
          </p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-dark-500 text-sm">میانگین ریسک</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">
            {analytics.averageRiskScore.toFixed(0)}
          </p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-dark-500 text-sm">تعداد پایه‌ها</p>
          <p className="text-2xl font-bold text-primary-400 mt-1">{grades.length}</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-dark-500 text-sm">تعداد کلاس‌ها</p>
          <p className="text-2xl font-bold text-primary-400 mt-1">
            {grades.reduce((sum, g) => sum + g.classes.length, 0)}
          </p>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
