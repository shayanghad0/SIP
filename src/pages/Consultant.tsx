import { Brain, HeartPulse, LayoutDashboard, Lightbulb, MessageSquareHeart, UserCog } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addConsultantNote, consultantHome, timeline, type ConsultantHomeData } from "../lib/api";
import { useSession } from "../lib/session";
import { allStudents } from "../lib/api";
import { faDate, faNum } from "../lib/format";
import { AppShell, type NavItem } from "../components/layout";
import { Badge, Button, Card, EmptyState, Field, PageHeader, ProgressBar, RiskBar, Select, SkeletonGrid, StatCard, Textarea, riskTone } from "../components/ui";
import { StudentReportModal, riskLevelLabel } from "./shared";

const NAV: NavItem[] = [
  { key: "overview", label: "نمای کلی", icon: LayoutDashboard },
  { key: "forms", label: "فرم‌های سلامت روان", icon: Brain },
  { key: "risk", label: "دانش‌آموزان پرخطر", icon: HeartPulse },
  { key: "timeline", label: "تایم‌لاین و یادداشت", icon: MessageSquareHeart },
];

export default function ConsultantDashboard({ section }: { section: string }) {
  const { session, logout } = useSession();
  const navigate = useNavigate();
  const [data, setData] = useState<ConsultantHomeData | null>(null);
  const [reportFor, setReportFor] = useState<string | null>(null);
  const known = NAV.some((n) => n.key === section);
  const activeSection = known ? section : "overview";

  const reload = useCallback(() => {
    consultantHome().then(setData);
  }, []);
  useEffect(reload, [reload]);

  return (
    <AppShell role="consultant" userName={session?.name ?? "مشاور"} nav={NAV} section={activeSection} onNavigate={(k) => navigate(`/dashboard/${k}`)} onLogout={() => { logout(); navigate("/login"); }}>
      {!data ? (
        <SkeletonGrid rows={5} />
      ) : (
        <>
          {activeSection === "overview" && <Overview data={data} onOpenReport={setReportFor} />}
          {activeSection === "risk" && <RiskStudents data={data} onOpenReport={setReportFor} />}
          {activeSection === "forms" && <Forms data={data} />}
          {activeSection === "timeline" && <Timeline onSaved={reload} />}
        </>
      )}
      <StudentReportModal studentId={reportFor} onClose={() => setReportFor(null)} />
    </AppShell>
  );
}

function Overview({ data, onOpenReport }: { data: ConsultantHomeData; onOpenReport: (id: string) => void }) {
  const critical = data.riskStudents.filter((r) => r.level === "critical").length;
  return (
    <div className="space-y-5">
      <PageHeader title="پایش سلامت روان و ریسک" subtitle="خروجی موتور تحلیل سلامت روان + هشدار زودهنگام" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={<HeartPulse size={20} />} label="دانش‌آموزان بحرانی" value={faNum(critical)} tone={critical > 0 ? "rose" : "emerald"} />
        <StatCard icon={<HeartPulse size={20} />} label="در آستانه خطر (۵۰+)" value={faNum(data.riskStudents.filter((r) => r.risk >= 50).length)} tone="amber" />
        <StatCard icon={<Brain size={20} />} label="فرم‌های ثبت‌شده" value={faNum(data.recentForms.length)} tone="cyan" />
        <StatCard icon={<Lightbulb size={20} />} label="پیشنهاد فعال" value={faNum(data.suggestions.length)} tone="violet" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="دانش‌آموزان برتر لیست ریسک">
          <div className="space-y-3">
            {data.riskStudents.slice(0, 6).map((s) => (
              <button key={s.id} onClick={() => onOpenReport(s.id)} className="w-full rounded-xl border border-slate-700/50 bg-[#0b1222] p-3 text-right transition hover:border-blue-500/40 cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-slate-200">{s.name}</span>
                  <RiskBar score={s.risk} />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {s.classLabel} — استرس {faNum(s.stress)}٪ — حضور {faNum(s.attendance)}٪
                </p>
              </button>
            ))}
          </div>
        </Card>

        <Card title="پیشنهادهای هوشمند سیستم" subtitle="تولیدشده بر اساس تحلیل چندعاملی">
          <div className="space-y-3">
            {data.suggestions.length === 0 && <p className="py-4 text-center text-[12px] text-slate-500">پیشنهادهای فعالی وجود ندارد.</p>}
            {data.suggestions.map((s) => (
              <div key={s.studentId} className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-violet-200">{s.name}</span>
                  <Badge tone={riskTone(s.severity === "critical" ? 80 : 55)}>{riskLevelLabel(s.severity)}</Badge>
                </div>
                <p className="mt-1.5 text-[11.5px] leading-5 text-slate-300">{s.text}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="آخرین هشدارهای سیستم">
          <div className="space-y-2.5">
            {data.alerts.length === 0 && <p className="py-4 text-center text-[12px] text-slate-500">هشدار فعالی وجود ندارد.</p>}
            {data.alerts.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-700/50 bg-[#0b1222] p-3">
                <p className="text-[12px] font-medium text-slate-200">
                  {a.studentName} — {a.title}
                </p>
                <p className="mt-0.5 text-[11px] leading-5 text-slate-400">{a.message}</p>
                <p className="mt-1 text-[10px] text-slate-600">{faDate(a.date)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function RiskStudents({ data, onOpenReport }: { data: ConsultantHomeData; onOpenReport: (id: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div>
      <PageHeader title="دانش‌آموزان پرخطر" subtitle="لیست کامل با دلایل و عوامل ریسک — کلیک برای تحلیل کامل" />
      <div className="space-y-3">
        {data.riskStudents.length === 0 && <EmptyState icon={<HeartPulse size={22} />} title="دانش‌آموز پرخطری وجود ندارد" />}
        {data.riskStudents.map((s) => (
          <div key={s.id} className="card-surface p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[14px] font-semibold text-slate-100">{s.name}</span>
              <Badge tone="slate">{s.classLabel}</Badge>
              <Badge tone={riskTone(s.risk)}>{riskLevelLabel(s.level)}</Badge>
              <RiskBar score={s.risk} />
              <div className="mr-auto flex gap-2">
                <Button variant="ghost" className="px-3 py-1.5 text-[12px]" onClick={() => setOpen(open === s.id ? null : s.id)}>
                  {open === s.id ? "بستن جزئیات" : "جزئیات ریسک"}
                </Button>
                <Button variant="outline" className="px-3 py-1.5 text-[12px]" onClick={() => onOpenReport(s.id)}>
                  گزارش کامل
                </Button>
              </div>
            </div>
            {open === s.id && (
              <div className="mt-4 grid gap-4 border-t border-slate-800/60 pt-4 md:grid-cols-2 anim-fade-in">
                <div>
                  <p className="mb-2 text-[12px] font-semibold text-slate-300">عوامل موثر</p>
                  <RiskFactorsMini reasons={s.reasons} />
                </div>
                <div>
                  <p className="mb-2 text-[12px] font-semibold text-slate-300">توصیه‌های سیستم</p>
                  <ul className="space-y-1.5">
                    {s.recommendations.map((r, i) => (
                      <li key={i} className="text-[12px] leading-6 text-slate-300">• {r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskFactorsMini({ reasons }: { reasons: string[] }) {
  return (
    <ul className="space-y-1.5">
      {reasons.length === 0 && <li className="text-[12px] text-slate-500">دلایل برجسته‌ای ثبت نشده است.</li>}
      {reasons.map((r, i) => (
        <li key={i} className="text-[12px] leading-6 text-slate-300">• {r}</li>
      ))}
    </ul>
  );
}

function Forms({ data }: { data: ConsultantHomeData }) {
  return (
    <div>
      <PageHeader title="فرم‌های سلامت روان هفتگی" subtitle="شاخص‌های استخراج‌شده از فرم ۸ سؤالی دانش‌آموزان" />
      {data.recentForms.length === 0 ? (
        <EmptyState icon={<Brain size={22} />} title="فرمی ثبت نشده است" desc="دانش‌آموزان هر هفته از داشبورد خود فرم سلامت روان را تکمیل می‌کنند." />
      ) : (
        <div className="card-surface overflow-x-auto">
          <table className="w-full min-w-[640px] text-right">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-500">
                <th className="px-4 py-3 font-medium">دانش‌آموز</th>
                <th className="px-4 py-3 font-medium">هفته</th>
                <th className="px-4 py-3 font-medium">استرس</th>
                <th className="px-4 py-3 font-medium">انگیزه</th>
                <th className="px-4 py-3 font-medium">حال (از ۵)</th>
                <th className="px-4 py-3 font-medium">زمان</th>
              </tr>
            </thead>
            <tbody>
              {data.recentForms.map((f, i) => (
                <tr key={i} className="border-b border-slate-800/50 text-[13px]">
                  <td className="px-4 py-3 font-medium text-slate-200">{f.name}</td>
                  <td className="px-4 py-3" dir="ltr">{f.week}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20"><ProgressBar value={f.stress} tone={f.stress >= 60 ? "rose" : f.stress >= 40 ? "amber" : "emerald"} /></div>
                      <span className="text-[11px] text-slate-400">{faNum(f.stress)}٪</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20"><ProgressBar value={f.motivation} tone={f.motivation >= 60 ? "emerald" : "amber"} /></div>
                      <span className="text-[11px] text-slate-400">{faNum(f.motivation)}٪</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{faNum(f.mood)}/۵</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{faDate(f.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Timeline({ onSaved }: { onSaved: () => void }) {
  const me = useSession().session;
  const students = allStudents();
  const [studentId, setStudentId] = useState("");
  const [text, setText] = useState("");
  const [events, setEvents] = useState<{ id: string; at: string; icon: string; title: string; desc: string }[] | null>(null);

  useEffect(() => {
    if (!studentId) {
      setEvents(null);
      return;
    }
    timeline(studentId).then((t) => setEvents(t.events));
  }, [studentId]);

  return (
    <div>
      <PageHeader title="تایم‌لاین دانش‌آموز" subtitle="تمام رویدادها در یک خط زمانی — یادداشت مشاوره و خانواده" />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="ثبت یادداشت مشاوره">
          <div className="space-y-3">
            <Field label="دانش‌آموز">
              <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">انتخاب…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </Select>
            </Field>
            <Field label="متن یادداشت">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="نتیجه جلسه، توصیه‌ها، وضعیت مشاهده‌شده…" />
            </Field>
            <Button
              className="w-full"
              onClick={() => {
                if (!studentId || !text.trim()) return;
                addConsultantNote(studentId, text.trim(), me?.name ?? "مشاور");
                setText("");
                setEvents(null);
                onSaved();
              }}
            >
              <MessageSquareHeart size={15} /> ثبت یادداشت
            </Button>
          </div>
        </Card>

        <Card title="خط زمانی" subtitle={studentId ? "رویدادها (جدیدترین اول)" : "دانش‌آموزی انتخاب کنید"} className="lg:col-span-2">
          {!studentId ? (
            <EmptyState icon={<UserCog size={22} />} title="دانش‌آموزی انتخاب نشده است" />
          ) : !events ? (
            <p className="py-6 text-center text-[12px] text-slate-500">در حال بارگذاری…</p>
          ) : events.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-slate-500">رویدادی ثبت نشده است.</p>
          ) : (
            <div className="relative space-y-4 before:absolute before:inset-y-1 before:right-[13px] before:w-px before:bg-slate-700/60">
              {events.map((e) => (
                <div key={e.id} className="relative flex gap-3.5">
                  <div className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-[#0d1526] text-[11px]">
                    {e.icon === "alert" ? "!" : e.icon === "heart" ? "♥" : e.icon === "note" ? "✎" : e.icon === "plus" ? "✓" : "−"}
                  </div>
                  <div className="min-w-0 flex-1 rounded-xl border border-slate-700/40 bg-[#0b1222] px-3.5 py-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[12.5px] font-medium text-slate-200">{e.title}</p>
                      <span className="text-[10px] text-slate-500">{faDate(e.at)}</span>
                    </div>
                    <p className="mt-0.5 text-[11.5px] leading-5 text-slate-400">{e.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
