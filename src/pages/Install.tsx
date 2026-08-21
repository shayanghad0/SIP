import { BookOpen, BrainCircuit, Check, ChevronLeft, ChevronRight, Download, GraduationCap, HelpCircle, KeyRound, Plus, ShieldCheck, Trash2, Users, UserPlus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AccessRecord, InstallPayload, InstallStudent, InstallTeacher, Role } from "../lib/types";
import { install } from "../lib/api";
import { generatePassword, validatePassword } from "../lib/auth";
import { faNum } from "../lib/format";
import { Badge, Button, Field, Input, notify, Select } from "../components/ui";
import { cn } from "../utils/cn";

const STEPS = [
  { key: "admin", label: "مدیر", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
      <path d="M6 10h12l1 10H5L6 10z" />
      <circle cx="12" cy="6" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ) },
  { key: "grades", label: "پایه‌ها", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <rect x="3" y="4" width="18" height="5" rx="1.5" />
      <rect x="5" y="10" width="14" height="5" rx="1.5" />
      <rect x="7" y="16" width="10" height="4" rx="1.5" />
    </svg>
  ) },
  { key: "classes", label: "کلاس‌ها", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <rect x="2" y="2" width="9" height="9" rx="2" />
      <rect x="13" y="2" width="9" height="9" rx="2" />
      <rect x="2" y="13" width="9" height="9" rx="2" />
      <rect x="13" y="13" width="9" height="9" rx="2" />
    </svg>
  ) },
  { key: "lessons", label: "دروس", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="9" y1="7" x2="16" y2="7" />
      <line x1="9" y1="11" x2="14" y2="11" />
    </svg>
  ) },
  { key: "consultant", label: "مشاور و ناظم", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
      <circle cx="12" cy="12" r="3" strokeWidth="1.2" />
    </svg>
  ) },
  { key: "students", label: "دانش‌آموزان", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ) },
  { key: "teachers", label: "دبیران", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" />
    </svg>
  ) },
  { key: "finish", label: "کدهای دسترسی", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round">
    <path d="M12 3v11"/>
    <path d="M7 10l5 5 5-5"/>
    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>
</svg>

  ) },
];

const STEP_GUIDES: Record<string, { title: string; what: string; why: string; how: string[] }> = {
  admin: {
    title: "ایجاد حساب مدیر",
    what: "در این مرحله حساب مدیر کل سامانه را می‌سازید. مدیر بالاترین سطح دسترسی را دارد و می‌تواند تمام بخش‌های سامانه را مدیریت کند.",
    why: "بدون حساب مدیر، سامانه قابل استفاده نیست. مدیر مسئول ایجاد پایه‌ها، کلاس‌ها، دروس و سایر کاربران است.",
    how: ["نام مدرسه را وارد کنید", "نام و نام خانوادگی خود را به‌عنوان مدیر وارد کنید", "یک نام کاربری منحصر به فرد انتخاب کنید (مثلاً: admin)", "رمز عبور قوی با حداقل ۶ کاراکتر وارد کنید", "رمز عبور را دوباره تایید کنید", "روی دکمه «ثبت مدیر» کلیک کنید"],
  },
  grades: {
    title: "پایه‌های تحصیلی",
    what: "پایه‌های تحصیلی مدرسه را تعریف می‌کنید. مثلاً: پایه هفتم، پایه هشتم، پایه نهم.",
    why: "هر دانش‌آموز باید به یک پایه اختصاص داده شود. پایه‌ها برای دسته‌بندی کلاس‌ها و تحلیل عملکرد استفاده می‌شوند.",
    how: ["حداقل ۲ پایه اضافه کنید", "از دکمه‌های سریع (+ پایه ۱، + پایه ۲ و...) استفاده کنید یا نام دلخواه تایپ کنید", "برای حذف پایه، آیکون سطل زباله را بزنید", "نام پایه‌ها می‌تواند به‌صورت «هفتم»، «هشتم» یا «پایه ۱»، «پایه ۲» باشد"],
  },
  classes: {
    title: "کلاس‌های هر پایه",
    what: "برای هر پایه تحصیلی، کلاس‌های مربوطه را تعریف می‌کنید. مثلاً: پایه هفتم — کلاس ۱، کلاس ۲، کلاس ۳.",
    why: "دانش‌آموزان در کلاس‌ها دسته‌بندی می‌شوند. دبیران به کلاس‌های خاصی اختصاص داده می‌شوند و حضور و غیاب بر اساس کلاس ثبت می‌شود.",
    how: ["برای هر پایه حداقل یک کلاس اضافه کنید", "نام کلاس‌ها را ویرایش کنید (مثلاً: کلاس ۱ را به «الف» تغییر دهید)", "با دکمه «افزودن کلاس» کلاس جدید اضافه کنید", "برای حذف کلاس، آیکون سطل زباله را بزنید"],
  },
  lessons: {
    title: "دروس تحصیلی",
    what: "دروسی که در مدرسه تدریس می‌شوند را اضافه می‌کنید و برای هر درس یک امتیاز اهمیت (۳ تا ۱۰) تعیین می‌کنید.",
    why: "دروس برای اختصاص دبیران به کلاس‌ها، ثبت نمرات و محاسبه ریسک دانش‌آموزان استفاده می‌شوند. امتیاز اهمیت در محاسبه ریسک و برنامه مطالعاتی نقش دارد.",
    how: ["از دروس پیش‌فرض (ریاضی، فیزیک، شیمی و...) استفاده کنید یا درس جدید اضافه کنید", "برای هر درس امتیاز اهمیت را با نوار لغزنده تنظیم کنید (۱۰ = بیشترین اهمیت)", "این مرحله اختیاری است — می‌توانید بعداً از بخش تنظیمات دروس را اضافه کنید"],
  },
  consultant: {
    title: "حساب مشاور و ناظم",
    what: "یک یا چند حساب برای مشاوران و ناظمان مدرسه ایجاد می‌کنید.",
    why: "مشاوران و ناظمان دانش‌آموزان پرخطر را پایش می‌کنند، فرم‌های سلامت روان را بررسی می‌کنند و گزارش مشاوره ثبت می‌کنند. دسترسی آن‌ها فقط به دانش‌آموزان پرخطر است.",
    how: ["نام و نام خانوادگی مشاور/ناظم را وارد کنید", "یک نام کاربری منحصر به فرد انتخاب کنید", "رمز عبور قوی وارد کنید", "می‌توانید چندین مشاور/ناظم اضافه کنید", "حداقل یک مشاور الزامی است"],
  },
  students: {
    title: "دانش‌آموزان",
    what: "دانش‌آموزان مدرسه را یکی‌یکی اضافه می‌کنید و هر کدام را به یک پایه و کلاس اختصاص می‌دهید. این مرحله اختیاری است.",
    why: "برای هر دانش‌آموز به‌صورت خودکار حساب والدین نیز ساخته می‌شود. دانش‌آموزان واحد اصلی سامانه هستند — نمرات، حضور و غیاب، تکالیف و تحلیل ریسک برای آن‌ها ثبت می‌شود. اگر فعلاً دانش‌آموزی ندارید، می‌توانید این مرحله را رد کنید.",
    how: ["نام و نام خانوادگی، نام کاربری و رمز عبور را وارد کنید", "پایه و کلاس مربوطه را انتخاب کنید", "اطلاعات اختیاری (کد ملی، نام پدر و مادر، تلفن) را پر کنید", "برای تولید رمز تصادفی روی «رمز تصادفی» کلیک کنید", "این مرحله اختیاری است — می‌توانید آن را رد کنید"],
  },
  teachers: {
    title: "دبیران",
    what: "دبیران مدرسه را اضافه می‌کنید و برای هر دبیر مشخص می‌کنید چه درسی را در چه کلاس‌هایی تدریس می‌کند. این مرحله اختیاری است.",
    why: "دبیران حضور و غیاب، نمرات و گزارش‌های رفتاری دانش‌آموزان کلاس‌های خود را ثبت می‌کنند. اختصاص درس به دبیر برای تحلیل عملکرد کارآموزی دبیران ضروری است. اگر فعلاً دبیری ندارید، می‌توانید این مرحله را رد کنید.",
    how: ["نام و نام خانوادگی، نام کاربری و رمز عبور دبیر را وارد کنید", "درس، پایه و کلاس مربوطه را انتخاب کنید و روی «افزودن تدریس» بزنید", "هر دبیر می‌تواند چندین درس در چندین کلاس تدریس کند", "این مرحله اختیاری است — می‌توانید آن را رد کنید"],
  },
  finish: {
    title: "کدهای دسترسی",
    what: "در این مرحله نصب تکمیل می‌شود. سامانه کدهای دسترسی منحصر به فرد برای تمام کاربران تولید می‌کند.",
    why: "هر کاربر برای ورود به سامانه به کد دسترسی نیاز دارد. این کدها در فایل‌های JSON ذخیره می‌شوند و برای ورود استفاده می‌شوند.",
    how: ["روی «پایان نصب و تولید کدها» کلیک کنید", "کدهای تولید شده را برای هر کاربر ذخیره کنید", "روی «ورود به سامانه» بزنید تا وارد شوید", "دانش‌آموزان و دبیران اختیاری هستند — بعداً می‌توانید آن‌ها را اضافه کنید"],
  },
};

interface AdminForm {
  fullName: string;
  username: string;
  password: string;
  confirm: string;
}

interface EntryForm {
  fullName: string;
  username: string;
  password: string;
}

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        dir="ltr"
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
      >
        {show ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

export default function InstallWizard() {
  const [step, setStep] = useState(0);
  const [admin, setAdmin] = useState({ fullName: "", username: "", password: "" });
  const [schoolName, setSchoolName] = useState("مدرسه نمونه خوارزمی");
  const [gradeNames, setGradeNames] = useState<string[]>(["پایه ۱", "پایه ۲"]);
  const [classNames, setClassNames] = useState<string[][]>([["کلاس ۱", "کلاس ۲"], ["کلاس ۱", "کلاس ۲"]]);
  const [lessons, setLessons] = useState<{ name: string; importance: number }[]>([]);
  const [consultants, setConsultants] = useState<{ fullName: string; username: string; password: string }[]>([]);
  const [students, setStudents] = useState<InstallStudent[]>([]);
  const [teachers, setTeachers] = useState<InstallTeacher[]>([]);
  const [busy, setBusy] = useState(false);
  const [records, setRecords] = useState<AccessRecord[] | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);

  const navigate = useNavigate();

  const uniqueUsernames = () => {
    const all = [admin.username, ...consultants.map((c) => c.username), ...students.map((s) => s.username), ...teachers.map((t) => t.username)].filter(Boolean);
    const set = new Set(all.map((u) => u.toLowerCase()));
    return set.size === all.length;
  };

  function next() {
    switch (step) {
      case 0:
        if (!admin.fullName.trim() || !admin.username.trim() || !admin.password) return notify.error("فیلدهای مدیر را کامل کنید");
        if (admin.password.length < 6) return notify.error("رمز عبور باید حداقل ۶ کاراکتر باشد");
        return setStep(1);
      case 1:
        if (gradeNames.length < 2) return notify.error("حداقل ۲ پایه لازم است");
        return setStep(2);
      case 2:
        if (gradeNames.some((_, i) => (classNames[i] ?? []).length < 1)) return notify.error("هر پایه حداقل یک کلاس باید داشته باشد");
        if (!uniqueUsernames()) return notify.error("نام کاربری تکراری وجود دارد");
        return setStep(3);
      case 3:
        if (lessons.some((l) => !l.name.trim())) return notify.error("نام درس خالی است");
        if (lessons.some((l) => l.importance < 3)) return notify.error("حداقل اهمیت درس ۳ است");
        return setStep(4);
      case 4:
        if (consultants.length < 1) return notify.error("حداقل یک مشاور/ناظم ثبت کنید");
        if (!uniqueUsernames()) return notify.error("نام کاربری تکراری وجود دارد");
        return setStep(5);
      case 5:
        if (!uniqueUsernames()) return notify.error("نام کاربری تکراری وجود دارد");
        return setStep(6);
      case 6:
        if (!uniqueUsernames()) return notify.error("نام کاربری تکراری وجود دارد");
        return setStep(7);
      default:
        return;
    }
  }

  function downloadCSV(records: AccessRecord[]) {
    const BOM = "\uFEFF";
    const header = "ID,Full Name,Username,Password,Role";
    const rows = records.map((r, i) => `${i + 1},"${r.name}","${r.username}","${r.password}","${r.roleLabel}"`);
    const csv = BOM + header + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sip-access-codes-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function finish() {
    setBusy(true);
    const payload: InstallPayload = { schoolName, admin, gradeNames, classNames, lessons, consultants, students, teachers, loadDemo: false };
    try {
      const result = await install(payload);
      setRecords(result.records);
      downloadCSV(result.records);
      setShowSuccess(true);
      setLoadingPhase(0);
      setTimeout(() => setLoadingPhase(1), 10000);
      setTimeout(() => {
        window.location.reload();
      }, 15000);
    } catch {
      notify.error("خطا در نصب — دوباره تلاش کنید");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-md">
          {loadingPhase === 0 ? (
            /* Phase 1: Luma Spin + Progress */
            <div className="flex flex-col items-center gap-6 animate-fade-in-up">
              {/* Luma Spin */}
              <div className="relative h-20 w-20">
                <div className="absolute inset-0 animate-luma-spin">
                  <svg viewBox="0 0 80 80" fill="none" className="h-20 w-20">
                    <circle cx="40" cy="40" r="36" stroke="url(#luma-grad)" strokeWidth="4" strokeLinecap="round" strokeDasharray="180 80" />
                    <defs>
                      <linearGradient id="luma-grad" x1="0" y1="0" x2="80" y2="80">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30 animate-pulse-glow" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-slate-100">در حال نصب سامانه...</h2>
              <p className="text-sm text-slate-400">لطفاً صبر کنید — اطلاعات در حال ذخیره‌سازی است</p>
              {/* Progress bar */}
              <div className="h-1.5 w-72 overflow-hidden rounded-full bg-slate-700/60">
                <div className="h-full animate-progress-10s rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500" />
              </div>
              <p className="text-xs text-slate-500">حداکثر ۱۰ ثانیه</p>
            </div>
          ) : (
            /* Phase 2: Orbit + Complete */
            <div className="flex flex-col items-center gap-8 animate-fade-in-up">
              {/* Orbit Animation */}
              <div className="relative h-64 w-64">
                {/* Center logo */}
                <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-xl shadow-blue-600/40 animate-pulse-glow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
                      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
                      <path d="M9 13a4.5 4.5 0 0 0 3-4"/>
                      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/>
                      <path d="M3.477 10.896a4 4 0 0 1 .585-.396"/>
                      <path d="M6 18a4 4 0 0 1-1.967-.516"/>
                      <path d="M12 13h4"/>
                      <path d="M12 18h6a2 2 0 0 1 2 2v1"/>
                      <path d="M12 8h8"/>
                      <path d="M16 8V5a2 2 0 0 1 2-2"/>
                      <circle cx="16" cy="13" r=".5"/>
                      <circle cx="18" cy="3" r=".5"/>
                      <circle cx="20" cy="21" r=".5"/>
                      <circle cx="20" cy="8" r=".5"/>
                    </svg>
                  </div>
                </div>
                {/* Orbit ring 1 — inner */}
                <div className="absolute inset-8 animate-orbit-1">
                  <div className="relative h-full w-full">
                    {[0, 90, 180, 270].map((deg) => (
                      <div key={deg} className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" style={{ transform: `rotate(${deg}deg) translateY(-96px) rotate(-${deg}deg)` }}>
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800/80 border border-slate-700/50 shadow-lg">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                            <path d="M6 10h12l1 10H5L6 10z" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Orbit ring 2 — middle */}
                <div className="absolute inset-2 animate-orbit-2">
                  <div className="relative h-full w-full">
                    {[45, 135, 225, 315].map((deg) => (
                      <div key={deg} className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" style={{ transform: `rotate(${deg}deg) translateY(-120px) rotate(-${deg}deg)` }}>
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800/80 border border-slate-700/50 shadow-lg">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <rect x="3" y="4" width="18" height="5" rx="1.5" />
                            <rect x="5" y="10" width="14" height="5" rx="1.5" />
                            <rect x="7" y="16" width="10" height="4" rx="1.5" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Orbit ring 3 — outer */}
                <div className="absolute -inset-4 animate-orbit-3">
                  <div className="relative h-full w-full">
                    {[0, 60, 120, 180, 240, 300].map((deg) => (
                      <div key={deg} className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" style={{ transform: `rotate(${deg}deg) translateY(-148px) rotate(-${deg}deg)` }}>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/80 border border-slate-700/50 shadow-lg">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Orbit ring lines (decorative) */}
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 256 256">
                  <circle cx="128" cy="128" r="80" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="1" strokeDasharray="4 4" />
                  <circle cx="128" cy="128" r="104" fill="none" stroke="rgba(139,92,246,0.12)" strokeWidth="1" strokeDasharray="4 4" />
                  <circle cx="128" cy="128" r="128" fill="none" stroke="rgba(6,182,212,0.1)" strokeWidth="1" strokeDasharray="4 4" />
                </svg>
              </div>
              {/* Text */}
              <div className="text-center">
                <h2 className="mb-2 text-2xl font-bold text-emerald-400">نصب با موفقیت انجام شد!</h2>
                <p className="text-sm text-slate-300">سامانه هوشمند مدارس (SIP) آماده است</p>
              </div>
              <div className="h-1 w-48 overflow-hidden rounded-full bg-slate-700">
                <div className="h-full w-full animate-loading-bar bg-gradient-to-r from-emerald-400 to-green-500" />
              </div>
              <p className="text-xs text-slate-400">۵ ثانیه دیگر صفحه رفرش می‌شود...</p>
            </div>
          )}
        </div>
      )}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/30">
          <BrainCircuit size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-50">نصب سامانه هوشمند مدارس (SIP)</h1>
          <p className="text-[12px] text-slate-400">{schoolName} — پیکربندی اولیه در ۸ مرحله</p>
        </div>
        <button
          onClick={() => setShowGuide((g) => !g)}
          className={cn(
            "mr-auto flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
            showGuide
              ? "border-blue-500/50 bg-blue-600/20 text-blue-300"
              : "border-slate-700/60 bg-white/5 text-slate-400 hover:border-blue-500/40 hover:text-blue-300"
          )}
        >
          <HelpCircle size={14} />
          راهنما
        </button>
      </div>

      {/* stepper */}
      <div className="mb-8 flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <button
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] transition",
                i === step
                  ? "border-blue-500/50 bg-blue-600/20 text-blue-200"
                  : i < step
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 cursor-pointer"
                    : "border-slate-700/60 bg-white/5 text-slate-500",
              )}
            >
              <span className={cn("flex h-5 w-5 items-center justify-center rounded-full", i === step ? "bg-blue-600 text-white" : i < step ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700/50 text-slate-500")}>
                {i < step ? <Check size={11} /> : s.icon}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && <div className={cn("h-px w-4", i < step ? "bg-emerald-500/40" : "bg-slate-700/50")} />}
          </div>
        ))}
      </div>

      {/* guide panel */}
      {showGuide && (
        <div className="mb-6 rounded-2xl border border-blue-500/25 bg-blue-500/5 p-5 anim-fade-up">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15">
                <HelpCircle size={15} className="text-blue-400" />
              </div>
              <h3 className="text-[14px] font-semibold text-blue-200">{STEP_GUIDES[STEPS[step].key].title}</h3>
            </div>
            <button onClick={() => setShowGuide(false)} className="rounded-lg p-1 text-slate-500 hover:text-slate-300 cursor-pointer">
              <X size={15} />
            </button>
          </div>
          <div className="space-y-3 text-[12px] leading-6">
            <div>
              <span className="mb-1 block font-semibold text-blue-300">این مرحله چیست؟</span>
              <p className="text-slate-400">{STEP_GUIDES[STEPS[step].key].what}</p>
            </div>
            <div>
              <span className="mb-1 block font-semibold text-blue-300">چرا ضروری است؟</span>
              <p className="text-slate-400">{STEP_GUIDES[STEPS[step].key].why}</p>
            </div>
            <div>
              <span className="mb-1 block font-semibold text-blue-300">چگونه انجام دهیم؟</span>
              <ol className="mr-4 list-decimal space-y-1 text-slate-400">
                {STEP_GUIDES[STEPS[step].key].how.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      <div className="card-surface p-6 anim-fade-up" key={step}>
        {step === 0 && <StepAdmin schoolName={schoolName} setSchoolName={setSchoolName} admin={admin} onDone={setAdmin} />}
        {step === 1 && (
          <StepGrades
            grades={gradeNames}
            onChange={(g) => {
              setGradeNames(g);
              setClassNames((prev) => g.map((_, i) => prev[i] ?? ["کلاس ۱", "کلاس ۲"]));
            }}
          />
        )}
        {step === 2 && <StepClasses gradeNames={gradeNames} classNames={classNames} setClassNames={setClassNames} />}
        {step === 3 && (
          <StepLessons
            lessons={lessons}
            setLessons={setLessons}
            onSkip={() => {
              setLessons([]);
              notify.info("مرحله دروس رد شد — بعداً می‌توانید دروس را اضافه کنید");
              setStep(4);
            }}
          />
        )}
        {step === 4 && <StepConsultants items={consultants} setItems={setConsultants} />}
        {step === 5 && (
          <StepStudents
            items={students}
            setItems={setStudents}
            gradeNames={gradeNames}
            classNames={classNames}
            takenUsernames={[admin.username, ...consultants.map((c) => c.username), ...teachers.map((t) => t.username)]}
            onSkip={() => { setStudents([]); setStep(6); }}
          />
        )}
        {step === 6 && (
          <StepTeachers
            items={teachers}
            setItems={setTeachers}
            lessons={lessons}
            gradeNames={gradeNames}
            classNames={classNames}
            takenUsernames={[admin.username, ...consultants.map((c) => c.username), ...students.map((s) => s.username)]}
            onSkip={() => { setTeachers([]); setStep(7); }}
          />
        )}
        {step === 7 &&
          (records ? (
            <FinishPanel records={records} onDownload={() => downloadCSV(records)} />
          ) : (
            <div className="space-y-5">
              <div>
                <h3 className="mb-1 text-[15px] font-semibold text-slate-100">اتمام نصب</h3>
                <p className="text-[13px] leading-6 text-slate-400">
                  با ادامه، کدهای دسترسی برای مدیر، دبیران، مشاوران، والدین و دانش‌آموزان تولید و داده‌های اولیه در فایل‌های JSON ذخیره می‌شوند.
                </p>
              </div>
            </div>
          ))}

        {/* footer nav */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-800/70 pt-5">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || !!records}>
            <ChevronRight size={15} /> مرحله قبل
          </Button>
          {step < 7 ? (
            <Button onClick={next}>
              ادامه <ChevronLeft size={15} />
            </Button>
          ) : (
            !records && (
              <Button variant="success" loading={busy} onClick={finish}>
                <KeyRound size={15} /> پایان نصب و تولید کدها
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= step 1 — admin ================= */

function StepAdmin({ schoolName, setSchoolName, admin, onDone }: { schoolName: string; setSchoolName: (v: string) => void; admin: { fullName: string; username: string; password: string }; onDone: (a: { fullName: string; username: string; password: string }) => void }) {
  const [confirm, setConfirm] = useState("");
  const [confirmErr, setConfirmErr] = useState(false);
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1 flex items-center gap-2 text-[15px] font-semibold text-slate-100"><ShieldCheck size={17} className="text-blue-400" /> ایجاد حساب مدیر</h3>
        <p className="text-[12px] text-slate-500">حساب مدیر کل سامانه را مدیریت می‌کند. رمز عبور با الگوریتم SHA-256 و Salt ذخیره می‌شود.</p>
      </div>
      <Field label="نام مدرسه">
        <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="مثلاً: مدرسه نمونه خوارزمی" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="نام و نام خانوادگی مدیر">
          <Input value={admin.fullName} onChange={(e) => onDone({ ...admin, fullName: e.target.value })} placeholder="مثلاً: علی رضایی" />
        </Field>
        <Field label="نام کاربری">
          <Input dir="ltr" value={admin.username} onChange={(e) => onDone({ ...admin, username: e.target.value })} placeholder="admin" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="رمز عبور">
          <PasswordInput value={admin.password} onChange={(v) => onDone({ ...admin, password: v })} placeholder="حداقل ۶ کاراکتر" />
        </Field>
        <Field label="تأیید رمز عبور" error={confirmErr ? "رمز عبور یکسان نیست" : undefined}>
          <PasswordInput value={confirm} onChange={(v) => { setConfirm(v); setConfirmErr(v.length > 0 && v !== admin.password); }} placeholder="دوباره رمز را وارد کنید" />
        </Field>
      </div>
    </div>
  );
}

/* ================= step 2 — grades ================= */

function StepGrades({ grades, onChange }: { grades: string[]; onChange: (g: string[]) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <h3 className="mb-1 flex items-center gap-2 text-[15px] font-semibold text-slate-100"><GraduationCap size={17} className="text-blue-400" /> پایه‌های تحصیلی</h3>
      <p className="mb-4 text-[12px] text-slate-500">حداقل ۲ پایه لازم است. پایه‌ها را به‌صورت نام دلخواه اضافه کنید.</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <button key={n} type="button" onClick={() => !grades.includes(`پایه ${faNum(n)}`) && onChange([...grades, `پایه ${faNum(n)}`])} className="rounded-full border border-slate-700/60 bg-white/5 px-3 py-1 text-[12px] text-slate-300 transition hover:border-blue-500/50 hover:text-blue-300 cursor-pointer">
            + پایه {faNum(n)}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {grades.map((g, i) => (
          <div key={`${g}-${i}`} className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-[#0b1222] px-4 py-2.5">
            <span className="text-[13px] font-medium text-slate-200">{g}</span>
            <button type="button" onClick={() => onChange(grades.filter((_, x) => x !== i))} className="mr-auto rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="نام پایه دلخواه…" />
        <Button
          variant="outline"
          onClick={() => {
            if (draft.trim()) {
              onChange([...grades, draft.trim()]);
              setDraft("");
            }
          }}
        >
          <Plus size={15} /> افزودن
        </Button>
      </div>
    </div>
  );
}

/* ================= step 3 — classes ================= */

function StepClasses({ gradeNames, classNames, setClassNames }: { gradeNames: string[]; classNames: string[][]; setClassNames: (c: string[][]) => void }) {
  const update = (gi: number, ci: number | "add", name?: string) => {
    const next = classNames.map((c) => [...c]);
    if (ci === "add") next[gi] = [...next[gi], `کلاس ${faNum(next[gi].length + 1)}`];
    else next[gi][ci] = name ?? "";
    setClassNames(next);
  };
  return (
    <div>
      <h3 className="mb-1 text-[15px] font-semibold text-slate-100">کلاس‌های هر پایه</h3>
      <p className="mb-4 text-[12px] text-slate-500">هر پایه می‌تواند تعداد نامحدود کلاس داشته باشد.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {gradeNames.map((g, gi) => (
          <div key={g} className="rounded-xl border border-slate-700/50 bg-[#0b1222] p-4">
            <p className="mb-3 text-[13px] font-semibold text-blue-300">{g}</p>
            <div className="space-y-2">
              {(classNames[gi] ?? []).map((c, ci) => (
                <div key={ci} className="flex items-center gap-2">
                  <Input value={c} onChange={(e) => update(gi, ci, e.target.value)} />
                  <button type="button" onClick={() => setClassNames(classNames.map((arr, x) => (x === gi ? arr.filter((_, y) => y !== ci) : arr)))} className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => update(gi, "add")} className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-blue-400 hover:text-blue-300 cursor-pointer">
              <Plus size={14} /> افزودن کلاس
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= step 4 — lessons ================= */

function StepLessons({ lessons, setLessons, onSkip }: { lessons: { name: string; importance: number }[]; setLessons: (l: { name: string; importance: number }[]) => void; onSkip: () => void }) {
  const [name, setName] = useState("");
  const [imp, setImp] = useState(8);
  const presets: [string, number][] = [["ریاضی", 10], ["فیزیک", 9], ["شیمی", 9], ["فارسی", 8], ["انگلیسی", 7], ["تاریخ", 5]];
  return (
    <div>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="mb-1 flex items-center gap-2 text-[15px] font-semibold text-slate-100"><BookOpen size={17} className="text-blue-400" /> دروس تحصیلی</h3>
          <p className="text-[12px] text-slate-500">هر درس یک امتیاز اهمیت بین ۳ تا ۱۰ دارد که در محاسبه ریسک و برنامه مطالعاتی استفاده می‌شود.</p>
        </div>
        <Button variant="outline" onClick={onSkip}>رد کردن این مرحله</Button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {presets.map(([n, i]) => (
          <button key={n} type="button" onClick={() => !lessons.some((l) => l.name === n) && setLessons([...lessons, { name: n, importance: i }])} className="rounded-full border border-slate-700/60 bg-white/5 px-3 py-1 text-[12px] text-slate-300 hover:border-blue-500/50 hover:text-blue-300 cursor-pointer">
            + {n} ({faNum(i)})
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="نام درس">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: زیست‌شناسی" />
        </Field>
        <div className="w-44">
          <Field label={`امتیاز اهمیت: ${faNum(imp)}`}>
            <input type="range" min={3} max={10} value={imp} onChange={(e) => setImp(Number(e.target.value))} className="w-full" />
          </Field>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            if (name.trim()) {
              setLessons([...lessons, { name: name.trim(), importance: imp }]);
              setName("");
            }
          }}
        >
          <Plus size={15} /> افزودن درس
        </Button>
      </div>
      <div className="space-y-2">
        {lessons.map((l, i) => (
          <div key={`${l.name}-${i}`} className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-[#0b1222] px-4 py-2.5">
            <span className="text-[13px] text-slate-200">{l.name}</span>
            <div className="mr-4 flex-1">
              <input type="range" min={3} max={10} value={l.importance} onChange={(e) => setLessons(lessons.map((x, xi) => (xi === i ? { ...x, importance: Number(e.target.value) } : x)))} className="w-full max-w-40" />
            </div>
            <Badge tone="blue">{faNum(l.importance)} / ۱۰</Badge>
            <button type="button" onClick={() => setLessons(lessons.filter((_, xi) => xi !== i))} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {lessons.length === 0 && <p className="rounded-xl border border-dashed border-slate-700/60 py-4 text-center text-[12px] text-slate-500">هنوز درسی اضافه نشده است</p>}
      </div>
    </div>
  );
}

/* ================= step 5 — consultants ================= */

interface EntryRec {
  fullName: string;
  username: string;
  password: string;
}

function EntryList({ items, setItems, title, desc }: { items: EntryRec[]; setItems: (i: EntryRec[]) => void; title: string; desc: string }) {
  const { register, handleSubmit, reset, watch, setValue } = useForm<EntryForm>({ defaultValues: { fullName: "", username: "", password: "" } });
  const taken = items.map((i) => i.username.toLowerCase());
  const pwdValue = watch("password");
  return (
    <div>
      <h3 className="mb-1 flex items-center gap-2 text-[15px] font-semibold text-slate-100"><UserPlus size={17} className="text-blue-400" /> {title}</h3>
      <p className="mb-4 text-[12px] text-slate-500">{desc}</p>
      <form
        onSubmit={handleSubmit((v) => {
          if (!v.fullName.trim() || !v.username.trim()) return notify.error("نام و نام کاربری را وارد کنید");
          if (validatePassword(v.password)) return notify.error("رمز عبور ضعیف است");
          if (taken.includes(v.username.toLowerCase())) return notify.error("این نام کاربری قبلاً استفاده شده است");
          setItems([...items, { fullName: v.fullName.trim(), username: v.username.trim(), password: v.password }]);
          reset({ fullName: "", username: "", password: "" });
        })}
        className="mb-4 grid gap-3 rounded-xl border border-slate-700/50 bg-[#0b1222] p-4 sm:grid-cols-4"
      >
        <Input dir="auto" placeholder="نام و نام خانوادگی" {...register("fullName")} />
        <Input dir="ltr" placeholder="نام کاربری" {...register("username")} />
        <PasswordInput value={pwdValue} onChange={(v) => setValue("password", v, { shouldValidate: true })} placeholder="رمز عبور" />
        <Button type="submit" variant="outline" className="h-fit">
          <Plus size={15} /> ثبت
        </Button>
      </form>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={`${it.username}-${i}`} className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-[#0b1222] px-4 py-2.5 text-[13px]">
            <Users size={14} className="text-blue-400" />
            <span className="text-slate-200">{it.fullName}</span>
            <span dir="ltr" className="text-[12px] text-slate-500">{it.username}</span>
            <button type="button" onClick={() => setItems(items.filter((_, xi) => xi !== i))} className="mr-auto rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="rounded-xl border border-dashed border-slate-700/60 py-4 text-center text-[12px] text-slate-500">هنوز ثبت نشده است</p>}
      </div>
    </div>
  );
}

function StepConsultants({ items, setItems }: { items: { fullName: string; username: string; password: string }[]; setItems: (i: { fullName: string; username: string; password: string }[]) => void }) {
  return <EntryList items={items} setItems={setItems} title="مشاور و ناظم مدرسه" desc="حساب مشاور/ناظم برای پایش سلامت روان و دانش‌آموزان پرخطر ساخته می‌شود." />;
}

/* ================= step 6 — students ================= */

function StepStudents({
  items,
  setItems,
  gradeNames,
  classNames,
  takenUsernames,
  onSkip,
}: {
  items: InstallStudent[];
  setItems: (i: InstallStudent[]) => void;
  gradeNames: string[];
  classNames: string[][];
  takenUsernames: string[];
  onSkip: () => void;
}) {
  const [form, setForm] = useState({ fullName: "", username: "", password: "", gradeIdx: 0, classIdx: 0, nationalId: "", fatherName: "", motherName: "", phone: "", emergencyPhone: "" });
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<typeof form>({ defaultValues: form });
  const selGrade = Number(watch("gradeIdx") ?? 0);
  const pwdValue = watch("password");
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-slate-100">دانش‌آموزان</h3>
        <Button variant="outline" onClick={onSkip}>رد کردن این مرحله</Button>
      </div>
      <p className="mb-4 text-[12px] leading-6 text-slate-500">
        برای هر دانش‌آموز به‌صورت خودکار حساب <b className="text-slate-300">والدین</b> با نام کاربری <b className="text-slate-300">parent_نام_کاربری_دانش‌آموز</b> و رمز عبور برابر با رمز مدیر ساخته می‌شود. <span className="text-amber-300/80">(اختیاری)</span>
      </p>
      <form
        onSubmit={handleSubmit((v) => {
          if (!v.fullName.trim() || !v.username.trim()) return notify.error("نام و نام کاربری الزامی است");
          if (validatePassword(v.password)) return notify.error("رمز عبور ضعیف است");
          if (takenUsernames.some((u) => u.toLowerCase() === v.username.toLowerCase())) return notify.error("این نام کاربری قبلاً استفاده شده است");
          setItems([
            ...items,
            { fullName: v.fullName.trim(), username: v.username.trim(), password: v.password, gradeIdx: Number(v.gradeIdx), classIdx: Number(v.classIdx), nationalId: v.nationalId, fatherName: v.fatherName, motherName: v.motherName, phone: v.phone, emergencyPhone: v.emergencyPhone },
          ]);
          reset({ ...form });
        })}
        className="mb-4 grid gap-3 rounded-xl border border-slate-700/50 bg-[#0b1222] p-4 sm:grid-cols-3"
      >
        <Field label="نام و نام خانوادگی" error={errors.fullName ? "الزامی" : undefined}>
          <Input {...register("fullName", { required: true })} />
        </Field>
        <Field label="نام کاربری" error={errors.username ? "الزامی" : undefined}>
          <Input dir="ltr" {...register("username", { required: true, minLength: 3 })} />
        </Field>
        <Field label="رمز عبور" error={errors.password ? "الزامی" : undefined}>
          <PasswordInput value={pwdValue} onChange={(v) => setValue("password", v, { shouldValidate: true })} placeholder="حداقل ۶ کاراکتر" />
        </Field>
        <Field label="پایه">
          <Select {...register("gradeIdx")}>
            {gradeNames.map((g, i) => (
              <option key={i} value={i}>
                {g}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="کلاس">
          <Select {...register("classIdx")}>
            {(classNames[selGrade] ?? classNames[0] ?? []).map((c, i) => (
              <option key={i} value={i}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="کد ملی (اختیاری)">
          <Input dir="ltr" {...register("nationalId")} />
        </Field>
        <Field label="نام پدر">
          <Input {...register("fatherName")} />
        </Field>
        <Field label="نام مادر">
          <Input {...register("motherName")} />
        </Field>
        <Field label="تلفن">
          <Input dir="ltr" {...register("phone")} />
        </Field>
        <Field label="تلفن اضطراری">
          <Input dir="ltr" {...register("emergencyPhone")} />
        </Field>
        <div className="flex items-end gap-2">
          <Button type="submit" className="flex-1">
            <Plus size={15} /> ثبت دانش‌آموز
          </Button>
          <Button type="button" variant="ghost" onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))} title="تولید رمز تصادفی">
            رمز تصادفی
          </Button>
        </div>
      </form>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={`${it.username}-${i}`} className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-[#0b1222] px-4 py-2.5 text-[13px]">
            <Users size={14} className="text-blue-400" />
            <span className="text-slate-200">{it.fullName}</span>
            <Badge tone="blue">
              {gradeNames[it.gradeIdx]} — {classNames[it.gradeIdx]?.[it.classIdx]}
            </Badge>
            <span dir="ltr" className="text-[12px] text-slate-500">{it.username} / {it.password}</span>
            <button type="button" onClick={() => setItems(items.filter((_, xi) => xi !== i))} className="mr-auto rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="rounded-xl border border-dashed border-slate-700/60 py-4 text-center text-[12px] text-slate-500">هنوز دانش‌آموزی ثبت نشده است</p>}
      </div>
    </div>
  );
}

/* ================= step 7 — teachers ================= */

function StepTeachers({
  items,
  setItems,
  lessons,
  gradeNames,
  classNames,
  takenUsernames,
  onSkip,
}: {
  items: InstallTeacher[];
  setItems: (i: InstallTeacher[]) => void;
  lessons: { name: string; importance: number }[];
  gradeNames: string[];
  classNames: string[][];
  takenUsernames: string[];
  onSkip: () => void;
}) {
  const [assign, setAssign] = useState<{ lessonIdx: number; gradeIdx: number; classIdx: number }[]>([]);
  const [draft, setDraft] = useState<{ lessonIdx: number; gradeIdx: number; classIdx: number }>({ lessonIdx: 0, gradeIdx: 0, classIdx: 0 });
  const { register, handleSubmit, reset, watch, setValue } = useForm<EntryForm>({ defaultValues: { fullName: "", username: "", password: "" } });
  const classOptions = classNames[draft.gradeIdx] ?? [];
  const pwdValue = watch("password");
  const addAssignment = () => {
    if (!lessons[draft.lessonIdx]) return notify.error("ابتدا یک درس انتخاب کنید");
    if (!classOptions[draft.classIdx]) return notify.error("ابتدا یک کلاس انتخاب کنید");
    setAssign((a) => [...a, { ...draft }]);
    setDraft((prev) => ({ ...prev, classIdx: 0 }));
  };
  if (lessons.length === 0) {
    return (
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-slate-100">دبیران</h3>
          <Button variant="outline" onClick={onSkip}>رد کردن این مرحله</Button>
        </div>
        <p className="text-[12px] leading-6 text-amber-300/90">
          چون مرحله دروس رد شده، فعلاً امکان اختصاص درس وجود ندارد. بعد از نصب می‌توانید دروس را از بخش تنظیمات اضافه کنید. (دبیر ثبت می‌شود و بعداً درس می‌گیرد.) <span className="text-slate-500">(اختیاری)</span>
        </p>
        <form
          onSubmit={handleSubmit((v) => {
            if (!v.fullName.trim() || !v.username.trim()) return notify.error("نام و نام کاربری الزامی است");
            if (validatePassword(v.password)) return notify.error("رمز عبور ضعیف است");
            if (takenUsernames.some((u) => u && u.toLowerCase() === v.username.toLowerCase())) return notify.error("این نام کاربری قبلاً استفاده شده است");
            setItems([...items, { fullName: v.fullName.trim(), username: v.username.trim(), password: v.password, assignments: [] }]);
            reset({ fullName: "", username: "", password: "" });
          })}
          className="mt-4 grid gap-3 rounded-xl border border-slate-700/50 bg-[#0b1222] p-4 sm:grid-cols-4"
        >
          <Input placeholder="نام و نام خانوادگی" {...register("fullName")} />
          <Input dir="ltr" placeholder="نام کاربری" {...register("username")} />
          <PasswordInput value={pwdValue} onChange={(v) => setValue("password", v, { shouldValidate: true })} placeholder="رمز عبور" />
          <Button type="submit" variant="outline" className="h-fit">
            <Plus size={15} /> ثبت
          </Button>
        </form>
        <div className="mt-4 space-y-2">
          {items.map((t, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-[#0b1222] px-4 py-2.5 text-[13px]">
              <Users size={14} className="text-blue-400" />
              <span className="text-slate-200">{t.fullName}</span>
              <span dir="ltr" className="text-[12px] text-slate-500">{t.username}</span>
              <button type="button" onClick={() => setItems(items.filter((_, xi) => xi !== i))} className="mr-auto rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-slate-100">دبیران</h3>
        <Button variant="outline" onClick={onSkip}>رد کردن این مرحله</Button>
      </div>
      <p className="mb-4 text-[12px] leading-6 text-slate-500">هر دبیر می‌تواند چندین درس در چندین کلاس تدریس کند. مثلاً: ریاضی در پایه ۱ کلاس ۱ و پایه ۲ کلاس ۲. <span className="text-amber-300/80">(اختیاری)</span></p>
      <form
        onSubmit={handleSubmit((v) => {
          if (!v.fullName.trim() || !v.username.trim()) return notify.error("نام و نام کاربری الزامی است");
          if (validatePassword(v.password)) return notify.error("رمز عبور ضعیف است");
          if (takenUsernames.some((u) => u && u.toLowerCase() === v.username.toLowerCase())) return notify.error("این نام کاربری قبلاً استفاده شده است");
          if (assign.length === 0) return notify.error("حداقل یک درس و کلاس برای دبیر انتخاب کنید");
          setItems([...items, { fullName: v.fullName.trim(), username: v.username.trim(), password: v.password, assignments: [...assign] }]);
          reset({ fullName: "", username: "", password: "" });
          setAssign([]);
          setDraft({ lessonIdx: 0, gradeIdx: 0, classIdx: 0 });
        })}
      >
        <div className="mb-4 grid gap-3 rounded-xl border border-slate-700/50 bg-[#0b1222] p-4 sm:grid-cols-4">
          <Input placeholder="نام و نام خانوادگی" {...register("fullName")} />
          <Input dir="ltr" placeholder="نام کاربری" {...register("username")} />
          <PasswordInput value={pwdValue} onChange={(v) => setValue("password", v, { shouldValidate: true })} placeholder="رمز عبور" />
          <Button type="submit" variant="outline" className="h-fit">
            <Plus size={15} /> ثبت دبیر
          </Button>
        </div>
        <div className="mb-3 grid gap-2 rounded-xl border border-slate-700/40 bg-white/[0.02] p-4 sm:grid-cols-4">
          <Field label="درس">
            <Select value={draft.lessonIdx} onChange={(e) => setDraft((d) => ({ ...d, lessonIdx: Number(e.target.value) }))}>
              {lessons.map((l, i) => (
                <option key={i} value={i}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="پایه">
            <Select value={draft.gradeIdx} onChange={(e) => {
              const gradeIdx = Number(e.target.value);
              setDraft((d) => ({ ...d, gradeIdx, classIdx: 0 }));
            }}>
              {gradeNames.map((g, i) => (
                <option key={i} value={i}>
                  {g}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="کلاس">
            <Select value={draft.classIdx} onChange={(e) => setDraft((d) => ({ ...d, classIdx: Number(e.target.value) }))}>
              {(classNames[draft.gradeIdx] ?? []).map((c, i) => (
                <option key={i} value={i}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button type="button" variant="ghost" onClick={addAssignment}>
              <Plus size={14} /> افزودن تدریس
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {assign.map((a, i) => (
            <div key={`${a.lessonIdx}-${a.gradeIdx}-${a.classIdx}-${i}`} className="flex items-center gap-2 rounded-lg border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-[12px] text-blue-200">
              {lessons[a.lessonIdx]?.name} — {gradeNames[a.gradeIdx]} — {classNames[a.gradeIdx]?.[a.classIdx]}
              <button type="button" onClick={() => setAssign(assign.filter((_, xi) => xi !== i))} className="mr-auto text-slate-400 hover:text-rose-400 cursor-pointer">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </form>
      <div className="mt-4 space-y-2">
        {items.map((t, i) => (
          <div key={i} className="rounded-xl border border-slate-700/50 bg-[#0b1222] px-4 py-2.5 text-[13px]">
            <div className="flex items-center gap-3">
              <Users size={14} className="text-blue-400" />
              <span className="text-slate-200">{t.fullName}</span>
              <span dir="ltr" className="text-[12px] text-slate-500">{t.username}</span>
              <button type="button" onClick={() => setItems(items.filter((_, xi) => xi !== i))} className="mr-auto rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {t.assignments.map((a, xi) => (
                <span key={xi} className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-300">
                  {lessons[a.lessonIdx]?.name} • {gradeNames[a.gradeIdx]} • {classNames[a.gradeIdx]?.[a.classIdx]}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= finish ================= */

function FinishPanel({ records, onDownload }: { records: AccessRecord[]; onDownload: () => void }) {
  const roles: { role: Role; label: string }[] = [
    { role: "admin", label: "مدیر" },
    { role: "teacher", label: "دبیر" },
    { role: "consultant", label: "مشاور و ناظم" },
    { role: "student", label: "دانش‌آموز" },
    { role: "parent", label: "والدین" },
  ];
  return (
    <div>
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <ShieldCheck size={22} className="text-emerald-400" />
        <div>
          <p className="text-[14px] font-semibold text-emerald-300">نصب با موفقیت انجام شد!</p>
          <p className="text-[12px] text-slate-400">کدهای دسترسی زیر را برای کاربران خود ذخیره کنید — هنگام ورود به سامانه نیاز هستند.</p>
        </div>
      </div>
      <div className="space-y-5">
        {roles.map(({ role, label }) => {
          const recs = records.filter((r) => r.role === role);
          if (recs.length === 0) return null;
          return (
            <div key={role}>
              <p className="mb-2 text-[13px] font-semibold text-slate-200">
                {label} <span className="text-slate-500">({faNum(recs.length)})</span>
              </p>
              <div className="space-y-2">
                {recs.map((r) => (
                  <div key={r.username} className="grid gap-2 rounded-xl border border-slate-700/50 bg-[#0b1222] px-4 py-3 text-[12px] sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                    <div>
                      <p className="text-slate-200">{r.name}</p>
                      <p dir="ltr" className="text-right text-slate-500">{r.username}</p>
                    </div>
                    <CodeCell value={r.password} />
                    <CodeCell value={r.accessCode} accent />
                    <span className="hidden" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex justify-end">
        <Button variant="outline" onClick={onDownload}>
          <Download size={15} /> دانلود فایل CSV
        </Button>
      </div>
    </div>
  );
}

function CodeCell({ value, accent }: { value: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span dir="ltr" className={cn("rounded-lg px-2 py-1 font-mono text-[11px]", accent ? "bg-blue-500/15 text-blue-300" : "bg-white/5 text-slate-300")}>
        {value}
      </span>
      <CopyCode value={value} />
    </div>
  );
}

function CopyCode({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          /* noop */
        }
        setOk(true);
        setTimeout(() => setOk(false), 1200);
      }}
      className="rounded-lg border border-slate-700/60 bg-white/5 px-2 py-1 text-[10px] text-slate-400 hover:bg-white/10 cursor-pointer"
    >
      {ok ? "کپی شد ✓" : "کپی"}
    </button>
  );
}


