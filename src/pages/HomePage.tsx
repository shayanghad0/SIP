import { BookOpen, BrainCircuit, GraduationCap, HeartHandshake, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button, Card, EmptyState, PageHeader, StatCard, SkeletonGrid } from "../components/ui";
import { useSession } from "../lib/session";
import { faNum } from "../lib/format";
import { adminOverview, studentsList, teachersList, consultantsList } from "../lib/api";
import type { OverviewData } from "../lib/api";

interface SchoolInfo {
  name: string;
  studentCount: number;
  teacherCount: number;
  consultantCount: number;
  adminCount: number;
  teachers: { name: string; role: string }[];
  consultants: { name: string; role: string }[];
  admins: { name: string; role: string }[];
}

export function HomePage() {
  const { ready, installed, session } = useSession();
  const navigate = useNavigate();
  const [data, setData] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState("مدرسه هوشمند");

  useEffect(() => {
    if (!ready) return;
    
    const fetchData = async () => {
      try {
        if (installed) {
          const overview = await adminOverview();
          const students = await studentsList();
          const teachers = await teachersList();
          const consultants = await consultantsList();
          
          // Read admin data from localStorage
          const adminRaw = localStorage.getItem("sip-db-admin");
          const adminData = adminRaw ? JSON.parse(adminRaw) : { admins: [], schoolName: "مدرسه هوشمند" };
          setSchoolName(adminData.schoolName || "مدرسه هوشمند");
          
          const admins = adminData.admins.map((admin: any) => ({ name: admin.fullName, role: "مدیر" }));
          
          const schoolInfo: SchoolInfo = {
            name: adminData.schoolName || "مدرسه هوشمند",
            studentCount: students.length,
            teacherCount: teachers.length,
            consultantCount: consultants.length,
            adminCount: admins.length,
            teachers: teachers.map((t: any) => ({ name: t.teacher.fullName, role: "دبیر" })),
            consultants: consultants.map((c: any) => ({ name: c.fullName, role: "مشاور" })),
            admins: admins
          };
          
          setData(schoolInfo);
        }
      } catch (error) {
        console.error("Failed to load school data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [ready, installed]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/30">
          <BrainCircuit size={28} className="text-white" />
        </div>
      </div>
    );
  }

  if (!installed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <Card className="max-w-md w-full mx-4">
          <div className="text-center p-8">
            <BrainCircuit size={48} className="mx-auto text-blue-400 mb-4" />
            <h2 className="text-xl font-semibold text-slate-100 mb-2">سامانه یکپارچه پیشرفت دانش آموزی</h2>
            <p className="text-slate-400 mb-6">برای شروع کار با سامانه، ابتدا باید سیستم را نصب کنید.</p>
            <p className="text-slate-400 mb-6">لطفا از مدیرمدرسه درخواست کنید سامانه رو نصب کنه</p>
          </div>
        </Card>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <div className="container mx-auto px-4 py-8">
          <SkeletonGrid rows={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{schoolName}</h1>
            <p className="text-slate-400 mt-1">سامانه یکپارچه پیشرفت دانش آموزی</p>
          </div>
          <Button onClick={() => navigate("/login")}>ورود به سامانه</Button>
        </header>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5 mb-8">
          <StatCard icon={<Users size={20} />} label="دانش آموزان" value={faNum(data?.studentCount || 0)} tone="blue" />
          <StatCard icon={<GraduationCap size={20} />} label="دبیران" value={faNum(data?.teacherCount || 0)} tone="emerald" />
          <StatCard icon={<ShieldCheck size={20} />} label="مشاوران" value={faNum(data?.consultantCount || 0)} tone="violet" />
          <StatCard icon={<BrainCircuit size={20} />} label="مدیران" value={faNum(data?.adminCount || 0)} tone="amber" />
          <StatCard icon={<BookOpen size={20} />} label="کل کاربران" value={faNum((data?.studentCount || 0) + (data?.teacherCount || 0) + (data?.consultantCount || 0) + (data?.adminCount || 0))} tone="cyan" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="دبیران مدرسه">
            {data?.teachers.length === 0 ? (
              <p className="text-slate-400 text-center py-4">هیچ دبیری ثبت نشده است</p>
            ) : (
              <div className="space-y-3">
                {data?.teachers.map((teacher, index) => (
                  <div key={index} className="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-800/50">
                    <GraduationCap size={16} className="text-emerald-400" />
                    <span className="text-slate-200">{teacher.name}</span>
                    <span className="ml-auto text-xs text-slate-400">{teacher.role}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="مشاوران مدرسه">
            {data?.consultants.length === 0 ? (
              <p className="text-slate-400 text-center py-4">هیچ مشاوری ثبت نشده است</p>
            ) : (
              <div className="space-y-3">
                {data?.consultants.map((consultant, index) => (
                  <div key={index} className="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-800/50">
                    <ShieldCheck size={16} className="text-violet-400" />
                    <span className="text-slate-200">{consultant.name}</span>
                    <span className="ml-auto text-xs text-slate-400">{consultant.role}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="mt-6">
          <Card title="مدیران مدرسه">
            {data?.admins.length === 0 ? (
              <p className="text-slate-400 text-center py-4">هیچ مدیری ثبت نشده است</p>
            ) : (
              <div className="space-y-3">
                {data?.admins.map((admin, index) => (
                  <div key={index} className="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-800/50">
                    <BrainCircuit size={16} className="text-amber-400" />
                    <span className="text-slate-200">{admin.name}</span>
                    <span className="ml-auto text-xs text-slate-400">{admin.role}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <section className="mt-12">
          <PageHeader title="سامانه یکپارچه پیشرفت دانش آموزی" subtitle="چرا از این سامانه استفاده کنیم؟" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <div className="flex items-start gap-3">
                <BrainCircuit size={20} className="text-blue-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-100 mb-2">تحلیل هوشمند پیشرفت</h3>
                  <p className="text-slate-400 text-sm">سامانه با استفاده از الگوریتم‌های هوش مصنوعی، پیشرفت تحصیلی دانش‌آموزان را تحلیل کرده و نقاط قوت و ضعف را شناسایی می‌کند.</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start gap-3">
                <Users size={20} className="text-emerald-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-100 mb-2">ارتباط موثر بین مدرسه و خانواده</h3>
                  <p className="text-slate-400 text-sm">والدین می‌توانند به صورت لحظه‌ای از وضعیت تحصیلی فرزندان خود مطلع شوند و با مدرسه در ارتباط باشند.</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start gap-3">
                <BookOpen size={20} className="text-violet-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-100 mb-2">مدیریت متمرکز اطلاعات</h3>
                  <p className="text-slate-400 text-sm">تمام اطلاعات تحصیلی، رفتاری، و سلامت روان دانش‌آموزان در یک سامانه متمرکز قابل دسترسی است.</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start gap-3">
                <HeartHandshake size={20} className="text-rose-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-100 mb-2">پیشگیری از افت تحصیلی</h3>
                  <p className="text-slate-400 text-sm">با شناسایی زودهنگام دانش‌آموزان در معرض خطر، می‌توان اقدامات پیشگیرانه را انجام داد.</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start gap-3">
                <GraduationCap size={20} className="text-cyan-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-100 mb-2">بهبود کیفیت آموزش</h3>
                  <p className="text-slate-400 text-sm">دبیران می‌توانند با تحلیل عملکرد دانش‌آموزان، روش‌های تدریس خود را بهبود بخشند.</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start gap-3">
                <ShieldCheck size={20} className="text-amber-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-100 mb-2">امنیت اطلاعات</h3>
                  <p className="text-slate-400 text-sm">تمام اطلاعات با بالاترین استانداردهای امنیتی ذخیره و محافظت می‌شوند.</p>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}