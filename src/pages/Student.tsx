import { Award, Brain, BookOpen, CalendarCheck, ClipboardList, Home, Lightbulb, Lock, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { lessonOptions, submitHomework, submitWellness, studentHome, type StudentHomeData } from "../lib/api";
import { useSession } from "../lib/session";
import type { WellnessAnswers } from "../lib/types";
import { faDate, faNum, pct, weekKey } from "../lib/format";
import { AppShell, type NavItem } from "../components/layout";
import { Badge, Button, Card, EmptyState, PageHeader, ProgressBar, RiskBadge, SkeletonGrid, StatCard, notify } from "../components/ui";
import { PlanView, StudyPlanGrid, TrendLine, COLORS } from "./shared";

const NAV: NavItem[] = [
  { key: "overview", label: "نمای کلی", icon: Home },
  { key: "grades", label: "نمرات و پیش‌بینی", icon: BookOpen },
  { key: "homeworks", label: "تکالیف", icon: ClipboardList },
  { key: "plan", label: "برنامه مطالعاتی", icon: Sparkles },
  { key: "wellness", label: "فرم سلامت روان", icon: Brain },
  { key: "achievements", label: "دستاوردها", icon: Award },
];

export default function StudentDashboard({ section }: { section: string }) {
  const { session, logout } = useSession();
  const navigate = useNavigate();
  const [data, setData] = useState<StudentHomeData | null>(null);
  const known = NAV.some((n) => n.key === section);
  const activeSection = known ? section : "overview";

  const reload = () => {
    if (session) studentHome(session.sub).then(setData);
  };
  useEffect(reload, [session]);

  const lessons = lessonOptions();
  const planView: PlanView | null = data?.plan ? { days: data.plan.days, totalWeeklyMinutes: data.plan.totalWeeklyMinutes, lessons } : null;

  return (
    <AppShell role="student" userName={session?.name ?? "دانش‌آموز"} nav={NAV} section={activeSection} onNavigate={(k) => navigate(`/dashboard/${k}`)} onLogout={() => { logout(); navigate("/login"); }}>
      {!data ? (
        <SkeletonGrid rows={5} />
      ) : (
        <>
          {activeSection === "overview" && <Overview data={data} />}
          {activeSection === "grades" && <Grades data={data} />}
          {activeSection === "homeworks" && <Homeworks data={data} onDone={reload} />}
          {activeSection === "plan" && <Plan data={data} plan={planView} />}
          {activeSection === "wellness" && <Wellness data={data} onDone={reload} />}
          {activeSection === "achievements" && <Achievements data={data} />}
        </>
      )}
    </AppShell>
  );
}

function Overview({ data }: { data: StudentHomeData }) {
  const a = data.analysis;
  return (
    <div className="space-y-5">
      <div className="card-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-bold text-white">
            {data.me.fullName.slice(0, 1)}
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-50">سلام {data.me.fullName}</h1>
            <p className="text-[12px] text-slate-400">{data.classLabel}</p>
          </div>
          {a && <span className="mr-auto"><RiskBadge score={a.riskScore} /></span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={<BookOpen size={20} />} label="میانگین من" value={a ? `${faNum(a.overallAvg, 1)}/${faNum(20)}` : "—"} sub={a ? `پیش‌بینی ترم: ${faNum(a.predictedSemesterAvg, 1)}` : ""} tone={a && a.overallAvg >= 12 ? "emerald" : "amber"} />
        <StatCard icon={<TrendingUp size={20} />} label="روند یادگیری" value={a ? `${a.learningSpeed >= 0 ? "+" : ""}${faNum(a.learningSpeed, 1)}` : "—"} sub="نمره در هر آزمون" tone={a && a.learningSpeed >= 0 ? "emerald" : "rose"} />
        <StatCard icon={<CalendarCheck size={20} />} label="حضور" value={a ? pct(Math.round(a.attendanceRate)) : "—"} tone="cyan" />
        <StatCard icon={<ClipboardList size={20} />} label="تکالیف" value={a ? pct(Math.round(a.homeworkRate)) : "—"} tone="violet" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="روند نمرات من" className="lg:col-span-2">
          <TrendLine data={data.progressSeries} />
        </Card>
        <Card title="توصیه‌های هوشمند من">
          <ul className="space-y-2.5">
            {a?.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-[12.5px] leading-6 text-slate-300">
                <Lightbulb size={14} className="mt-1 shrink-0 text-amber-400" />
                {r}
              </li>
            ))}
            {!a && <p className="text-[12px] text-slate-500">پس از ثبت نمرات، توصیه‌ها اینجا نمایش داده می‌شوند.</p>}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Grades({ data }: { data: StudentHomeData }) {
  return (
    <div className="space-y-5">
      <PageHeader title="نمرات و پیش‌بینی" subtitle="موتور پیش‌بینی، نمره آزمون بعدی و احتمال قبولی هر درس را برآورد می‌کند" />
      <div className="card-surface overflow-x-auto">
        <table className="w-full min-w-[700px] text-right">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] text-slate-500">
              <th className="px-4 py-3 font-medium">درس</th>
              <th className="px-4 py-3 font-medium">اهمیت</th>
              <th className="px-4 py-3 font-medium">میانگین فعلی</th>
              <th className="px-4 py-3 font-medium">پیش‌بینی آزمون بعد</th>
              <th className="px-4 py-3 font-medium">احتمال قبولی</th>
              <th className="px-4 py-3 font-medium">احتمال افت</th>
            </tr>
          </thead>
          <tbody>
            {data.subjectAverages.map((s) => {
              const pass = s.passProbability;
              const decline = s.declineProbability;
              return (
                <tr key={s.name} className="border-b border-slate-800/50 text-[13px]">
                  <td className="px-4 py-3 font-medium text-slate-200">{s.name}</td>
                  <td className="px-4 py-3"><Badge tone="blue">{faNum(s.importance)}/۱۰</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24"><ProgressBar value={(s.avg / 20) * 100} tone={s.avg >= 14 ? "emerald" : s.avg >= 10 ? "amber" : "rose"} /></div>
                      <span className="text-slate-300">{faNum(s.avg, 1)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold" style={{ color: (s.predicted || 0) >= 10 ? COLORS.emerald : COLORS.rose }}>
                    {s.predicted > 0 ? faNum(s.predicted, 1) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{pass ? pct(Math.round(pass)) : "—"}</td>
                  <td className="px-4 py-3" style={{ color: (decline ?? 0) > 40 ? COLORS.rose : COLORS.slate }}>{decline ? pct(Math.round(decline)) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data.subjectAverages.length === 0 && <p className="px-4 py-8 text-center text-[12px] text-slate-500">داده‌ای موجود نیست.</p>}
      </div>

      <Card title="هدایت تحصیلی هوشمند" subtitle="بر اساس پروفایل درسی و علایق شما">
        <div className="space-y-3">
          {data.guidance.tracks.map((t, i) => (
            <div key={t.name}>
              <div className="mb-1 flex items-center justify-between text-[12.5px]">
                <span className={i === 0 ? "font-bold text-blue-300" : "text-slate-300"}>{i === 0 && "★ "}{t.name}</span>
                <span className="text-slate-400">{faNum(t.match)}٪ تطابق</span>
              </div>
              <ProgressBar value={t.match} tone={i === 0 ? "blue" : "slate"} />
              <p className="mt-1 text-[11px] text-slate-500">{t.why}</p>
            </div>
          ))}
          {data.guidance.tracks.length === 0 && <p className="text-[12px] text-slate-500">داده کافی برای پیشنهاد رشته وجود ندارد.</p>}
        </div>
      </Card>
    </div>
  );
}

function Homeworks({ data, onDone }: { data: StudentHomeData; onDone: () => void }) {
  return (
    <div>
      <PageHeader title="تکالیف من" subtitle="با تکمیل تکالیف، امتیاز ریسک شما بهبود می‌یابد" />
      {data.homeworks.length === 0 ? (
        <EmptyState icon={<ClipboardList size={22} />} title="تکلیفی ثبت نشده است" />
      ) : (
        <div className="space-y-3">
          {data.homeworks.map((h) => (
            <div key={h.id} className="card-surface flex flex-wrap items-center gap-3 p-4">
              <ClipboardList size={16} className="shrink-0 text-blue-400" />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-slate-200">{h.title}</p>
                <p className="text-[11px] text-slate-500">{h.lessonName} — مهلت {faDate(h.dueDate)}</p>
              </div>
              {h.completed ? (
                <Badge tone="emerald">انجام شد ✓</Badge>
              ) : (
                <Button
                  className="px-3.5 py-1.5 text-[12px]"
                  onClick={() => {
                    submitHomework(data.me.id, h.id);
                    notify.success("تکلیف به‌عنوان انجام‌شده ثبت شد");
                    onDone();
                  }}
                >
                  ثبت انجام
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Plan({ data, plan }: { data: StudentHomeData; plan: PlanView | null }) {
  return (
    <div>
      <PageHeader title="برنامه مطالعاتی هوشمند من" subtitle="بر اساس نقاط ضعف، اهمیت دروس و روند یادگیری شما تولید شده — هر هفته به‌روزرسانی می‌شود" />
      <Card>
        <StudyPlanGrid plan={plan} />
        {data.analysis && (
          <div className="mt-5 border-t border-slate-800/60 pt-4">
            <p className="mb-3 text-[13px] font-semibold text-slate-200">اهداف ماهانه</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.plan?.monthlyGoals.map((g) => (
                <div key={g.lessonId} className="rounded-xl border border-slate-700/40 bg-[#0b1222] px-3.5 py-3">
                  <p className="text-[12.5px] text-slate-300">{lessonOptions().find((l) => l.id === g.lessonId)?.name ?? "؟"}</p>
                  <p className="mt-1 text-[11.5px] text-slate-500">
                    از <b className="text-slate-200">{faNum(g.currentAvg, 1)}</b> به <b className="text-emerald-300">{faNum(g.targetAvg, 1)}</b>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ================= wellness form ================= */

const QUESTIONS: { key: keyof WellnessAnswers; text: string; lo: string; hi: string }[] = [
  { key: "mood", text: "حال روحی من این هفته چگونه است؟", lo: "خیلی بد", hi: "خیلی خوب" },
  { key: "stress", text: "میزان استرس و خستگی من چقدر است؟", lo: "خیلی کم", hi: "خیلی زیاد" },
  { key: "sleep", text: "کیفیت خواب من چگونه بوده؟", lo: "بد", hi: "عالی" },
  { key: "motivation", text: "انگیزه مطالعه‌ام در چه حدی است؟", lo: "اصلاً", hi: "بسیار زیاد" },
  { key: "social", text: "روابطم با دوستان و همکلاسی‌ها چطور است؟", lo: "ضعیف", hi: "خوشایند" },
  { key: "pressure", text: "فشار تحصیلی و آزمون‌ها روی من چقدر سنگین است؟", lo: "خیلی کم", hi: "خیلی زیاد" },
  { key: "focus", text: "تمرکزم در کلاس چگونه بوده؟", lo: "ضعیف", hi: "قوی" },
  { key: "family", text: "جو خانه و رابطه‌ام با خانواده چگونه است؟", lo: "استرس‌زا", hi: "آرامش‌بخش" },
];

function Wellness({ data, onDone }: { data: StudentHomeData; onDone: () => void }) {
  const [answers, setAnswers] = useState<WellnessAnswers>({ mood: 3, stress: 3, sleep: 3, motivation: 3, social: 3, pressure: 3, focus: 3, family: 3 });
  const [busy, setBusy] = useState(false);
  const currentWeek = weekKey();
  const submittedThisWeek = data.wellnessLast?.week === currentWeek;

  return (
    <div>
      <PageHeader
        title="فرم سلامت روان هفتگی"
        subtitle={submittedThisWeek ? `این هفته ثبت شده (${faDate(data.wellnessLast!.at)}) — می‌توانید پاسخ‌ها را به‌روزرسانی کنید` : "با تکمیل ۸ سؤال کوتاه، تحلیل هوشمند سلامت روان شما به‌روز می‌شود"}
      />
      {data.wellnessPending && !submittedThisWeek && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <Brain size={18} className="shrink-0 text-amber-400" />
          <p className="text-[12.5px] leading-6 text-amber-100">فرم این هفته را تکمیل نکرده‌اید. مشاور و والدین شما از وضعیت شما باخبر خواهند شد.</p>
        </div>
      )}
      <Card>
        <div className="space-y-6">
          {QUESTIONS.map((q, i) => (
            <div key={q.key}>
              <p className="mb-2 text-[13px] font-medium text-slate-200">{faNum(i + 1)}. {q.text}</p>
              <div className="flex items-center gap-2">
                <span className="w-20 text-[11px] text-slate-500">{q.lo}</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      onClick={() => setAnswers((a) => ({ ...a, [q.key]: v }))}
                      className={`h-9 w-9 rounded-lg border text-[12px] font-bold transition cursor-pointer ${
                        answers[q.key] >= v ? "border-blue-500/60 bg-blue-600/30 text-blue-200" : "border-slate-700/60 bg-white/[0.02] text-slate-500 hover:bg-white/5"
                      }`}
                    >
                      {faNum(v)}
                    </button>
                  ))}
                </div>
                <span className="w-20 text-[11px] text-slate-500">{q.hi}</span>
              </div>
            </div>
          ))}
          <Button
            loading={busy}
            className="w-full py-3"
            onClick={() => {
              setBusy(true);
              setTimeout(() => {
                submitWellness(data.me.id, answers);
                setBusy(false);
                notify.success("فرم ثبت شد — تحلیل سلامت روان به‌روزرسانی شد");
                onDone();
              }, 350);
            }}
          >
            <Brain size={15} /> ثبت پاسخ‌ها و دریافت تحلیل
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ================= achievements ================= */

function Achievements({ data }: { data: StudentHomeData }) {
  return (
    <div>
      <PageHeader title="دستاوردها" subtitle={`${faNum(data.achievements.filter((a) => a.unlocked).length)} از ${faNum(data.achievements.length)} باز شده`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.achievements.map((a) => (
          <div
            key={a.id}
            className={`card-surface relative overflow-hidden p-5 ${a.unlocked ? "" : "opacity-50"}`}
          >
            {a.unlocked && <div className="absolute -left-6 -top-6 h-20 w-20 rounded-full bg-blue-500/15 blur-xl" />}
            <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${a.unlocked ? "bg-blue-500/15 text-blue-300" : "bg-slate-700/40 text-slate-500"}`}>
              {a.unlocked ? <Award size={20} /> : <Lock size={18} />}
            </div>
            <p className="text-[14px] font-semibold text-slate-100">{a.label}</p>
            <p className="mt-1 text-[11.5px] text-slate-500">{a.desc}</p>
            {a.unlocked && <Badge tone="emerald" className="mt-3">باز شده</Badge>}
          </div>
        ))}
      </div>
    </div>
  );
}
