import { AlertTriangle, BrainCircuit, ChevronDown, KeyRound, LineChart, Lock, ShieldCheck, TrendingDown, User } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { login, listQuickAccounts } from "../lib/api";
import { faDate } from "../lib/format";
import { Button, Field, Input, notify } from "../components/ui";

interface LoginForm {
  username: string;
  password: string;
  accessCode: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const accounts = listQuickAccounts();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({ defaultValues: { username: "", password: "", accessCode: "" } });

  const onSubmit = handleSubmit(async (v) => {
    setBusy(true);
    const res = await login(v.username, v.password, v.accessCode);
    setBusy(false);
    if (!res.ok) {
      notify.error(res.error ?? "ورود ناموفق بود");
      return;
    }
    notify.success(`خوش آمدید، ${res.user?.name}`);
    navigate("/dashboard");
  });

  return (
    <div className="flex min-h-screen">
      {/* form side */}
      <div className="flex w-full flex-col justify-center px-6 py-10 lg:w-[55%] lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/30">
              <BrainCircuit size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-50">سامانه هوشمند مدارس (SIP)</h1>
              <p className="text-[12px] text-slate-400">تحلیل، پیش‌بینی و تصمیم‌یار هوشمند آموزشی</p>
            </div>
          </div>

          <div className="card-surface p-6 anim-fade-up">
            <h2 className="mb-1 text-[15px] font-semibold text-slate-100">ورود به سامانه</h2>
            <p className="mb-5 text-[12px] text-slate-500">نقش شما به‌صورت خودکار تشخیص داده می‌شود.</p>
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="نام کاربری" error={errors.username ? "الزامی" : undefined}>
                <div className="relative">
                  <User size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input dir="ltr" className="pr-10" placeholder="username" {...register("username", { required: true })} />
                </div>
              </Field>
              <Field label="رمز عبور" error={errors.password ? "الزامی" : undefined}>
                <div className="relative">
                  <Lock size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input dir="ltr" type="password" className="pr-10" placeholder="••••••••" {...register("password", { required: true })} />
                </div>
              </Field>
              <Field label="کد دسترسی" error={errors.accessCode ? "الزامی" : undefined} hint="کدی که هنگام نصب دریافت کرده‌اید (مثلاً SIP-S-XXXX-XXXX)">
                <div className="relative">
                  <KeyRound size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input dir="ltr" className="pr-10 uppercase" placeholder="SIP-XX-XXXX-XXXX" {...register("accessCode", { required: true })} />
                </div>
              </Field>
              <Button type="submit" loading={busy} className="w-full py-3">
                ورود به داشبورد
              </Button>
            </form>

            {accounts.length > 0 && (
              <div className="mt-5 border-t border-slate-800/70 pt-4">
                <button onClick={() => setShowAccounts((s) => !s)} className="flex items-center gap-1.5 text-[12px] font-medium text-blue-300 hover:text-blue-200 cursor-pointer">
                  <ChevronDown size={13} className={showAccounts ? "rotate-180 transition" : "transition"} />
                  {showAccounts ? "بستن فهرست حساب‌ها" : "نمایش حساب‌های موجود (برای ورود سریع در دمو)"}
                </button>
                {showAccounts && (
                  <div className="mt-3 max-h-44 space-y-1 overflow-y-auto pl-1">
                    {accounts.map((a, i) => (
                      <button
                        key={`${a.username}-${i}`}
                        onClick={() => setValue("username", a.username)}
                        className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-white/[0.03] px-3 py-2 text-[12px] transition hover:border-blue-500/40 hover:bg-blue-500/10 cursor-pointer"
                      >
                        <span className="text-slate-200">{a.name}</span>
                        <span className="text-slate-500">
                          {a.role} • <span dir="ltr">{a.username}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="mt-4 text-center text-[11px] text-slate-600">{faDate(new Date().toISOString())} — نسخه نمایشی SIP</p>
        </div>
      </div>

      {/* brand side */}
      <div className="relative hidden flex-1 items-center justify-center overflow-hidden border-r border-slate-800/60 bg-[#0a101f] lg:flex">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative z-10 max-w-md px-10">
          <h2 className="mb-8 text-2xl font-bold leading-10 text-slate-50">
            افت تحصیلی را <span className="text-blue-400">قبل از کارنامه</span> بشناسید
          </h2>
          <ul className="space-y-5">
            <Feature icon={<AlertTriangle size={18} />} title="هشدار زودهنگام (Risk Score)" desc="امتیاز ریسک ۰ تا ۰۰ برای هر دانش‌آموز بر اساس نمرات، غیبت، تکالیف، رفتار و سلامت روان — با هشدار خودکار به مشاور، مدیر و والدین." />
            <Feature icon={<LineChart size={18} />} title="پیش‌بینی نمرات و روند" desc="برآورد نمره آزمون بعدی، میانگین ترم و احتمال قبولی/افت برای هر درس با درصد اطمینان." />
            <Feature icon={<TrendingDown size={18} />} title="برنامه مطالعاتی هوشمند" desc="برنامه هفتگی شخصی‌سازی‌شده بر اساس نقاط ضعف، اهمیت درس و روند یادگیری." />
            <Feature icon={<ShieldCheck size={18} />} title="تحلیل سلامت روان هفتگی" desc="فرم ۸ سؤالی هفتگی، شاخص استرس، اضطراب، انگیزه و احتمال ترک تحصیل." />
          </ul>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <li className="flex gap-3.5">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-500/10 text-blue-300">{icon}</div>
      <div>
        <p className="text-[14px] font-semibold text-slate-100">{title}</p>
        <p className="mt-1 text-[12px] leading-6 text-slate-400">{desc}</p>
      </div>
    </li>
  );
}
