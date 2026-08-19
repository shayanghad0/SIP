import React, { useMemo } from 'react';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  Target,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { Card, CardHeader, Badge } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import db from '../../services/database';
import { calculateRiskScore } from '../../services/aiEngine';
import type { Parent } from '../../types';

export const ParentDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const parent = user as Parent;

  const grades = useMemo(() => db.getGrades(), []);
  const books = useMemo(() => db.getBooks(), []);
  const allStudents = useMemo(() => db.getStudents(), []);

  // Get parent's children
  const myChildren = useMemo(() => {
    return allStudents.filter(s => parent.studentIds.includes(s.id));
  }, [allStudents, parent.studentIds]);

  // Get analysis for each child
  const childrenAnalysis = useMemo(() => {
    return myChildren.map(child => ({
      child,
      analysis: calculateRiskScore(child.id),
      grade: grades.find(g => g.id === child.gradeId),
      className: grades.find(g => g.id === child.gradeId)?.classes.find(c => c.id === child.classId)?.name,
    }));
  }, [myChildren, grades]);

  // Mock attendance data
  const attendanceData = [
    { month: 'مهر', rate: 95 },
    { month: 'آبان', rate: 88 },
    { month: 'آذر', rate: 92 },
    { month: 'دی', rate: 90 },
    { month: 'بهمن', rate: 97 },
    { month: 'اسفند', rate: 94 },
  ];

  // Get summary for first child (main view)
  const primaryChild = childrenAnalysis[0];
  const performanceScore = primaryChild ? 100 - primaryChild.analysis.riskScore : 0;

  const radialData = [
    { name: 'عملکرد', value: performanceScore, fill: '#3b82f6' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-100">خوش آمدید، {parent.fullName}</h1>
          <p className="text-dark-400 mt-1">پنل والدین</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-dark-800 rounded-xl">
          <Calendar className="w-4 h-4 text-dark-400" />
          <span className="text-dark-300 text-sm">
            {new Date().toLocaleDateString('fa-IR')}
          </span>
        </div>
      </div>

      {/* Children Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {childrenAnalysis.map(({ child, analysis, grade, className }) => (
          <Card key={child.id} hover>
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl ${
                analysis.riskScore > 60 ? 'bg-red-500/20 text-red-400' :
                analysis.riskScore > 30 ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {100 - analysis.riskScore}
              </div>
              <div>
                <h3 className="font-medium text-dark-100">{child.fullName}</h3>
                <p className="text-dark-500 text-sm">{grade?.name} - {className}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  analysis.riskScore > 60 ? 'danger' :
                  analysis.riskScore > 30 ? 'warning' : 'success'
                }
              >
                {analysis.riskScore > 60 ? 'نیاز به توجه' :
                 analysis.riskScore > 30 ? 'متوسط' : 'عالی'}
              </Badge>
              {analysis.factors[0]?.trend === 'improving' && (
                <div className="flex items-center gap-1 text-green-400 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>رو به بهبود</span>
                </div>
              )}
              {analysis.factors[0]?.trend === 'declining' && (
                <div className="flex items-center gap-1 text-red-400 text-sm">
                  <TrendingDown className="w-4 h-4" />
                  <span>نیاز به توجه</span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {primaryChild && (
        <>
          {/* Alert if needed */}
          {primaryChild.analysis.riskScore > 60 && (
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/20 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-dark-100">توجه</h3>
                  <p className="text-dark-400 text-sm">
                    {primaryChild.child.fullName} در برخی زمینه‌ها نیاز به توجه بیشتر دارد
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Performance & Attendance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Gauge */}
            <Card>
              <CardHeader
                title="امتیاز عملکرد"
                subtitle={primaryChild.child.fullName}
                icon={<Target className="w-5 h-5" />}
              />
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="80%"
                    data={radialData}
                    startAngle={180}
                    endAngle={0}
                  >
                    <RadialBar
                      dataKey="value"
                      cornerRadius={10}
                      background={{ fill: '#1e293b' }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute text-center">
                  <p className="text-4xl font-bold text-dark-100">{performanceScore}</p>
                  <p className="text-dark-500 text-sm">از ۱۰۰</p>
                </div>
              </div>
            </Card>

            {/* Attendance Chart */}
            <Card>
              <CardHeader
                title="روند حضور و غیاب"
                subtitle="۶ ماه اخیر"
                icon={<Calendar className="w-5 h-5" />}
              />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} domain={[70, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: '#22c55e' }}
                      name="درصد حضور"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Factors & Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Factors */}
            <Card>
              <CardHeader
                title="تحلیل عملکرد"
                subtitle="وضعیت در هر بخش"
                icon={<BookOpen className="w-5 h-5" />}
              />
              <div className="space-y-4">
                {primaryChild.analysis.factors.map((factor, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-dark-200 text-sm">{factor.category}</span>
                      <span className={`text-sm font-medium ${
                        factor.score > 50 ? 'text-red-400' :
                        factor.score > 25 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {(100 - factor.score).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          factor.score > 50 ? 'bg-red-500' :
                          factor.score > 25 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${100 - factor.score}%` }}
                      />
                    </div>
                    <p className="text-dark-500 text-xs">{factor.description}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader
                title="توصیه‌های هوشمند"
                subtitle="برای بهبود عملکرد"
                icon={<FileText className="w-5 h-5" />}
              />
              {primaryChild.analysis.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {primaryChild.analysis.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-dark-800 rounded-xl"
                    >
                      <div className="p-1.5 bg-primary-600/20 rounded-lg mt-0.5">
                        <CheckCircle className="w-3 h-3 text-primary-400" />
                      </div>
                      <p className="text-dark-300 text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-dark-400">همه چیز عالی است!</p>
                  <p className="text-dark-500 text-sm">به همین روند ادامه دهید</p>
                </div>
              )}
            </Card>
          </div>

          {/* Predicted Grades */}
          <Card>
            <CardHeader
              title="پیش‌بینی نمرات"
              subtitle="بر اساس عملکرد فعلی"
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {primaryChild.analysis.predictedGrades.slice(0, 8).map((pred, index) => {
                const book = books.find(b => b.id === pred.lessonId);
                return (
                  <div key={index} className="p-4 bg-dark-800 rounded-xl">
                    <p className="text-dark-400 text-sm mb-2">{book?.name || 'درس'}</p>
                    <div className="flex items-center justify-between">
                      <p className={`text-2xl font-bold ${
                        pred.predictedScore >= 70 ? 'text-green-400' :
                        pred.predictedScore >= 50 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {pred.predictedScore.toFixed(0)}
                      </p>
                      {pred.trend === 'up' && (
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      )}
                      {pred.trend === 'down' && (
                        <TrendingDown className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <p className="text-dark-500 text-xs mt-1">
                      اطمینان: {pred.confidence}%
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Quick Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card padding="sm" className="text-center">
              <div className="p-3 bg-primary-600/20 rounded-xl inline-block mb-2">
                <Users className="w-6 h-6 text-primary-400" />
              </div>
              <p className="text-dark-500 text-sm">فرزندان</p>
              <p className="text-2xl font-bold text-dark-100">{myChildren.length}</p>
            </Card>
            <Card padding="sm" className="text-center">
              <div className="p-3 bg-green-500/20 rounded-xl inline-block mb-2">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-dark-500 text-sm">میانگین حضور</p>
              <p className="text-2xl font-bold text-dark-100">92%</p>
            </Card>
            <Card padding="sm" className="text-center">
              <div className="p-3 bg-yellow-500/20 rounded-xl inline-block mb-2">
                <FileText className="w-6 h-6 text-yellow-400" />
              </div>
              <p className="text-dark-500 text-sm">تکالیف باز</p>
              <p className="text-2xl font-bold text-dark-100">3</p>
            </Card>
            <Card padding="sm" className="text-center">
              <div className="p-3 bg-purple-500/20 rounded-xl inline-block mb-2">
                <Clock className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-dark-500 text-sm">آزمون بعدی</p>
              <p className="text-lg font-bold text-dark-100">۵ روز</p>
            </Card>
          </div>
        </>
      )}

      {myChildren.length === 0 && (
        <Card className="text-center py-12">
          <Users className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400">هنوز فرزندی ثبت نشده است</p>
        </Card>
      )}
    </div>
  );
};

export default ParentDashboard;
