import { BookOpen, CalendarCheck, ClipboardList, LayoutDashboard, ScrollText, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addBehavior,
  addExam,
  addHomework,
  classOptions,
  examScoresOf,
  existingAttendance,
  homeworksOfClass,
  lessonOptions,
  saveAttendance,
  saveExamScores,
  studentsOfClass,
  teacherHome,
  toggleHomework,
  type TeacherHomeData,
} from "../lib/api";
import { useSession } from "../lib/session";
import type { AttendanceStatus } from "../lib/types";
import { faDate, faNum, todayIso } from "../lib/format";
import { AppShell, type NavItem } from "../components/layout";
import { Badge, Button, Card, EmptyState, Field, Input, notify, PageHeader, ProgressBar, RiskBar, Select, SkeletonGrid, StatCard, riskTone } from "../components/ui";
import { StudentReportModal, riskLevelLabel } from "./shared";
import { cn } from "../utils/cn";

const NAV: NavItem[] = [
  { key: "overview", label: "نمای کلی", icon: LayoutDashboard },
  { key: "attendance", label: "حضور و غیاب", icon: CalendarCheck },
  { key: "homeworks", label: "تکالیف", icon: ClipboardList },
  { key: "exams", label: "آزمون‌ها و نمرات", icon: BookOpen },
  { key: "behavior", label: "گزارش رفتاری", icon: ScrollText },
  { key: "students", label: "دانش‌آموزان من", icon: Users },
];

export default function TeacherDashboard({ section }: { section: string }) {
  const { session, logout } = useSession();
  const navigate = useNavigate();
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [data, setData] = useState<TeacherHomeData | null>(null);
  const known = NAV.some((n) => n.key === section);
  const activeSection = known ? section : "overview";

  const reload = useCallback(() => {
    if (session) teacherHome(session.sub).then(setData);
  }, [session]);

  useEffect(reload, [reload]);

  const assignments = useMemo(
    () =>
      (data?.classes ?? []).map((c) => ({
        key: `${c.lessonId}|${c.classId}`,
        lessonId: c.lessonId,
        lessonName: c.lessonName,
        classId: c.classId,
        classLabel: c.classLabel,
        students: c.students,
      })),
    [data],
  );

  return (
    <AppShell role="teacher" userName={session?.name ?? "دبیر"} nav={NAV} section={activeSection} onNavigate={(k) => navigate(`/dashboard/${k}`)} onLogout={() => { logout(); navigate("/login"); }}>
      {!data ? (
        <SkeletonGrid rows={5} />
      ) : (
        <>
          {activeSection === "overview" && <Overview data={data} onOpenReport={setReportFor} />}
          {activeSection === "attendance" && <Attendance assignments={assignments} onSaved={reload} />}
          {activeSection === "homeworks" && <Homeworks onSaved={reload} />}
          {activeSection === "exams" && <Exams onSaved={reload} />}
          {activeSection === "behavior" && <Behavior assignments={assignments} onSaved={reload} />}
          {activeSection === "students" && <MyStudents data={data} onOpenReport={setReportFor} />}
        </>
      )}
      <StudentReportModal studentId={reportFor} onClose={() => setReportFor(null)} />
    </AppShell>
  );
}

interface AssignView {
  key: string;
  lessonId: string;
  lessonName: string;
  classId: string;
  classLabel: string;
  students: { id: string; name: string; risk: number; level: string; avg: number }[];
}

function Overview({ data, onOpenReport }: { data: TeacherHomeData; onOpenReport: (id: string) => void }) {
  return (
    <div className="space-y-5">
      <PageHeader title="کلاس‌های من" subtitle="نمای کلی تدریس‌ها و وضعیت دانش‌آموزان" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard icon={<Users size={20} />} label="دانش‌آموزان" value={faNum(data.stats.studentCount)} tone="blue" />
        <StatCard icon={<BookOpen size={20} />} label="میانگین نمرات" value={`${faNum(data.stats.avgScore, 1)}/${faNum(20)}`} tone={data.stats.avgScore >= 12 ? "emerald" : "amber"} />
        <StatCard icon={<ClipboardList size={20} />} label="تکالیف" value={faNum(data.stats.homeworks)} tone="violet" />
        <StatCard icon={<BookOpen size={20} />} label="آزمون‌ها" value={faNum(data.stats.exams)} tone="cyan" />
        <StatCard icon={<Users size={20} />} label="دانش‌آموزان پرخطر" value={faNum(data.stats.riskStudents)} tone={data.stats.riskStudents > 0 ? "rose" : "emerald"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="کلاس‌ها و دروس">
          <div className="space-y-3">
            {data.classes.map((c) => (
              <div key={`${c.lessonId}-${c.classId}`} className="rounded-xl border border-slate-700/50 bg-[#0b1222] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-blue-300">{c.lessonName} — {c.classLabel}</p>
                  <Badge tone="slate">{faNum(c.students.length)} نفر</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {c.students.map((s) => (
                    <button key={s.id} onClick={() => onOpenReport(s.id)} className="rounded-full border border-slate-700/60 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-blue-500/50 cursor-pointer">
                      {s.name} <span style={{ color: s.risk >= 75 ? "#fb7185" : s.risk >= 50 ? "#fbbf24" : "#34d399" }}>• {faNum(s.risk)}</span>
                    </button>
                  ))}
                  {c.students.length === 0 && <p className="text-[11px] text-slate-500">دانش‌آموزی در این کلاس نیست</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="دانش‌آموزان نیازمند توجه" subtitle="بر اساس ریسک‌اسکور هوش مصنوعی">
            <div className="space-y-3">
              {data.riskStudents.length === 0 && <p className="py-4 text-center text-[12px] text-emerald-300/80">همه دانش‌آموزان در وضعیت مناسب‌اند ✓</p>}
              {data.riskStudents.map((s) => (
                <button key={s.id} onClick={() => onOpenReport(s.id)} className="w-full rounded-xl border border-slate-700/50 bg-[#0b1222] p-3 text-right transition hover:border-blue-500/40 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-slate-200">{s.name}</span>
                    <RiskBar score={s.risk} />
                  </div>
                  <p className="mt-1 truncate text-[11.5px] text-slate-400">{s.topReason}</p>
                </button>
              ))}
            </div>
          </Card>
          <Card title="آخرین آزمون‌ها">
            <div className="space-y-2">
              {data.recentExams.length === 0 && <p className="text-[12px] text-slate-500">آزمونی ثبت نشده است.</p>}
              {data.recentExams.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border border-slate-700/40 bg-white/[0.02] px-3 py-2 text-[12px]">
                  <span className="text-slate-300">{e.name}</span>
                  <span className="text-slate-500">{faNum(e.scoresCount)} نمره — {faDate(e.date)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AssignPicker({ assignments, value, onChange }: { assignments: AssignView[]; value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className="max-w-sm">
      <option value="">کلاس و درس را انتخاب کنید…</option>
      {assignments.map((a) => (
        <option key={a.key} value={a.key}>
          {a.lessonName} — {a.classLabel}
        </option>
      ))}
    </Select>
  );
}

/* ================= attendance ================= */

const STATUS_META: { key: AttendanceStatus; label: string; cls: string; active: string }[] = [
  { key: "present", label: "حاضر", cls: "text-emerald-300", active: "border-emerald-500/60 bg-emerald-500/15" },
  { key: "late", label: "دیررس", cls: "text-amber-300", active: "border-amber-500/60 bg-amber-500/15" },
  { key: "absent", label: "غایب", cls: "text-rose-300", active: "border-rose-500/60 bg-rose-500/15" },
];

function Attendance({ assignments, onSaved }: { assignments: AssignView[]; onSaved: () => void }) {
  const teacher = useSession().session;
  const [key, setKey] = useState("");
  const [date, setDate] = useState(todayIso());
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [busy, setBusy] = useState(false);
  const assign = assignments.find((a) => a.key === key);

  useEffect(() => {
    if (assign) setMarks(existingAttendance(assign.classId, date));
  }, [key, date, assign]);

  if (assignments.length === 0) return <EmptyState icon={<CalendarCheck size={22} />} title="تدریسی ثبت نشده است" desc="در مرحله نصب، درس و کلاس برای شما اختصاص داده می‌شود." />;

  return (
    <div>
      <PageHeader title="ثبت حضور و غیاب" subtitle="ثبت هر روز یک‌بار — نتیجه مستقیماً در ریسک‌اسکور اعمال می‌شود" />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="کلاس و درس">
          <AssignPicker assignments={assignments} value={key} onChange={setKey} />
        </Field>
        <Field label="تاریخ">
          <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Button
          loading={busy}
          disabled={!assign}
          onClick={async () => {
            if (!assign) return;
            setBusy(true);
            setTimeout(() => {
              saveAttendance(assign.classId, date, marks, teacher?.name ?? "دبیر");
              setBusy(false);
              notify.success("حضور و غیاب ذخیره و تحلیل‌ها به‌روزرسانی شد");
              onSaved();
            }, 300);
          }}
        >
          <CalendarCheck size={15} /> ذخیره
        </Button>
        <Button variant="ghost" disabled={!assign} onClick={() => assign && setMarks(Object.fromEntries(assign.students.map((s) => [s.id, "present" as AttendanceStatus])))}>
          همه حاضر
        </Button>
      </div>

      {!assign ? (
        <EmptyState icon={<CalendarCheck size={22} />} title="کلاسی انتخاب نشده است" />
      ) : (
        <div className="card-surface divide-y divide-slate-800/60">
          {assign.students.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="min-w-32 text-[13px] font-medium text-slate-200">{s.name}</span>
              <Badge tone={riskTone(s.risk)}>ریسک {faNum(s.risk)}</Badge>
              <div className="mr-auto flex gap-1.5">
                {STATUS_META.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMarks((prev) => ({ ...prev, [s.id]: m.key }))}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-[12px] transition cursor-pointer",
                      marks[s.id] === m.key ? m.active : "border-slate-700/60 bg-white/[0.02] text-slate-400 hover:bg-white/5",
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {assign.students.length === 0 && <p className="px-4 py-8 text-center text-[12px] text-slate-500">دانش‌آموزی در این کلاس نیست.</p>}
        </div>
      )}
    </div>
  );
}

/* ================= homeworks ================= */

function Homeworks({ onSaved }: { onSaved: () => void }) {
  const teacher = useSession().session;
  const lessons = lessonOptions();
  const classes = classOptions();
  const [lessonId, setLessonId] = useState("");
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(todayIso());
  const [hws, setHws] = useState<ReturnType<typeof homeworksOfClass> | null>(null);
  const reload = useCallback(() => {
    if (classId) setHws(homeworksOfClass(classId));
    else setHws(null);
  }, [classId]);
  useEffect(reload, [reload]);

  return (
    <div>
      <PageHeader title="تکالیف" subtitle="ایجاد تکلیف و پایش وضعیت انجام توسط دانش‌آموزان" />
      <Card title="ثبت تکلیف جدید">
        <div className="grid gap-3 md:grid-cols-5">
          <Field label="درس">
            <Select value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
              <option value="">انتخاب…</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="کلاس">
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">انتخاب…</option>
              {classes.map((c) => (
                <option key={c.classId} value={c.classId}>{c.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="عنوان">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: تمرین ۴ جبر" />
          </Field>
          <Field label="مهلت">
            <Input type="date" dir="ltr" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() => {
                if (!lessonId || !classId || !title.trim()) return notify.error("همه فیلدها را پر کنید");
                addHomework(lessonId, classId, title.trim(), due, teacher?.sub ?? "", teacher?.name ?? "دبیر");
                setTitle("");
                notify.success("تکلیف ایجاد شد");
                reload();
                onSaved();
              }}
            >
              ایجاد
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-5">
        {!classId ? (
          <EmptyState icon={<ClipboardList size={22} />} title="برای مشاهده تکالیف، یک کلاس انتخاب کنید" />
        ) : !hws || hws.length === 0 ? (
          <EmptyState icon={<ClipboardList size={22} />} title="تکلیفی ثبت نشده است" />
        ) : (
          <div className="space-y-4">
            {hws.map((h) => {
              const done = Object.values(h.submissions).filter(Boolean).length;
              const total = Object.values(h.submissions).length;
              return (
                <Card key={h.id} title={h.title} subtitle={`${h.lessonName} — مهلت: ${faDate(h.dueDate)}`}>
                  <div className="mb-3 flex items-center gap-3">
                    <ProgressBar value={total > 0 ? (done / total) * 100 : 0} tone={done / Math.max(total, 1) >= 0.7 ? "emerald" : "amber"} />
                    <span className="whitespace-nowrap text-[11px] text-slate-400">{faNum(done)} از {faNum(total)} انجام شد</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {studentsOfClass(classId).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          toggleHomework(h.id, s.id, !h.submissions[s.id]);
                          reload();
                          onSaved();
                        }}
                        className={cn(
                          "rounded-full border px-3 py-1 text-[11.5px] transition cursor-pointer",
                          h.submissions[s.id] ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300" : "border-slate-700/60 bg-white/[0.02] text-slate-400 hover:bg-white/5",
                        )}
                      >
                        {s.fullName}
                      </button>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= exams ================= */

function Exams({ onSaved }: { onSaved: () => void }) {
  const teacher = useSession().session;
  const lessons = lessonOptions();
  const classes = classOptions();
  const [name, setName] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [created, setCreated] = useState<{ id: string; lessonId: string; classId: string; label: string }[]>([]);
  const [examId, setExamId] = useState("");
  const [scores, setScores] = useState<Record<string, string>>({});

  const exam = created.find((e) => e.id === examId);
  const students = exam ? studentsOfClass(exam.classId) : [];

  useEffect(() => {
    if (examId) {
      const current = examScoresOf(examId);
      setScores(Object.fromEntries(Object.entries(current).map(([k, v]) => [k, String(v)])));
    } else setScores({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  return (
    <div>
      <PageHeader title="آزمون‌ها و نمرات" subtitle="ثبت آزمون و درج نمرات — پیش‌بینی‌ها بلافاصله به‌روزرسانی می‌شوند" />
      <Card title="ثبت آزمون جدید">
        <div className="grid gap-3 md:grid-cols-5">
          <Field label="نام آزمون">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="آزمون نیم‌ترم" />
          </Field>
          <Field label="درس">
            <Select value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
              <option value="">انتخاب…</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="کلاس">
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">انتخاب…</option>
              {classes.map((c) => (
                <option key={c.classId} value={c.classId}>{c.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="تاریخ">
            <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() => {
                if (!name.trim() || !lessonId || !classId) return notify.error("فیلدها را کامل کنید");
                const id = addExam(name.trim(), lessonId, classId, date, teacher?.sub ?? "", teacher?.name ?? "دبیر");
                const label = `${name} — ${classes.find((c) => c.classId === classId)?.label ?? ""}`;
                setCreated((prev) => [...prev, { id, lessonId, classId, label }]);
                setName("");
                notify.success("آزمون ثبت شد");
                onSaved();
              }}
            >
              ثبت آزمون
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="فهرست آزمون‌ها">
          <div className="space-y-2">
            {created.length === 0 && <p className="text-[12px] text-slate-500">با ثبت آزمون جدید، اینجا نمایش داده می‌شود.</p>}
            {created.map((e) => (
              <button
                key={e.id}
                onClick={() => setExamId(e.id)}
                className={cn(
                  "w-full rounded-xl border px-4 py-3 text-right text-[13px] transition cursor-pointer",
                  examId === e.id ? "border-blue-500/50 bg-blue-500/10 text-blue-200" : "border-slate-700/50 bg-[#0b1222] text-slate-300 hover:border-slate-600",
                )}
              >
                {e.label}
              </button>
            ))}
          </div>
        </Card>

        <Card title={exam ? `درج نمرات — ${exam.label}` : "درج نمرات"} subtitle={exam ? "نمره هر دانش‌آموز از ۲۰" : "ابتدا یک آزمون انتخاب کنید"}>
          {!exam ? (
            <EmptyState icon={<BookOpen size={22} />} title="آزمونی انتخاب نشده است" />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2">
                {students.map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="min-w-32 flex-1 text-[13px] text-slate-200">{s.fullName}</span>
                    <Input dir="ltr" type="number" min={0} max={20} step={0.5} value={scores[s.id] ?? ""} onChange={(e) => setScores((prev) => ({ ...prev, [s.id]: e.target.value }))} className="max-w-24 text-center" placeholder="—" />
                  </div>
                ))}
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  const clean: Record<string, number> = {};
                  for (const [k, v] of Object.entries(scores)) if (v !== "" && !Number.isNaN(Number(v))) clean[k] = Number(v);
                  saveExamScores(exam.id, clean, teacher?.name ?? "دبیر");
                  notify.success("نمرات ذخیره و تحلیل‌ها به‌روزرسانی شد");
                  onSaved();
                }}
              >
                ذخیره نمرات
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ================= behavior ================= */

function Behavior({ assignments, onSaved }: { assignments: AssignView[]; onSaved: () => void }) {
  const teacher = useSession().session;
  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState<"positive" | "negative">("positive");
  const [note, setNote] = useState("");
  const allStudents = assignments.flatMap((a) => a.students.map((s) => ({ ...s, classLabel: a.classLabel })));

  return (
    <div>
      <PageHeader title="گزارش‌های رفتاری" subtitle="گزارش مثبت/منفی مستقیماً در ریسک‌اسکور دانش‌آموز اعمال می‌شود" />
      <Card title="ثبت گزارش جدید">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="دانش‌آموز">
            <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">انتخاب…</option>
              {allStudents.map((s) => (
                <option key={`${s.id}-${s.classLabel}`} value={s.id}>
                  {s.name} — {s.classLabel}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="نوع گزارش">
            <div className="flex gap-2">
              <Button variant={type === "positive" ? "success" : "ghost"} onClick={() => setType("positive")} className="flex-1">
                مثبت
              </Button>
              <Button variant={type === "negative" ? "danger" : "ghost"} onClick={() => setType("negative")} className="flex-1">
                منفی
              </Button>
            </div>
          </Field>
          <Field label="توضیح">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً: مشارکت فعال در بحث کلاس" />
          </Field>
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() => {
                if (!studentId || !note.trim()) return notify.error("دانش‌آموز و توضیح را انتخاب کنید");
                addBehavior(studentId, type, note.trim(), teacher?.sub ?? "", teacher?.name ?? "دبیر");
                setNote("");
                notify.success("گزارش رفتاری ثبت شد");
                onSaved();
              }}
            >
              ثبت گزارش
            </Button>
          </div>
        </div>
      </Card>
      <p className="mt-4 text-[12px] text-slate-500">
        فهرست کامل گزارش‌های هر دانش‌آموز در <b className="text-slate-300">گزارش هوشمند</b> او (بخش دانش‌آموزان من) قابل مشاهده است.
      </p>
    </div>
  );
}

/* ================= my students ================= */

function MyStudents({ data, onOpenReport }: { data: TeacherHomeData; onOpenReport: (id: string) => void }) {
  const rows = data.classes.flatMap((c) => c.students.map((s) => ({ ...s, classLabel: c.classLabel })));
  return (
    <div>
      <PageHeader title="دانش‌آموزان من" subtitle={`${faNum(rows.length)} نفر — مرتب‌شده بر اساس ریسک`} />
      <div className="card-surface overflow-x-auto">
        <table className="w-full min-w-[680px] text-right">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] text-slate-500">
              <th className="px-4 py-3 font-medium">نام</th>
              <th className="px-4 py-3 font-medium">کلاس</th>
              <th className="px-4 py-3 font-medium">ریسک</th>
              <th className="px-4 py-3 font-medium">میانگین</th>
              <th className="px-4 py-3 font-medium">سطح</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {[...rows]
              .sort((a, b) => b.risk - a.risk)
              .map((s) => (
                <tr key={`${s.id}-${s.classLabel}`} className="border-b border-slate-800/50 text-[13px] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-slate-200">{s.name}</td>
                  <td className="px-4 py-3 text-slate-400">{s.classLabel}</td>
                  <td className="px-4 py-3"><RiskBar score={s.risk} /></td>
                  <td className="px-4 py-3 text-slate-300">{faNum(s.avg, 1)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={riskTone(s.risk)}>{riskLevelLabel(s.level)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="outline" className="px-3 py-1.5 text-[12px]" onClick={() => onOpenReport(s.id)}>
                      گزارش هوشمند
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-4 py-8 text-center text-[12px] text-slate-500">دانش‌آموزی در کلاس‌های شما نیست.</p>}
      </div>
    </div>
  );
}
