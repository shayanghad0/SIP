import { Bell, CalendarCheck, ClipboardList, Home, Lightbulb, LineChart as LineChartIcon, Moon, MessageSquareHeart } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { lessonOptions, parentHome, type ParentHomeData } from "../lib/api";
import { useSession } from "../lib/session";
import { faDate, faNum, pct } from "../lib/format";
import { AppShell, type NavItem } from "../components/layout";
import { Badge, Card, EmptyState, ProgressBar, RiskBadge, SkeletonGrid, StatCard } from "../components/ui";
import { PlanView, StudyPlanGrid, TrendLine, COLORS } from "./shared";

const NAV: NavItem[] = [
  { key: "overview", label: "نمای کلی", icon: Home },
  { key: "progress", label: "پیشرفت تحصیلی", icon: LineChartIcon },
  { key: "homeworks", label: "تکالیف", icon: ClipboardList },
  { key: "attendance", label: "حضور و غیاب", icon: CalendarCheck },
  { key: "advice", label: "توصیه‌های هوشمند", icon: Lightbulb },
];

export default function ParentDashboard({ section }: { section: string }) {
  const { session, logout } = useSession();
  const navigate = useNavigate();
  const [data, setData] = useState<ParentHomeData | null>(null);
  const known = NAV.some((n) => n.key === section);
  const activeSection = known ? section : "overview";

  useEffect(() => {
    if (session) parentHome(session.sub).then(setData);
  }, [session]);

  const lessons = lessonOptions();
  const planView: PlanView | null = data?.plan
    ? { days: data.plan.days, totalWeeklyMinutes: data.plan.totalWeeklyMinutes, lessons }
    : null;

  return (
    <AppShell role="parent" userName={session?.name ?? "والدین"} nav={NAV} section={activeSection} onNavigate={(k) => navigate(`/dashboard/${k}`)} onLogout={() => { logout(); navigate("/login"); }}>
      {!data ? (
        <SkeletonGrid rows={5} />
      ) : (
        <>
          {activeSection === "overview" && <Overview data={data} />}
          {activeSection === "progress" && <Progress data={data} />}
          {activeSection === "homeworks" && <Homeworks data={data} />}
          {activeSection === "attendance" && <Attendance data={data} />}
          {activeSection === "advice" && <Advice data={data} plan={planView} />}
        </>
      )}
    </AppShell>
  );
}

function Header({ data }: { data: ParentHomeData }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-bold text-white">
        {data.child.fullName.slice(0, 1)}
      </div>
      <div>
        <h1 className="text-lg font-bold text-slate-50">{data.child.fullName}</h1>
        <p className="text-[12px] text-slate-400">{data.classLabel} — پدر: {data.child.fatherName || "—"} / مادر: {data.child.motherName || "—"}</p>
      </div>
      {data.analysis && <span className="mr-auto"><RiskBadge score={data.analysis.riskScore} /></span>}
    </div>
  );
}

function Overview({ data }: { data: ParentHomeData }) {
  const a = data.analysis;
  return (
    <div className="space-y-5">
      <div className="card-surface p-5">
        <Header data={data} />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={<LineChartIcon size={20} />} label="میانگین نمرات" value={a ? `${faNum(a.overallAvg, 1)}/${faNum(20)}` : "—"} sub={a ? `پیش‌بینی ترم: ${faNum(a.predictedSemesterAvg, 1)}` : ""} tone={a && a.overallAvg >= 12 ? "emerald" : "amber"} />
        <StatCard icon={<CalendarCheck size={20} />} label="نرخ حضور" value={a ? pct(Math.round(a.attendanceRate)) : "—"} tone={a && a.attendanceRate >= 85 ? "emerald" : "amber"} />
        <StatCard icon={<ClipboardList size={20} />} label="تکالیف انجام‌شده" value={a ? pct(Math.round(a.homeworkRate)) : "—"} tone="violet" />
        <StatCard icon={<Bell size={20} />} label="هشدار فعال" value={faNum(data.alerts.filter((x) => !x.read).length)} tone={data.alerts.some((x) => !x.read) ? "rose" : "emerald"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="گزارش هفتگی هوشمند" subtitle="تولیدشده توسط موتور تحلیل">
          <p className="text-[13px] leading-8 text-slate-300">{data.insights.weeklyReport}</p>
        </Card>
        <Card title="روند نمرات" subtitle="میانگین هر آزمون">
          <TrendLine data={data.progressSeries} />
        </Card>
      </div>

      {data.alerts.length > 0 && (
        <Card title="هشدارهایی که درباره فرزند شما ثبت شده">
          <div className="space-y-3">
            {data.alerts.slice(0, 4).map((al) => (
              <div key={al.id} className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
                <Bell size={15} className="mt-0.5 shrink-0 text-amber-400" />
                <div>
                  <p className="text-[12.5px] font-medium text-slate-200">{al.title}</p>
                  <p className="mt-0.5 text-[11.5px] leading-5 text-slate-400">{al.message}</p>
                </div>
                <span className="mr-auto whitespace-nowrap text-[10.5px] text-slate-500">{faDate(al.date)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Progress({ data }: { data: ParentHomeData }) {
  return (
    <div className="space-y-5">
      <div className="card-surface p-5">
        <Header data={data} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="میانگین درس‌ها" subtitle="از ۲۰">
          <div className="space-y-3.5">
            {data.analysis?.predictions.map((p) => {
              const name = data.analysis?.predictions ? lessonNameOf(p.lessonId) : "";
              return (
                <div key={p.lessonId}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="text-slate-300">{name}</span>
                    <span className="text-slate-400">
                      فعلی <b className="text-slate-200">{faNum(p.currentAvg, 1)}</b> → پیش‌بینی <b style={{ color: p.predictedAvg >= 10 ? COLORS.emerald : COLORS.rose }}>{faNum(p.predictedAvg, 1)}</b>
                    </span>
                  </div>
                  <ProgressBar value={(p.currentAvg / 20) * 100} tone={p.currentAvg >= 14 ? "emerald" : p.currentAvg >= 10 ? "amber" : "rose"} />
                </div>
              );
            })}
            {(!data.analysis || data.analysis.predictions.length === 0) && <p className="py-4 text-center text-[12px] text-slate-500">هنوز نمره‌ای ثبت نشده است.</p>}
          </div>
        </Card>
        <Card title="روند کل">
          <TrendLine data={data.progressSeries} height={260} />
        </Card>
      </div>
    </div>
  );
}

function lessonNameOf(id: string): string {
  return lessonOptions().find((l) => l.id === id)?.name ?? "؟";
}

function Homeworks({ data }: { data: ParentHomeData }) {
  return (
    <div>
      <div className="card-surface mb-5 p-5">
        <Header data={data} />
      </div>
      <Card title="تکالیف کلاس">
        {data.homeworks.length === 0 ? (
          <EmptyState icon={<ClipboardList size={22} />} title="تکلیفی ثبت نشده است" />
        ) : (
          <div className="space-y-2">
            {data.homeworks.map((h, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-700/40 bg-[#0b1222] px-4 py-3">
                <ClipboardList size={15} className="shrink-0 text-blue-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-slate-200">{h.title}</p>
                  <p className="text-[11px] text-slate-500">{h.lessonName} — مهلت {faDate(h.dueDate)}</p>
                </div>
                <Badge tone={h.completed ? "emerald" : "slate"}>{h.completed ? "انجام شده" : "در انتظار"}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Attendance({ data }: { data: ParentHomeData }) {
  const t = data.attendance;
  const total = t.present + t.absent + t.late;
  return (
    <div>
      <div className="card-surface mb-5 p-5">
        <Header data={data} />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <StatCard icon={<CalendarCheck size={20} />} label="حاضر" value={faNum(t.present)} tone="emerald" />
        <StatCard icon={<CalendarCheck size={20} />} label="دیررس" value={faNum(t.late)} tone="amber" />
        <StatCard icon={<CalendarCheck size={20} />} label="غایب" value={faNum(t.absent)} tone={t.absent > 2 ? "rose" : "slate"} />
      </div>
      <Card title="جمع‌بندی" className="mt-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="text-slate-400">نرخ کل حضور (شامل دیررس)</span>
            <b className="text-slate-100">{total > 0 ? pct(Math.round(((t.present + t.late) / total) * 100)) : "—"}</b>
          </div>
          <ProgressBar value={total > 0 ? ((t.present + t.late) / total) * 100 : 0} tone={total > 0 && (t.present + t.late) / total >= 0.85 ? "emerald" : "amber"} />
          <p className="text-[12px] leading-6 text-slate-400">
            {total > 0 && (t.present + t.late) / total < 0.85
              ? "نرخ حضور فرزند شما پایین‌تر از حد مطلوب است. هماهنگی با مدرسه و پیگیری دلایل غیبت توصیه می‌شود."
              : "نرخ حضور فرزند شما در محدوده مطلوب قرار دارد."}
          </p>
        </div>
      </Card>
    </div>
  );
}

function Advice({ data, plan }: { data: ParentHomeData; plan: PlanView | null }) {
  return (
    <div className="space-y-5">
      <div className="card-surface p-5">
        <Header data={data} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="بهترین زمان مطالعه" subtitle="بر اساس الگوی تمرکز">
          <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 p-4 text-[13px] leading-7 text-blue-100">{data.insights.bestStudyTime}</div>
        </Card>
        <Card title="توصیه خواب و استراحت" subtitle="بر اساس فرم سلامت روان">
          <div className="flex items-start gap-3 rounded-xl border border-violet-500/25 bg-violet-500/10 p-4">
            <Moon size={18} className="mt-1 shrink-0 text-violet-300" />
            <p className="text-[13px] leading-7 text-violet-100">{data.insights.sleepAdvice}</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="نقاط ضعف تحصیلی">
          {data.insights.weakLessons.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-emerald-300/80">درس ضعیفی شناسایی نشده است ✓</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.insights.weakLessons.map((w) => (
                <Badge key={w} tone="rose">{w}</Badge>
              ))}
            </div>
          )}
        </Card>
        <Card title="فعالیت‌های پیشنهادی برای خانواده">
          <ul className="space-y-2">
            {data.insights.activities.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] leading-6 text-slate-300">
                <MessageSquareHeart size={14} className="mt-1 shrink-0 text-emerald-400" />
                {a}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="برنامه مطالعاتی هفتگی فرزند شما" subtitle="تولیدشده توسط موتور برنامه‌ریز هوشمند">
        <StudyPlanGrid plan={plan} />
      </Card>
    </div>
  );
}
