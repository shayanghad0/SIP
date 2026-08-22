import { Activity, AlertTriangle, Bell, BarChart3, Database, Gauge, GraduationCap, HeartHandshake, LayoutDashboard, RotateCcw, Settings, ShieldCheck, Trash, Users, UserPlus, Edit } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addClass,
  addConsultantRecord,
  addGrade,
  addLesson,
  adminOverview,
  alertsList,
  addStudentRecord,
  addTeacherRecord,
  consultantsList,
  deleteConsultantRecord,
  deleteStudentRecord,
  deleteTeacherRecord,
  healthDetail,
  loadDemoData,
  markAlertRead,
  parentsList,
  schoolAnalyticsFull,
  studentsList,
  systemReset,
  teachersList,
  updateConsultantRecord,
  updateStudentRecord,
  updateTeacherRecord,
  type AlertNamed,
  type OverviewData,
  type SchoolAnalyticsData,
  type StudentRow,
  type TeacherRow,
} from "../lib/api";
import { useSession } from "../lib/session";
import { faDate, faNum } from "../lib/format";
import { AppShell, type NavItem } from "../components/layout";
import { Badge, Button, Card, EmptyState, Field, Input, notify, PageHeader, ProgressBar, RiskBar, Select, SkeletonGrid, StatCard, riskTone, Modal } from "../components/ui";
import { useForm } from "react-hook-form";
import { readDb } from "../lib/db";
import type { GradesFile, BooksFile } from "../lib/types";

function classOptionsCache() {
  return readDb<GradesFile>("grades").grades;
}
function lessonsCache() {
  return readDb<BooksFile>("books").lessons;
}
import { Bars, Donut, StudentReportModal, TrendLine, COLORS, riskLevelLabel } from "./shared";

const NAV: NavItem[] = [
  { key: "overview", label: "نمای کلی", icon: LayoutDashboard },
  { key: "students", label: "دانش‌آموزان", icon: Users },
  { key: "alerts", label: "هشدارهای هوشمند", icon: Bell },
  { key: "analytics", label: "تحلیل‌های مدرسه", icon: BarChart3 },
  { key: "teachers", label: "دبیران", icon: GraduationCap },
  { key: "family", label: "خانواده‌ها و مشاور", icon: HeartHandshake },
  { key: "settings", label: "تنظیمات سیستم", icon: Settings },
];

export default function AdminDashboard({ section }: { section: string }) {
  const { session, logout } = useSession();
  const navigate = useNavigate();
  const [reportFor, setReportFor] = useState<string | null>(null);
  const known = NAV.some((n) => n.key === section);
  const activeSection = known ? section : "overview";

  return (
    <AppShell role="admin" userName={session?.name ?? "مدیر"} nav={NAV} section={activeSection} onNavigate={(k) => navigate(`/dashboard/${k}`)} onLogout={() => { logout(); navigate("/login"); }}>
      {activeSection === "overview" && <Overview onOpenReport={setReportFor} />}
      {activeSection === "students" && <Students onOpenReport={setReportFor} />}
      {activeSection === "alerts" && <Alerts />}
      {activeSection === "analytics" && <Analytics />}
      {activeSection === "teachers" && <Teachers />}
      {activeSection === "family" && <Family />}
      {activeSection === "settings" && <SettingsSection />}
      <StudentReportModal studentId={reportFor} onClose={() => setReportFor(null)} />
    </AppShell>
  );
}

/* ================= overview ================= */

function Overview({ onOpenReport }: { onOpenReport: (id: string) => void }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    adminOverview().then(setData);
  }, []);

  if (!data) return <SkeletonGrid rows={6} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="نمای کلی مدرسه"
        subtitle="داشبورد مدیریتی با تحلیل لحظه‌ای هوش مصنوعی"
        actions={
          !data.hasAcademicData ? (
            <Button
              loading={demoLoading}
              onClick={async () => {
                setDemoLoading(true);
                await loadDemoData();
                setDemoLoading(false);
                notify.success("داده‌های نمونه بارگذاری شد");
                adminOverview().then(setData);
              }}
            >
              <UserPlus size={15} /> بارگذاری داده‌های نمونه
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={<Users size={20} />} label="دانش‌آموزان" value={faNum(data.stats.students)} tone="blue" />
        <StatCard icon={<GraduationCap size={20} />} label="دبیران" value={faNum(data.stats.teachers)} tone="violet" />
        <StatCard icon={<HeartHandshake size={20} />} label="مشاوران" value={faNum(data.stats.consultants)} tone="cyan" />
        <StatCard icon={<HeartHandshake size={20} />} label="والدین" value={faNum(data.stats.parents)} tone="emerald" />
        <StatCard icon={<Gauge size={20} />} label="میانگین نمرات" value={`${faNum(data.stats.avgScore, 1)} / ${faNum(20)}`} tone={data.stats.avgScore >= 12 ? "emerald" : "amber"} />
        <StatCard icon={<AlertTriangle size={20} />} label="هشدار ریسک" value={faNum(data.stats.riskCount)} sub={`حضور: ${faNum(Math.round(data.stats.attendanceRate))}٪`} tone={data.stats.riskCount > 0 ? "rose" : "emerald"} />
      </div>

      {!data.hasAcademicData && (
        <Card title="آغاز کار با داده‌ها" className="anim-fade-up">
          <EmptyState
            icon={<Database size={22} />}
            title="هنوز داده‌ای برای تحلیل وجود ندارد"
            desc="با بارگذاری داده‌های نمونه، ریسک‌اسکور، پیش‌بینی‌ها و نمودارها به‌صورت زنده محاسبه و نمایش داده می‌شوند."
          />
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="میانگین نمرات پایه‌ها" subtitle="از ۲۰">
          <Bars data={data.gradeAverages.map((g) => ({ name: g.name, value: Math.round(g.avg * 10) / 10 }))} name="میانگین" color={COLORS.blue} />
        </Card>
        <Card title="توزیع ریسک دانش‌آموزان" subtitle="موتور هشدار زودهنگام">
          <Donut
            data={data.riskDist.map((r) => ({
              name: r.name,
              value: r.value,
              color: r.level === "low" ? COLORS.emerald : r.level === "medium" ? COLORS.amber : r.level === "high" ? COLORS.orange : COLORS.rose,
            }))}
          />
        </Card>
        <Card title="روند حضور" subtitle="نرخ روزانه ۱۰ روز اخیر">
          <TrendLine data={data.attendanceTrend.map((t) => ({ label: t.label, avg: t.rate }))} name="نرخ حضور" unit="٪" color={COLORS.cyan} domain={[0, 100]} />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="دانش‌آموزان پرخطر" subtitle="به ترتیب ریسک — کلیک برای گزارش کامل">
          <div className="space-y-3">
            {data.riskStudents.length === 0 && <p className="py-6 text-center text-[12px] text-slate-500">دانش‌آموز پرخطری شناسایی نشده است.</p>}
            {data.riskStudents.map((s) => (
              <button key={s.id} onClick={() => onOpenReport(s.id)} className="w-full rounded-xl border border-slate-700/50 bg-[#0b1222] p-3 text-right transition hover:border-blue-500/40 cursor-pointer">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-slate-200">{s.name}</span>
                  <RiskBar score={s.risk} />
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">{s.classLabel}</span>
                  <Badge tone={riskTone(s.risk)}>{riskLevelLabel(s.level)}</Badge>
                </div>
                <p className="mt-1.5 truncate text-[11.5px] text-slate-400">{s.topReason}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card title="آخرین هشدارهای هوش مصنوعی">
          <div className="space-y-3">
            {data.alerts.length === 0 && <p className="py-6 text-center text-[12px] text-slate-500">هشدار فعالی وجود ندارد.</p>}
            {data.alerts.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-700/50 bg-[#0b1222] p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className={a.severity === "critical" ? "text-rose-400" : "text-amber-400"} />
                  <span className="text-[12.5px] font-medium text-slate-200">{a.title}</span>
                  <span className="mr-auto text-[10px] text-slate-500">{faDate(a.date)}</span>
                </div>
                <p className="mt-1 text-[11.5px] leading-5 text-slate-400">{a.message}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="فعالیت‌های اخیر">
            <div className="space-y-3">
              {data.activity.length === 0 && <p className="text-[12px] text-slate-500">فعالیتی ثبت نشده است.</p>}
              {data.activity.slice(0, 6).map((a) => (
                <div key={a.id} className="flex gap-2.5">
                  <Activity size={13} className="mt-1 shrink-0 text-blue-400" />
                  <div className="min-w-0">
                    <p className="text-[12px] text-slate-300">{a.message}</p>
                    <p className="text-[10.5px] text-slate-600">{a.roleLabel} — {faDate(a.at, true)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="سلامت سیستم">
            <div className="space-y-2 text-[12px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">پایگاه داده (فایل‌های JSON)</span>
                <Badge tone={data.health.files.every((f) => f.ok) ? "emerald" : "rose"}>{data.health.files.every((f) => f.ok) ? "سالم" : "مشکل"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">نسخه‌های پشتیبان</span>
                <span className="text-slate-200">{faNum(data.health.backups)} نسخه</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">حجم کل داده</span>
                <span className="text-slate-200">{faNum(Math.round(data.health.totalBytes / 102.4) / 10)} KB</span>
              </div>
              <ProgressBar value={data.health.files.filter((f) => f.ok).length * 12.5} tone={data.health.files.every((f) => f.ok) ? "emerald" : "rose"} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ================= students ================= */

function Students({ onOpenReport }: { onOpenReport: (id: string) => void }) {
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editStudent, setEditStudent] = useState<StudentRow['student'] | null>(null);
  const gradesData = readDb<GradesFile>("grades");
  const gradeOptions = gradesData.grades;
  const classesByGrade = gradesData.classes.reduce<Record<string, { id: string; name: string }[]>>((acc, c) => {
    (acc[c.gradeId] = acc[c.gradeId] || []).push({ id: c.id, name: c.name });
    return acc;
  }, {});
  const { register, handleSubmit, reset, setValue, watch } = useForm<any>({
    defaultValues: {
      fullName: "",
      username: "",
      password: "",
      gradeId: gradeOptions[0]?.id ?? "",
      classId: classesByGrade[gradeOptions[0]?.id ?? ""]?.[0]?.id ?? "",
      nationalId: "",
      fatherName: "",
      motherName: "",
      phone: "",
      emergencyPhone: "",
    }
  });
  const [q, setQ] = useState("");
  useEffect(() => {
    studentsList().then(setRows);
  }, []);

  // Populate form when editing
  useEffect(() => {
    if (editStudent) {
      setValue("fullName", editStudent.fullName);
      setValue("username", editStudent.username);
      setValue("password", "");
      setValue("gradeId", editStudent.gradeId);
      setValue("classId", editStudent.classId);
      setValue("nationalId", editStudent.nationalId || "");
      setValue("fatherName", editStudent.fatherName || "");
      setValue("motherName", editStudent.motherName || "");
      setValue("phone", editStudent.phone || "");
      setValue("emergencyPhone", editStudent.emergencyPhone || "");
      setShowAdd(true);
    }
  }, [editStudent, setValue]);

  const onSubmit = async (v: any) => {
    try {
      if (editStudent) {
        await updateStudentRecord(editStudent.id, {
          fullName: v.fullName.trim(),
          username: v.username.trim(),
          password: v.password || undefined,
          gradeId: v.gradeId,
          classId: v.classId,
          nationalId: v.nationalId,
          fatherName: v.fatherName,
          motherName: v.motherName,
          phone: v.phone,
          emergencyPhone: v.emergencyPhone,
        });
        notify.success("اطلاعات دانش‌آموز به‌روزرسانی شد");
        setEditStudent(null);
      } else {
        const res = await addStudentRecord({
          fullName: v.fullName.trim(),
          username: v.username.trim(),
          password: v.password,
          gradeId: v.gradeId,
          classId: v.classId,
          nationalId: v.nationalId,
          fatherName: v.fatherName,
          motherName: v.motherName,
          phone: v.phone,
          emergencyPhone: v.emergencyPhone,
        });
        notify.success("دانش‌آموز اضافه شد — حساب والدین نیز ساخته شد");
        notify.info(`حساب والد: ${res.parent.username} — رمز عبور همان رمز دانش‌آموز است`);
      }
      setShowAdd(false);
      reset();
      studentsList().then(setRows);
    } catch (e: any) {
      notify.error(e?.message ?? "خطا در عملیات");
    }
  };

  if (!rows) return <SkeletonGrid rows={6} />;
  const filtered = rows.filter((r) => r.student.fullName.includes(q) || r.classLabel.includes(q));
  return (
    <div>
      <PageHeader
        title="دانش‌آموزان"
        subtitle={`${faNum(rows.length)} دانش‌آموز — مرتب‌شده بر اساس ریسک`}
        actions={
          <div className="flex items-center gap-2">
            <Input className="max-w-56" placeholder="جستجو…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button variant="outline" onClick={() => { setEditStudent(null); setShowAdd(true); reset(); }}><UserPlus size={14} /> افزودن دانش‌آموز</Button>
          </div>
        }
      />
      {filtered.length === 0 ? (
        <EmptyState icon={<Users size={22} />} title="دانش‌آموزی یافت نشد" desc="دانش‌آموزان را از صفحه نصب اضافه کنید یا داده‌های نمونه را بارگذاری کنید." />
      ) : (
        <div className="card-surface overflow-x-auto">
          <table className="w-full min-w-[720px] text-right">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-500">
                <th className="px-4 py-3 font-medium">نام</th>
                <th className="px-4 py-3 font-medium">کلاس</th>
                <th className="px-4 py-3 font-medium">ریسک</th>
                <th className="px-4 py-3 font-medium">میانگین</th>
                <th className="px-4 py-3 font-medium">حضور</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {[...filtered]
                .sort((a, b) => b.risk - a.risk)
                .map((r) => (
                  <tr key={r.student.id} className="border-b border-slate-800/50 text-[13px] transition hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-slate-200">{r.student.fullName}</td>
                    <td className="px-4 py-3 text-slate-400">{r.classLabel}</td>
                    <td className="px-4 py-3"><RiskBar score={r.risk} /></td>
                    <td className="px-4 py-3 text-slate-300">{faNum(r.avg, 1)}</td>
                    <td className="px-4 py-3 text-slate-300">{faNum(Math.round(r.attendanceRate))}٪</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button variant="outline" className="px-3 py-1.5 text-[12px]" onClick={() => onOpenReport(r.student.id)}>
                          گزارش هوشمند
                        </Button>
                        <Button variant="ghost" className="px-3 py-1.5 text-[12px]" onClick={() => setEditStudent(r.student)}>
                          <Edit size={14} />
                        </Button>
                        <Button variant="ghost" className="px-3 py-1.5 text-[12px] text-rose-400 hover:text-rose-300" onClick={async () => {
                          if (window.confirm(`آیا از حذف «${r.student.fullName}» و حساب والدین مطمئن هستید؟`)) {
                            try {
                              await deleteStudentRecord(r.student.id);
                              notify.success("دانش‌آموز و حساب والدین حذف شد");
                              studentsList().then(setRows);
                            } catch (e: any) {
                              notify.error(e?.message ?? "خطا در حذف");
                            }
                          }
                        }}>
                          <Trash size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditStudent(null); reset(); }} title={editStudent ? "ویرایش دانش‌آموز" : "افزودن دانش‌آموز"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="نام و نام خانوادگی"><Input {...register("fullName", { required: true })} /></Field>
            <Field label="نام کاربری"><Input dir="ltr" {...register("username", { required: true })} /></Field>
            <Field label="رمز عبور (در صورت تغییر)">
              <Input dir="ltr" type="password" {...register("password")} placeholder="••••••••" />
            </Field>
            <Field label="پایه">
              <Select {...register("gradeId")}>
                {gradeOptions.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
            </Field>
            <Field label="کلاس">
              <Select {...register("classId")}>
                {(classesByGrade[watch("gradeId")] ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="کد ملی (اختیاری)"><Input dir="ltr" {...register("nationalId")} /></Field>
            <Field label="نام پدر"><Input {...register("fatherName")} /></Field>
            <Field label="نام مادر"><Input {...register("motherName")} /></Field>
            <Field label="تلفن"><Input dir="ltr" {...register("phone")} /></Field>
            <Field label="تلفن اضطراری"><Input dir="ltr" {...register("emergencyPhone")} /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setShowAdd(false); setEditStudent(null); reset(); }}>انصراف</Button>
            <Button type="submit">{editStudent ? "ذخیره تغییرات" : "افزودن"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ================= alerts ================= */

function Alerts() {
  const [alerts, setAlerts] = useState<AlertNamed[] | null>(null);
  useEffect(() => {
    alertsList().then(setAlerts);
  }, []);
  if (!alerts) return <SkeletonGrid rows={4} />;
  return (
    <div>
      <PageHeader title="هشدارهای هوش مصنوعی" subtitle="خروجی زنده موتور هشدار زودهنگام — ریسک، سلامت روان، افت، غیبت و انومالی آزمون" />
      {alerts.length === 0 ? (
        <EmptyState icon={<Bell size={22} />} title="هشدار فعالی وجود ندارد" desc="وقتی ریسک دانش‌آموز از آستانه عبور کند، هشدار اینجا نمایش داده می‌شود." />
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a.id} className={`card-surface p-4 ${a.read ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={a.severity === "critical" ? "rose" : a.severity === "warning" ? "amber" : "blue"}>{a.severity === "critical" ? "بحرانی" : a.severity === "warning" ? "هشدار" : "اطلاع"}</Badge>
                <span className="text-[13.5px] font-semibold text-slate-100">{a.title}</span>
                <span className="text-[12px] text-slate-400">{a.studentName}</span>
                <span className="mr-auto text-[11px] text-slate-500">{faDate(a.date)}</span>
                {!a.read && (
                  <Button variant="ghost" className="px-2.5 py-1 text-[11px]" onClick={() => { markAlertRead(a.id); setAlerts(alerts.map((x) => (x.id === a.id ? { ...x, read: true } : x))); }}>
                    علامت‌گذاری به‌عنوان خوانده‌شده
                  </Button>
                )}
              </div>
              <p className="mt-2 text-[12.5px] leading-6 text-slate-300">{a.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= analytics ================= */

function heatStyle(v: number | null): React.CSSProperties {
  if (v === null) return { background: "rgba(100,116,139,0.08)", color: "#475569" };
  const t = v / 20;
  const hue = t * 145;
  return { background: `hsla(${hue},65%,42%,0.28)`, color: `hsl(${hue},70%,68%)` };
}

function Analytics() {
  const [data, setData] = useState<SchoolAnalyticsData | null>(null);
  useEffect(() => {
    schoolAnalyticsFull().then(setData);
  }, []);
  if (!data) return <SkeletonGrid rows={6} />;
  return (
    <div className="space-y-5">
      <PageHeader title="تحلیل‌های جامع مدرسه" subtitle="عملکرد پایه‌ها، کلاس‌ها، دروس، دبیران و کشف انومالی آزمون" />

      <Card title="نمادهارت عملکرد" subtitle="میانگین نمرات هر پایه در هر درس (از ۲۰) — سبز قوی، قرمز ضعیف">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `90px repeat(${Math.max(data.heat[0]?.cells.length ?? 1, 1)}, 1fr)` }}>
              <div />
              {data.heat[0]?.cells.map((c) => (
                <div key={c.lesson} className="pb-1 text-center text-[11px] text-slate-400">{c.lesson}</div>
              ))}
              {data.heat.map((row) => (
                <RowCells key={row.grade} row={row} />
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="میانگین کلاس‌ها" subtitle="از ۲۰">
          <Bars vertical data={data.classAverages.map((c) => ({ name: c.name, value: c.avg }))} name="میانگین" color={COLORS.violet} height={Math.max(230, data.classAverages.length * 44)} />
        </Card>
        <Card title="عملکرد دروس" subtitle="میانگین کل مدرسه به‌همراه اهمیت درس">
          <div className="space-y-3.5">
            {[...data.lessonAverages].sort((a, b) => b.importance - a.importance).map((l) => (
              <div key={l.name}>
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span className="text-slate-300">{l.name} <span className="text-slate-600">اهمیت {faNum(l.importance)}</span></span>
                  <span className="font-semibold text-slate-200">{faNum(l.avg, 1)} / {faNum(20)}</span>
                </div>
                <ProgressBar value={(l.avg / 20) * 100} tone={l.avg >= 14 ? "emerald" : l.avg >= 10 ? "amber" : "rose"} />
              </div>
            ))}
            {data.lessonAverages.length === 0 && <p className="text-[12px] text-slate-500">داده‌ای موجود نیست.</p>}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="برترین دانش‌آموزان">
          <div className="space-y-2">
            {data.topStudents.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3 rounded-xl border border-slate-700/40 bg-[#0b1222] px-3 py-2.5">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${i === 0 ? "bg-amber-500/20 text-amber-300" : "bg-slate-700/50 text-slate-300"}`}>{faNum(i + 1)}</span>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] text-slate-200">{s.name}</p>
                  <p className="text-[10.5px] text-slate-500">{s.classLabel}</p>
                </div>
                <span className="mr-auto text-[13px] font-bold text-emerald-300">{faNum(s.avg, 1)}</span>
              </div>
            ))}
            {data.topStudents.length === 0 && <p className="py-4 text-center text-[12px] text-slate-500">داده‌ای موجود نیست.</p>}
          </div>
        </Card>

        <Card title="دروس در معرض افت" subtitle="دروس ضعیف‌تر — کاندیدای کلاس جبرانی">
          <div className="space-y-3">
            {data.weakLessons.map((w) => (
              <div key={w.name} className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                <span className="text-[12.5px] text-slate-200">{w.name}</span>
                <span className="text-[13px] font-bold text-amber-300">{faNum(w.avg, 1)} / {faNum(20)}</span>
              </div>
            ))}
            {data.weakLessons.length === 0 && <p className="py-4 text-center text-[12px] text-slate-500">داده‌ای موجود نیست.</p>}
          </div>
        </Card>

        <Card title="انومالی آزمون (تشخیص تقلب)" subtitle="پرش هم‌زمان نمرات و الگوهای شبیه‌سان">
          <div className="space-y-2">
            {data.cheating.length === 0 && <p className="py-4 text-center text-[12px] text-emerald-300/80">الگوی مشکوکی شناسایی نشده است ✓</p>}
            {data.cheating.map((c, i) => (
              <div key={i} className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3">
                <p className="text-[12px] leading-6 text-rose-200">{c.reason}</p>
                <p className="mt-1 text-[10.5px] text-slate-500">{faDate(c.date)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="کارآموزی دبیران" subtitle="شاخص کارایی تدریس (میانگین + پیشرفت + تکالیف)">
        <Bars vertical data={data.teacherBars.map((t) => ({ name: t.name, value: t.efficiency }))} name="کارایی ٪" color={COLORS.cyan} height={Math.max(200, data.teacherBars.length * 44)} />
      </Card>
    </div>
  );
}

function RowCells({ row }: { row: { grade: string; cells: { lesson: string; value: number | null }[] } }) {
  return (
    <>
      <div className="flex items-center text-[11.5px] text-slate-300">{row.grade}</div>
      {row.cells.map((c) => (
        <div key={c.lesson} className="rounded-lg py-2 text-center text-[11.5px] font-semibold transition" style={heatStyle(c.value)}>
          {c.value === null ? "—" : faNum(c.value, 1)}
        </div>
      ))}
    </>
  );
}

/* ================= teachers ================= */

function Teachers() {
  const [rows, setRows] = useState<TeacherRow[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editTeacher, setEditTeacher] = useState<TeacherRow['teacher'] | null>(null);
  const gradesData = readDb<GradesFile>("grades");
  const lessons = lessonsCache();
  const gradeOptions = gradesData.grades;
  const classesByGrade = gradesData.classes.reduce<Record<string, { id: string; name: string }[]>>((acc, c) => {
    (acc[c.gradeId] = acc[c.gradeId] || []).push({ id: c.id, name: c.name });
    return acc;
  }, {});
  const { register, handleSubmit, reset, setValue } = useForm<any>({
    defaultValues: {
      fullName: "",
      username: "",
      password: "",
    }
  });
  const [assignments, setAssignments] = useState<{ lessonId: string; gradeId: string; classId: string }[]>([]);

  useEffect(() => {
    teachersList().then(setRows);
  }, []);

  // Populate for editing
  useEffect(() => {
    if (editTeacher) {
      setValue("fullName", editTeacher.fullName);
      setValue("username", editTeacher.username);
      setValue("password", "");
      setAssignments(editTeacher.assignments.map(a => ({ lessonId: a.lessonId, gradeId: a.gradeId, classId: a.classId })));
      setShowAdd(true);
    }
  }, [editTeacher, setValue]);

  const onSubmit = async (v: any) => {
    try {
      if (editTeacher) {
        await updateTeacherRecord(editTeacher.id, {
          fullName: v.fullName.trim(),
          username: v.username.trim(),
          password: v.password || undefined,
          assignments,
        });
        notify.success("اطلاعات دبیر به‌روزرسانی شد");
        setEditTeacher(null);
      } else {
        await addTeacherRecord({
          fullName: v.fullName.trim(),
          username: v.username.trim(),
          password: v.password,
          assignments,
        });
        notify.success("دبیر اضافه شد");
      }
      setShowAdd(false);
      reset();
      setAssignments([]);
      teachersList().then(setRows);
    } catch (e: any) {
      notify.error(e?.message ?? "خطا در عملیات");
    }
  };

  if (!rows) return <SkeletonGrid rows={4} />;
  return (
    <div>
      <PageHeader title="دبیران" subtitle="تحلیل عملکرد تدریس هر دبیر توسط موتور تحلیل دبیر" actions={
        <Button variant="outline" onClick={() => { setEditTeacher(null); setAssignments([]); setShowAdd(true); reset(); }}><UserPlus size={14} /> افزودن دبیر</Button>
      } />
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((t) => (
          <Card key={t.teacher.id}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-[14px] font-semibold text-slate-100">{t.teacher.fullName}</p>
                <p dir="ltr" className="text-right text-[11px] text-slate-500">{t.teacher.username}</p>
              </div>
              <div className="flex gap-1">
                <Badge tone={t.analytics.efficiency >= 65 ? "emerald" : t.analytics.efficiency >= 45 ? "amber" : "rose"}>
                  کارایی {faNum(Math.round(t.analytics.efficiency))}٪
                </Badge>
                <Button variant="ghost" className="px-2 py-1" onClick={() => setEditTeacher(t.teacher)}>
                  <Edit size={14} />
                </Button>
                <Button variant="ghost" className="px-2 py-1 text-rose-400 hover:text-rose-300" onClick={async () => {
                  if (window.confirm(`آیا از حذف دبیر «${t.teacher.fullName}» مطمئن هستید؟`)) {
                    try {
                      await deleteTeacherRecord(t.teacher.id);
                      notify.success("دبیر حذف شد");
                      teachersList().then(setRows);
                    } catch (e: any) {
                      notify.error(e?.message ?? "خطا در حذف");
                    }
                  }
                }}>
                  <Trash size={14} />
                </Button>
              </div>
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {t.assignments.length === 0 && <span className="text-[11px] text-slate-500">هنوز درسی اختصاص داده نشده</span>}
              {t.assignments.map((a, i) => (
                <span key={i} className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] text-blue-300">{a}</span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-4">
              <Metric label="دانش‌آموزان" value={faNum(t.analytics.studentCount)} />
              <Metric label="میانگین کلاس" value={`${faNum(t.analytics.avgScore, 1)}`} />
              <Metric label="پیشرفت" value={`${t.analytics.improvement >= 0 ? "+" : ""}${faNum(t.analytics.improvement, 2)}`} tone={t.analytics.improvement >= 0 ? "emerald" : "rose"} />
              <Metric label="سختی آزمون" value={`${faNum(Math.round(t.analytics.difficultyIndex))}٪`} />
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                <span>انجام تکالیف</span>
                <span>{faNum(Math.round(t.analytics.homeworkCompletion))}٪</span>
              </div>
              <ProgressBar value={t.analytics.homeworkCompletion} tone="cyan" />
            </div>
          </Card>
        ))}
        {rows.length === 0 && <EmptyState icon={<GraduationCap size={22} />} title="دبیری ثبت نشده است" />}
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditTeacher(null); reset(); setAssignments([]); }} title={editTeacher ? "ویرایش دبیر" : "افزودن دبیر"} wide>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="نام و نام خانوادگی"><Input {...register("fullName", { required: true })} /></Field>
            <Field label="نام کاربری"><Input dir="ltr" {...register("username", { required: true })} /></Field>
            <Field label="رمز عبور (در صورت تغییر)"><Input dir="ltr" type="password" {...register("password")} placeholder="••••••••" /></Field>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-300">افزودن اختصاص‌ها (درس • پایه • کلاس) — حداقل یک مورد لازم است</p>
            <div className="space-y-2">
              {assignments.map((as, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2">
                  <Select value={as.lessonId} onChange={(e) => setAssignments((s) => s.map((it, i) => (i === idx ? { ...it, lessonId: e.target.value } : it)))}>
                    {lessons.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </Select>
                  <Select value={as.gradeId} onChange={(e) => setAssignments((s) => s.map((it, i) => (i === idx ? { ...it, gradeId: e.target.value, classId: classesByGrade[e.target.value]?.[0]?.id ?? "" } : it)))}>
                    {gradeOptions.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </Select>
                  <div className="flex gap-2">
                    <Select value={as.classId} onChange={(e) => setAssignments((s) => s.map((it, i) => (i === idx ? { ...it, classId: e.target.value } : it)))}>
                      {(classesByGrade[as.gradeId] ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                    <Button variant="ghost" type="button" onClick={() => setAssignments((s) => s.filter((_x, i) => i !== idx))}>حذف</Button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => setAssignments((s) => [...s, { lessonId: lessons[0]?.id ?? "", gradeId: gradeOptions[0]?.id ?? "", classId: classesByGrade[gradeOptions[0]?.id ?? ""]?.[0]?.id ?? "" }])}>افزودن اختصاص دیگر</Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setShowAdd(false); setEditTeacher(null); reset(); setAssignments([]); }}>انصراف</Button>
            <Button type="submit">{editTeacher ? "ذخیره تغییرات" : "افزودن"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "rose" }) {
  return (
    <div className="rounded-xl border border-slate-700/40 bg-[#0b1222] px-3 py-2">
      <p className="text-[10.5px] text-slate-500">{label}</p>
      <p className={`mt-0.5 text-[13.5px] font-bold ${tone === "emerald" ? "text-emerald-300" : tone === "rose" ? "text-rose-300" : "text-slate-100"}`}>{value}</p>
    </div>
  );
}

/* ================= family ================= */

function Family() {
  const [parents, setParents] = useState<{ parent: { username: string; fullName: string }; studentName: string; classLabel: string; risk: number }[] | null>(null);
  useEffect(() => {
    parentsList().then(setParents);
  }, []);
  if (!parents) return <SkeletonGrid rows={4} />;
  return (
    <div className="space-y-5">
      <Card title={`والدین (${faNum(parents.length)})`} subtitle="هر والد فقط به داده‌های فرزند خود دسترسی دارد">
        <div className="space-y-2">
          {parents.map((p) => (
            <div key={p.parent.username} className="flex items-center gap-3 rounded-xl border border-slate-700/40 bg-[#0b1222] px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[13px] text-slate-200">{p.parent.fullName}</p>
                <p className="text-[11px] text-slate-500">
                  فرزند: {p.studentName} — {p.classLabel}
                </p>
              </div>
              <span className="mr-auto"><RiskBar score={p.risk} /></span>
            </div>
          ))}
          {parents.length === 0 && <p className="py-4 text-center text-[12px] text-slate-500">والدینی ثبت نشده است.</p>}
        </div>
      </Card>
      <ConsultantsManager />
    </div>
  );
}

/* ================= consultants ================= */

function ConsultantsManager() {
  type ConsultantRow = { id: string; fullName: string; username: string; specialty: string; createdAt: string };
  const [rows, setRows] = useState<ConsultantRow[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editCon, setEditCon] = useState<ConsultantRow | null>(null);
  const { register, handleSubmit, reset, setValue } = useForm<any>({
    defaultValues: { fullName: "", username: "", password: "", specialty: "" },
  });

  useEffect(() => {
    consultantsList().then(setRows);
  }, []);

  useEffect(() => {
    if (editCon) {
      setValue("fullName", editCon.fullName);
      setValue("username", editCon.username);
      setValue("password", "");
      setValue("specialty", editCon.specialty || "");
      setShowAdd(true);
    }
  }, [editCon, setValue]);

  const onSubmit = async (v: any) => {
    try {
      if (editCon) {
        await updateConsultantRecord(editCon.id, {
          fullName: v.fullName.trim(),
          username: v.username.trim(),
          password: v.password || undefined,
          specialty: v.specialty.trim() || undefined,
        });
        notify.success("اطلاعات مشاور به‌روزرسانی شد");
        setEditCon(null);
      } else {
        await addConsultantRecord({
          fullName: v.fullName.trim(),
          username: v.username.trim(),
          password: v.password,
          specialty: v.specialty.trim() || undefined,
        });
        notify.success("مشاور اضافه شد");
      }
      setShowAdd(false);
      reset();
      consultantsList().then(setRows);
    } catch (e: any) {
      notify.error(e?.message ?? "خطا در عملیات");
    }
  };

  if (!rows) return <SkeletonGrid rows={4} />;
  return (
    <div>
      <Card title={`مشاوران (${faNum(rows.length)})`} subtitle="مدیریت مشاوران مدرسه">
        <div className="mb-3 flex justify-end">
          <Button variant="outline" onClick={() => { setEditCon(null); reset(); setShowAdd(true); }}><UserPlus size={14} /> افزودن مشاور</Button>
        </div>
        <div className="space-y-2">
          {rows.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-slate-700/40 bg-[#0b1222] px-3 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300">
                <ShieldCheck size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] text-slate-200">{c.fullName}</p>
                <p dir="ltr" className="text-right text-[11px] text-slate-500">{c.username}</p>
                {c.specialty && <p className="text-[10.5px] text-slate-500">{c.specialty}</p>}
              </div>
              <span className="mr-auto text-[10.5px] text-slate-500">{faDate(c.createdAt)}</span>
              <div className="flex gap-1">
                <Button variant="ghost" className="px-2 py-1" onClick={() => setEditCon(c)}>
                  <Edit size={14} />
                </Button>
                <Button variant="ghost" className="px-2 py-1 text-rose-400 hover:text-rose-300" onClick={async () => {
                  if (window.confirm(`آیا از حذف مشاور «${c.fullName}» مطمئن هستید؟`)) {
                    try {
                      await deleteConsultantRecord(c.id);
                      notify.success("مشاور حذف شد");
                      consultantsList().then(setRows);
                    } catch (e: any) {
                      notify.error(e?.message ?? "خطا در حذف");
                    }
                  }
                }}>
                  <Trash size={14} />
                </Button>
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="py-4 text-center text-[12px] text-slate-500">مشاور ثبت نشده است.</p>}
        </div>
      </Card>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditCon(null); reset(); }} title={editCon ? "ویرایش مشاور" : "افزودن مشاور"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="نام و نام خانوادگی"><Input {...register("fullName", { required: true })} /></Field>
            <Field label="نام کاربری"><Input dir="ltr" {...register("username", { required: true })} /></Field>
            <Field label="رمز عبور (در صورت تغییر)"><Input dir="ltr" type="password" {...register("password")} placeholder="••••••••" /></Field>
            <Field label="تخصص"><Input {...register("specialty")} placeholder="مشاوره تحصیلی" /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setShowAdd(false); setEditCon(null); reset(); }}>انصراف</Button>
            <Button type="submit">{editCon ? "ذخیره تغییرات" : "افزودن"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ================= settings ================= */

function SettingsSection() {
  const [grade, setGrade] = useState("");
  const [classFor, setClassFor] = useState<string>("");
  const [className, setClassName] = useState("");
  const [lesson, setLesson] = useState("");
  const [imp, setImp] = useState(7);
  const [health, setHealth] = useState<ReturnType<typeof healthDetail> | null>(null);
  const reloadHealth = useCallback(() => setHealth(healthDetail()), []);
  useEffect(reloadHealth, [reloadHealth]);

  return (
    <div className="space-y-5">
      <PageHeader title="تنظیمات سیستم" subtitle="مدیریت ساختار تحصیلی و سلامت پایگاه داده JSON" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="افزودن پایه و کلاس">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="نام پایه جدید" value={grade} onChange={(e) => setGrade(e.target.value)} />
              <Button
                variant="outline"
                onClick={() => {
                  if (!grade.trim()) return;
                  addGrade(grade.trim());
                  setGrade("");
                  notify.success("پایه اضافه شد");
                  reloadHealth();
                }}
              >
                افزودن
              </Button>
            </div>
            <div className="flex gap-2">
              <Select value={classFor} onChange={(e) => setClassFor(e.target.value)}>
                <option value="">پایه را انتخاب کنید…</option>
                {classOptionsCache().map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </Select>
              <Input placeholder="نام کلاس" value={className} onChange={(e) => setClassName(e.target.value)} />
              <Button
                variant="outline"
                onClick={() => {
                  if (!classFor || !className.trim()) return notify.error("پایه و نام کلاس را انتخاب کنید");
                  addClass(classFor, className.trim());
                  setClassName("");
                  notify.success("کلاس اضافه شد");
                  reloadHealth();
                }}
              >
                افزودن
              </Button>
            </div>
          </div>
        </Card>

        <Card title="افزودن درس" subtitle="امتیاز اهمیت ۳ تا ۱۰ — در ریسک و برنامه مطالعاتی استفاده می‌شود">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="نام درس" value={lesson} onChange={(e) => setLesson(e.target.value)} />
              <Button
                variant="outline"
                onClick={() => {
                  if (!lesson.trim()) return;
                  addLesson(lesson.trim(), imp);
                  setLesson("");
                  notify.success("درس اضافه و تحلیل‌ها به‌روزرسانی شد");
                  reloadHealth();
                }}
              >
                افزودن
              </Button>
            </div>
            <Field label={`امتیاز اهمیت: ${faNum(imp)} از ۱۰`}>
              <input type="range" min={3} max={10} value={imp} onChange={(e) => setImp(Number(e.target.value))} className="w-full" />
            </Field>
          </div>
        </Card>

        <Card title="سلامت پایگاه داده JSON" subtitle="اعتبارسنجی فایل‌ها، نسخه‌های پشتیبان و حجم">
          <div className="space-y-2">
            {health?.files.map((f) => (
              <div key={f.file} className="flex items-center justify-between text-[12px]">
                <span dir="ltr" className="text-left font-mono text-[11px] text-slate-400">{f.file}</span>
                <span className="flex items-center gap-2">
                  <span className="text-slate-500">{faNum(Math.round(f.bytes / 102.4) / 10)} KB</span>
                  <Badge tone={f.ok ? "emerald" : "rose"}>{f.ok ? "سالم" : "خراب"}</Badge>
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="عملیات حساس">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
              <div>
                <p className="text-[13px] font-medium text-amber-200">بازنشانی کامل سامانه</p>
                <p className="mt-0.5 text-[11.5px] text-slate-400">همه فایل‌های JSON پاک و نصب مجدد فعال می‌شود.</p>
              </div>
              <Button
                variant="danger"
                onClick={() => {
                  if (window.confirm("آیا مطمئن هستید؟ همه داده‌ها حذف می‌شوند.")) {
                    systemReset();
                    window.location.hash = "#/install";
                  }
                }}
              >
                <RotateCcw size={14} /> بازنشانی
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}