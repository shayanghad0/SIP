import { AlertTriangle, Brain, CheckCircle2, Circle, Clock, FileText, Heart, Minus, Target, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { studentReport, type ReportData } from "../lib/api";
import { faDate, faNum, PERSIAN_WEEKDAYS } from "../lib/format";
import { Badge, Card, EmptyState, Modal, ProgressBar, RISK_LABELS, RiskBadge, riskTone, Skeleton, type Tone } from "../components/ui";

export const COLORS = {
  blue: "#3b82f6",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  violet: "#8b5cf6",
  cyan: "#06b6d4",
  orange: "#f97316",
  slate: "#64748b",
} as const;

const RISK_COLOR: Record<string, string> = { low: COLORS.emerald, medium: COLORS.amber, high: COLORS.orange, critical: COLORS.rose };

const TOOLTIP_STYLE = {
  background: "#0d1526",
  border: "1px solid rgba(148,163,184,0.2)",
  borderRadius: 12,
  fontFamily: "Vazirmatn",
  fontSize: 12,
  direction: "rtl" as const,
};

export function TrendLine({ data, name = "میانگین", color = COLORS.blue, height = 230, unit = "", domain = [0, 20] as [number, number] }: { data: { label: string; avg: number }[]; name?: string; color?: string; height?: number; unit?: string; domain?: [number, number] }) {
  if (data.length === 0) return <EmptyState icon={<TrendingUp size={22} />} title="داده‌ای برای نمایش نیست" desc="با ثبت آزمون‌ها، نمودار روند اینجا نمایش داده می‌شود." />;
  return (
    <div className="chart-ltr" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
          <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11, fontFamily: "Vazirmatn" }} axisLine={false} tickLine={false} />
          <YAxis domain={domain} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${faNum(Number(v), 1)}${unit}`, name]} />
          <Line type="monotone" dataKey="avg" name={name} stroke={color} strokeWidth={2.5} dot={{ r: 3.5, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Bars({ data, name = "مقدار", color = COLORS.blue, height = 230, vertical = false }: { data: { name: string; value: number }[]; name?: string; color?: string; height?: number; vertical?: boolean }) {
  if (data.length === 0) return <EmptyState icon={<TrendingUp size={22} />} title="داده‌ای برای نمایش نیست" />;
  return (
    <div className="chart-ltr" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={vertical ? "vertical" : "horizontal"} margin={{ top: 10, right: 10, left: vertical ? 30 : -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={!vertical} vertical={vertical} />
          {vertical ? (
            <>
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "Vazirmatn" }} axisLine={false} tickLine={false} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11, fontFamily: "Vazirmatn" }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            </>
          )}
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [faNum(Number(v), 1), name]} cursor={{ fill: "rgba(148,163,184,0.06)" }} />
          <Bar dataKey="value" name={name} radius={[6, 6, 0, 0]} maxBarSize={42}>
            {data.map((_, i) => (
              <Cell key={i} fill={color} fillOpacity={0.55 + 0.45 * (1 - i / Math.max(data.length, 1) * 0.6)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({ data, height = 230 }: { data: { name: string; value: number; color: string }[]; height?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <EmptyState icon={<TrendingUp size={22} />} title="داده‌ای برای نمایش نیست" />;
  return (
    <div className="flex items-center gap-4">
      <div className="chart-ltr flex-1" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={3} strokeWidth={0}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [faNum(Number(v)), "تعداد"]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-[12px]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-slate-300">{d.name}</span>
            <span className="font-semibold text-slate-100">{faNum(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= risk factors ================= */

export function RiskFactors({ factors }: { factors: { key: string; label: string; weight: number; score: number }[] }) {
  return (
    <div className="space-y-3">
      {factors.map((f) => {
        const tone: Tone = f.score < 25 ? "emerald" : f.score < 50 ? "amber" : f.score < 75 ? "orange" : "rose";
        return (
          <div key={f.key}>
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span className="text-slate-300">
                {f.label} <span className="text-slate-500">— وزن {faNum(f.weight)}٪</span>
              </span>
              <span className="font-semibold" style={{ color: f.score < 25 ? COLORS.emerald : f.score < 50 ? COLORS.amber : f.score < 75 ? COLORS.orange : COLORS.rose }}>
                {faNum(f.score)}٪
              </span>
            </div>
            <ProgressBar value={f.score} tone={tone} />
          </div>
        );
      })}
    </div>
  );
}

/* ================= study plan grid ================= */

export interface PlanView {
  days: { day: string; blocks: { lessonId: string; minutes: number; kind: string }[] }[];
  totalWeeklyMinutes: number;
  lessons: { id: string; name: string }[];
}

export function StudyPlanGrid({ plan }: { plan: PlanView | null }) {
  if (!plan) return <EmptyState icon={<Clock size={22} />} title="برنامه مطالعاتی موجود نیست" desc="پس از ثبت نمرات، برنامه به‌صورت خودکار تولید می‌شود." />;
  const lessonName = (id: string) => plan.lessons.find((l) => l.id === id)?.name ?? "؟";
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {plan.days.map((d) => (
          <div key={d.day} className="rounded-xl border border-slate-700/50 bg-[#0b1222] p-3">
            <p className="mb-2 text-center text-[12px] font-bold text-blue-300">{d.day}</p>
            <div className="space-y-1.5">
              {d.blocks.length === 0 && <p className="py-2 text-center text-[11px] text-slate-600">استراحت</p>}
              {d.blocks.map((b, i) => (
                <div key={i} className="rounded-lg bg-blue-500/10 px-2.5 py-1.5 text-[11px] leading-5">
                  <span className="font-medium text-slate-200">{lessonName(b.lessonId)}</span>
                  <span className="mt-0.5 flex items-center justify-between text-slate-400">
                    <span>{b.kind === "test" ? "تست و تمرین" : b.kind === "review" ? "مرور" : "مطالعه"}</span>
                    <span>{faNum(b.minutes)} دقیقه</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-slate-500">
        مجموع هفتگی: <b className="text-slate-300">{faNum(Math.round(plan.totalWeeklyMinutes / 60))} ساعت و {faNum(plan.totalWeeklyMinutes % 60)} دقیقه</b>
      </p>
    </div>
  );
}

/* ================= timeline icons ================= */

function TimelineIcon({ icon }: { icon: string }) {
  const cls = "text-slate-400";
  if (icon === "alert") return <AlertTriangle size={13} className="text-rose-400" />;
  if (icon === "note") return <FileText size={13} className={cls} />;
  if (icon === "heart") return <Heart size={13} className="text-pink-400" />;
  if (icon === "plus") return <PlusBadge />;
  if (icon === "minus") return <Minus size={13} className="text-amber-400" />;
  return <Circle size={13} className={cls} />;
}

function PlusBadge() {
  return <Target size={13} className="text-emerald-400" />;
}

/* ================= student report modal ================= */

export function StudentReportModal({ studentId, onClose }: { studentId: string | null; onClose: () => void }) {
  const [data, setData] = useState<ReportData | null>(null);

  useEffect(() => {
    let live = true;
    if (!studentId) {
      setData(null);
      return;
    }
    setData(null);
    studentReport(studentId).then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [studentId]);

  const a = data?.analysis;
  return (
    <Modal open={!!studentId} onClose={onClose} title={data ? `گزارش هوشمند — ${data.student.fullName}` : "گزارش هوشمند"} wide>
      {!data && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-40" />
          <Skeleton className="h-24" />
        </div>
      )}
      {data && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <RiskBadge score={a?.riskScore ?? 0} />
            <Badge tone="slate">{data.classLabel}</Badge>
            {a && <Badge tone="blue">میانگین {faNum(a.overallAvg, 1)} از {faNum(20)}</Badge>}
            {a && <Badge tone="cyan">حضور {faNum(Math.round(a.attendanceRate))}٪</Badge>}
            {a && <Badge tone="violet">تکالیف {faNum(Math.round(a.homeworkRate))}٪</Badge>}
            {a && <span className="text-[11px] text-slate-500">به‌روزرسانی: {faDate(a.updatedAt, true)}</span>}
          </div>

          {!a && <EmptyState icon={<Brain size={22} />} title="تحلیلی ثبت نشده" desc="پس از ذخیره داده‌های تحصیلی، موتور هوش مصنوعی گزارش را تولید می‌کند." />}

          {a && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Card title="تحلیل عوامل ریسک" subtitle="محاسبه‌شده توسط موتور هشدار زودهنگام">
                  <RiskFactors factors={a.factors} />
                </Card>
                <div className="space-y-4">
                  <Card title="دلایل شناسایی‌شده">
                    <ul className="space-y-2">
                      {a.reasons.length === 0 && <li className="text-[12px] text-slate-500">مشکل خاصی شناسایی نشده است.</li>}
                      {a.reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12.5px] leading-6 text-slate-300">
                          <AlertTriangle size={13} className="mt-1.5 shrink-0 text-amber-400" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </Card>
                  <Card title="توصیه‌های هوشمند">
                    <ul className="space-y-2">
                      {a.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12.5px] leading-6 text-slate-300">
                          <CheckCircle2 size={13} className="mt-1.5 shrink-0 text-emerald-400" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <MiniStat label="پیش‌بینی میانگین ترم" value={`${faNum(a.predictedSemesterAvg, 1)} / ${faNum(20)}`} icon={<Target size={15} />} />
                <MiniStat label="احتمال ترک / افت شدید" value={`${faNum(Math.round(a.dropoutProbability))}٪`} icon={<TrendingDown size={15} />} tone={a.dropoutProbability > 50 ? "rose" : "emerald"} />
                <MiniStat label="سرعت یادگیری" value={`${a.learningSpeed >= 0 ? "+" : ""}${faNum(a.learningSpeed, 2)} نمره/آزمون`} icon={a.learningSpeed >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />} tone={a.learningSpeed >= 0 ? "emerald" : "rose"} />
                <MiniStat label="درصد اطمینان مدل" value={`${faNum(Math.round(a.confidence))}٪`} icon={<Brain size={15} />} tone="blue" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card title="روند نمرات" subtitle="میانگین هر آزمون">
                  <TrendLine data={data.progressSeries} height={200} />
                </Card>
                <Card title="نمرات و پیش‌بینی درس‌ها">
                  <div className="space-y-3">
                    {data.subjectAverages.map((s) => (
                      <div key={s.name}>
                        <div className="mb-1 flex items-center justify-between text-[12px]">
                          <span className="text-slate-300">
                            {s.name} <span className="text-slate-600">(اهمیت {faNum(s.importance)})</span>
                          </span>
                          <span className="text-slate-400">
                            فعلی <b className="text-slate-200">{faNum(s.avg, 1)}</b> → پیش‌بینی <b style={{ color: s.predicted >= 10 ? COLORS.emerald : COLORS.rose }}>{faNum(s.predicted, 1)}</b>
                          </span>
                        </div>
                        <ProgressBar value={(s.avg / 20) * 100} tone={s.avg >= 15 ? "emerald" : s.avg >= 10 ? "amber" : "rose"} />
                      </div>
                    ))}
                    {data.subjectAverages.every((s) => s.avg === 0) && <p className="text-[12px] text-slate-500">هنوز نمره‌ای ثبت نشده است.</p>}
                  </div>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card title="هدایت تحصیلی هوشمند" subtitle="پیشنهاد رشته بر اساس پروفایل درسی">
                  {data.guidance.tracks.length === 0 ? (
                    <p className="text-[12px] text-slate-500">داده کافی نیست.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.guidance.tracks.slice(0, 3).map((t, i) => (
                        <div key={t.name}>
                          <div className="mb-1 flex items-center justify-between text-[12px]">
                            <span className={i === 0 ? "font-bold text-blue-300" : "text-slate-300"}>
                              {i === 0 && "★ "}
                              {t.name}
                            </span>
                            <span className="text-slate-400">{faNum(t.match)}٪ تطابق</span>
                          </div>
                          <ProgressBar value={t.match} tone={i === 0 ? "blue" : "slate"} />
                          <p className="mt-1 text-[11px] text-slate-500">{t.why}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
                <Card title="تایم‌لاین" subtitle="آخرین رویدادها">
                  <div className="max-h-64 space-y-3 overflow-y-auto pl-1">
                    {data.timeline.length === 0 && <p className="text-[12px] text-slate-500">رویدادی ثبت نشده است.</p>}
                    {data.timeline.map((t) => (
                      <div key={t.id} className="flex gap-3">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-700/60 bg-[#0b1222]">
                          <TimelineIcon icon={t.icon} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-slate-200">
                            {t.title} <span className="mr-1 text-[10px] text-slate-500">{faDate(t.at)}</span>
                          </p>
                          <p className="truncate text-[11.5px] text-slate-400">{t.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

function MiniStat({ label, value, icon, tone = "slate" }: { label: string; value: string; icon: React.ReactNode; tone?: Tone }) {
  const map: Record<Tone, string> = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-300",
    rose: "border-rose-500/25 bg-rose-500/10 text-rose-300",
    violet: "border-violet-500/25 bg-violet-500/10 text-violet-300",
    slate: "border-slate-600/40 bg-white/5 text-slate-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    orange: "border-orange-500/25 bg-orange-500/10 text-orange-300",
  };
  return (
    <div className="card-surface flex items-center gap-3 p-4">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${map[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="text-[14px] font-bold text-slate-100">{value}</p>
      </div>
    </div>
  );
}

export function levelOf(score: number): "low" | "medium" | "high" | "critical" {
  return score < 25 ? "low" : score < 50 ? "medium" : score < 75 ? "high" : "critical";
}

export function riskColorOf(level: string): string {
  return RISK_COLOR[level] ?? COLORS.slate;
}

export function riskLevelLabel(level: string): string {
  return RISK_LABELS[level] ?? level;
}

export { PERSIAN_WEEKDAYS, riskTone };
