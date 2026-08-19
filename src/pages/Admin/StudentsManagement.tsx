import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  Heart,
  TrendingUp,
  Target,
  AlertTriangle,
  Star,
  FileText,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card, CardHeader, Badge, Button, Modal, Input } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import db, { generateId } from '../../services/database';
import { calculateRiskScore } from '../../services/aiEngine';
import type { Student, MentalHealthForm } from '../../types';

interface WellnessFormData {
  stressLevel: number;
  anxietyLevel: number;
  motivationLevel: number;
  sleepQuality: number;
  socialInteraction: number;
  notes: string;
}

export const StudentDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const student = user as Student;
  const [isWellnessModalOpen, setIsWellnessModalOpen] = useState(false);

  const { register, handleSubmit, reset } = useForm<WellnessFormData>({
    defaultValues: {
      stressLevel: 5,
      anxietyLevel: 5,
      motivationLevel: 5,
      sleepQuality: 5,
      socialInteraction: 5,
      notes: '',
    },
  });

  const grades = useMemo(() => db.getGrades(), []);
  const books = useMemo(() => db.getBooks(), []);
  const analysis = useMemo(() => calculateRiskScore(student.id), [student.id]);
  
  const grade = grades.find(g => g.id === student.gradeId);
  const className = grade?.classes.find(c => c.id === student.classId)?.name;

  // Get latest mental health forms
  const mentalHealthForms = useMemo(() => {
    return db.getMentalHealthForms(student.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [student.id]);

  const latestForm = mentalHealthForms[0];
  const needsWellnessForm = !latestForm || 
    (new Date().getTime() - new Date(latestForm.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000;

  // Mock grade data for chart
  const gradeHistory = [
    { month: 'مهر', score: 75 },
    { month: 'آبان', score: 78 },
    { month: 'آذر', score: 72 },
    { month: 'دی', score: 80 },
    { month: 'بهمن', score: 85 },
    { month: 'اسفند', score: 82 },
  ];

  // Radar data for skills
  const skillsData = analysis.factors.map(factor => ({
    subject: factor.category,
    score: 100 - factor.score,
    fullMark: 100,
  }));

  // Study plan from analysis
  const studyPlan = analysis.studyPlan;

  const onSubmitWellness = (data: WellnessFormData) => {
    const form: MentalHealthForm = {
      id: generateId(),
      studentId: student.id,
      date: new Date().toISOString().split('T')[0],
      stressLevel: data.stressLevel,
      anxietyLevel: data.anxietyLevel,
      motivationLevel: data.motivationLevel,
      sleepQuality: data.sleepQuality,
      socialInteraction: data.socialInteraction,
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };
    
    db.add('mentalHealthForms', form);
    setIsWellnessModalOpen(false);
    reset();
    toast.success('فرم سلامت روان ثبت شد');
  };

  const getRiskColor = (score: number) => {
    if (score > 75) return 'red';
    if (score > 50) return 'yellow';
    return 'green';
  };

  const riskColor = getRiskColor(analysis.riskScore);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-100">سلام، {student.fullName}! 👋</h1>
          <p className="text-dark-400 mt-1">{grade?.name} - {className}</p>
        </div>
        <div className="flex items-center gap-3">
          {needsWellnessForm && (
            <Button
              onClick={() => setIsWellnessModalOpen(true)}
              variant="outline"
              icon={<Heart className="w-4 h-4" />}
            >
              فرم سلامت روان
            </Button>
          )}
          <div className="flex items-center gap-2 px-4 py-2 bg-dark-800 rounded-xl">
            <Calendar className="w-4 h-4 text-dark-400" />
            <span className="text-dark-300 text-sm">
              {new Date().toLocaleDateString('fa-IR')}
            </span>
          </div>
        </div>
      </div>

      {/* Wellness Alert */}
      {needsWellnessForm && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/20 rounded-xl">
              <Heart className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-dark-100">فرم هفتگی سلامت روان</h3>
              <p className="text-dark-400 text-sm">لطفاً فرم سلامت روان این هفته را تکمیل کنید</p>
            </div>
            <Button onClick={() => setIsWellnessModalOpen(true)}>
              تکمیل فرم
            </Button>
          </div>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Risk Score */}
        <Card>
          <div className="text-center">
            <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4 ${
              riskColor === 'red' ? 'bg-red-500/20' :
              riskColor === 'yellow' ? 'bg-yellow-500/20' :
              'bg-green-500/20'
            }`}>
              <span className={`text-3xl font-bold ${
                riskColor === 'red' ? 'text-red-400' :
                riskColor === 'yellow' ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {100 - analysis.riskScore}
              </span>
            </div>
            <h3 className="font-medium text-dark-100">امتیاز عملکرد</h3>
            <p className="text-dark-500 text-sm mt-1">
              {analysis.riskScore < 25 ? 'عالی!' :
               analysis.riskScore < 50 ? 'خوب' :
               analysis.riskScore < 75 ? 'نیاز به تلاش بیشتر' :
               'نیاز به توجه فوری'}
            </p>
          </div>
        </Card>

        {/* Study Hours */}
        <Card>
          <div className="text-center">
            <div className="w-20 h-20 mx-auto bg-primary-600/20 rounded-2xl flex items-center justify-center mb-4">
              <Clock className="w-10 h-10 text-primary-400" />
            </div>
            <h3 className="font-medium text-dark-100">برنامه مطالعه</h3>
            <p className="text-2xl font-bold text-primary-400 mt-1">
              {studyPlan?.totalHours || 0} ساعت
            </p>
            <p className="text-dark-500 text-sm">در هفته</p>
          </div>
        </Card>

        {/* Predicted Success */}
        <Card>
          <div className="text-center">
            <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-2xl flex items-center justify-center mb-4">
              <Target className="w-10 h-10 text-green-400" />
            </div>
            <h3 className="font-medium text-dark-100">پیش‌بینی موفقیت</h3>
            <p className="text-2xl font-bold text-green-400 mt-1">
              {Math.round(100 - analysis.riskScore * 0.7)}%
            </p>
            <p className="text-dark-500 text-sm">احتمال قبولی</p>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade History */}
        <Card>
          <CardHeader
            title="روند نمرات"
            subtitle="۶ ماه اخیر"
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={gradeHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                  name="نمره"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Skills Radar */}
        <Card>
          <CardHeader
            title="تحلیل عملکرد"
            subtitle="وضعیت در هر بخش"
            icon={<Star className="w-5 h-5" />}
          />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={skillsData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={11} />
                <PolarRadiusAxis stroke="#64748b" fontSize={10} />
                <Radar
                  name="امتیاز"
                  dataKey="score"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Study Plan & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Study Plan */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="برنامه مطالعه امروز"
            subtitle="پیشنهاد هوش مصنوعی"
            icon={<BookOpen className="w-5 h-5" />}
          />
          {studyPlan && studyPlan.weeklySchedule.length > 0 ? (
            <div className="space-y-3">
              {studyPlan.weeklySchedule[0].sessions.map((session, index) => {
                const book = books.find(b => b.id === session.lessonId);
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-dark-800 rounded-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        session.type === 'study' ? 'bg-primary-600/20' :
                        session.type === 'practice' ? 'bg-green-500/20' :
                        'bg-yellow-500/20'
                      }`}>
                        <BookOpen className={`w-5 h-5 ${
                          session.type === 'study' ? 'text-primary-400' :
                          session.type === 'practice' ? 'text-green-400' :
                          'text-yellow-400'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-dark-100">{book?.name || 'درس'}</p>
                        <p className="text-sm text-dark-500">
                          {session.type === 'study' ? 'مطالعه' :
                           session.type === 'practice' ? 'تمرین' : 'مرور'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="info">{session.duration} دقیقه</Badge>
                      <button className="p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-green-400">
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400">برنامه مطالعه در حال آماده‌سازی است</p>
            </div>
          )}
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader
            title="توصیه‌های هوشمند"
            icon={<AlertTriangle className="w-5 h-5" />}
          />
          {analysis.recommendations.length > 0 ? (
            <div className="space-y-3">
              {analysis.recommendations.slice(0, 4).map((rec, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-dark-800 rounded-xl"
                >
                  <div className="p-1.5 bg-yellow-500/20 rounded-lg mt-0.5">
                    <AlertTriangle className="w-3 h-3 text-yellow-400" />
                  </div>
                  <p className="text-dark-300 text-sm">{rec}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-dark-400">همه چیز عالی است!</p>
            </div>
          )}
        </Card>
      </div>

      {/* Predicted Grades */}
      <Card>
        <CardHeader
          title="پیش‌بینی نمرات"
          subtitle="بر اساس عملکرد فعلی"
          icon={<Target className="w-5 h-5" />}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {analysis.predictedGrades.slice(0, 8).map((pred, index) => {
            const book = books.find(b => b.id === pred.lessonId);
            return (
              <div key={index} className="p-4 bg-dark-800 rounded-xl text-center">
                <p className="text-dark-400 text-sm mb-2">{book?.name || 'درس'}</p>
                <p className={`text-2xl font-bold ${
                  pred.predictedScore >= 70 ? 'text-green-400' :
                  pred.predictedScore >= 50 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {pred.predictedScore.toFixed(0)}
                </p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {pred.trend === 'up' ? (
                    <TrendingUp className="w-3 h-3 text-green-400" />
                  ) : pred.trend === 'down' ? (
                    <TrendingUp className="w-3 h-3 text-red-400 rotate-180" />
                  ) : null}
                  <span className="text-dark-500 text-xs">
                    اطمینان {pred.confidence}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Wellness Form Modal */}
      <Modal
        isOpen={isWellnessModalOpen}
        onClose={() => setIsWellnessModalOpen(false)}
        title="فرم سلامت روان هفتگی"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmitWellness)} className="space-y-6">
          <p className="text-dark-400 text-sm">
            لطفاً هر گزینه را از ۱ (کم) تا ۱۰ (زیاد) امتیاز دهید
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-200 mb-2">میزان استرس</label>
              <Input
                type="range"
                min={1}
                max={10}
                className="w-full"
                {...register('stressLevel', { valueAsNumber: true })}
              />
            </div>
            <div>
              <label className="block text-sm text-dark-200 mb-2">میزان اضطراب</label>
              <Input
                type="range"
                min={1}
                max={10}
                className="w-full"
                {...register('anxietyLevel', { valueAsNumber: true })}
              />
            </div>
            <div>
              <label className="block text-sm text-dark-200 mb-2">میزان انگیزه</label>
              <Input
                type="range"
                min={1}
                max={10}
                className="w-full"
                {...register('motivationLevel', { valueAsNumber: true })}
              />
            </div>
            <div>
              <label className="block text-sm text-dark-200 mb-2">کیفیت خواب</label>
              <Input
                type="range"
                min={1}
                max={10}
                className="w-full"
                {...register('sleepQuality', { valueAsNumber: true })}
              />
            </div>
            <div>
              <label className="block text-sm text-dark-200 mb-2">تعاملات اجتماعی</label>
              <Input
                type="range"
                min={1}
                max={10}
                className="w-full"
                {...register('socialInteraction', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-dark-200 mb-2">توضیحات (اختیاری)</label>
            <textarea
              className="w-full bg-dark-800 border border-dark-600 rounded-xl px-4 py-3 text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              placeholder="اگر نکته‌ای هست بنویسید..."
              {...register('notes')}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsWellnessModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit">ثبت فرم</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StudentDashboard;
