import { AlertTriangle, BrainCircuit, CheckCircle, LineChart, Lock, ShieldCheck, TrendingDown, User } from "lucide-react";
import { useState } from "react";
import { useForm, useFormContext, FormProvider } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/api";
import { faDate } from "../lib/format";
import { Button, Field, Input, notify } from "../components/ui";

interface LoginForm {
  username: string;
  password: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const formMethods = useForm<LoginForm>({ defaultValues: { username: "", password: "" } });
  const { register, handleSubmit, formState: { errors } } = formMethods;

  const onSubmit = handleSubmit(async (v) => {
    setBusy(true);
    const res = await login(v.username, v.password);
    setBusy(false);
    if (!res.ok) {
      notify.error(res.error ?? "ورود ناموفق بود");
      return;
    }
    setShowSuccess(true);
    notify.success(`خوش آمدید، ${res.user?.name}`);
    setTimeout(() => {
      window.location.reload();
    }, 5000);
  });

  return (
    <div className="flex min-h-screen">
       {showSuccess && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-transition">
          <div className="mb-8 flex flex-col items-center gap-4">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <div className="absolute h-full w-full animate-ping rounded-full bg-green-500/30" />
              <div className="absolute h-20 w-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/30" />
              <CheckCircle size={40} className="relative z-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-green-400">ورود موفق!</h2>
            <p className="text-sm text-slate-300">در حال Refresh کردن صفحه...</p>
            <div className="mt-4 h-1 w-64 overflow-hidden rounded-full bg-slate-700">
              <div className="h-full w-full animate-loading-bar bg-gradient-to-r from-green-400 to-emerald-500" />
            </div>
            <p className="mt-2 text-xs text-slate-400">5 ثانیه باقی مانده</p>
          </div>
        </div>
      )}
      {/* form side */}
      <div className="flex w-full flex-col justify-center px-6 py-10 lg:w-[55%] lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/30">
              <BrainCircuit size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-50">سامانه هوشمند مدارس (SIP)</h1>
              <p className="text-[12px] text-slate-400">تحلیل، پیشبینی و تصمیمیار هوشمند آموزشی</p>
            </div>
          </div>

          <div className="card-surface p-6 anim-fade-up">
            <h2 className="mb-1 text-[15px] font-semibold text-slate-100">ورود به سامانه</h2>
            <p className="mb-5 text-[12px] text-slate-500">نقش شما بهصورت خودکار تشخیص داده میشود.</p>
            <FormProvider {...formMethods}>
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="نام کاربری" error={errors.username ? "الزامی" : undefined}>
                <div className="relative">
                  <User size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input dir="ltr" className="pr-10" placeholder="username" {...register("username", { required: true })} />
                </div>
              </Field>
              <Field label="رمز عبور" error={errors.password ? "الزامی" : undefined}>
                <PasswordToggle />
              </Field>
              <Button type="submit" loading={busy} className="w-full py-3">
                ورود به داشبورد
              </Button>
            </form>
            </FormProvider>
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
            <Feature icon={<AlertTriangle size={18} />} title="هشدار زودهنگام (Risk Score)" desc="امتیاز ریسک ۰ تا ۰۰ برای هر دانشآموز بر اساس نمرات، غیبت، تکالیف، رفتار و سلامت روان — با هشدار خودکار به مشاور، مدیر و والدین." />
            <Feature icon={<LineChart size={18} />} title="پیشبینی نمرات و روند" desc="برآورد نمره آزمون بعدی، میانگین ترم و احتمال قبولی/افت برای هر درس با درصد اطمینان." />
            <Feature icon={<TrendingDown size={18} />} title="برنامه مطالعاتی هوشمند" desc="برنامه هفتگی شخصیسازیشده بر اساس نقاط ضعف، اهمیت درس و روند یادگیری." />
            <Feature icon={<ShieldCheck size={18} />} title="تحلیل سلامت روان هفتگی" desc="فرم ۸ سؤالی هفتگی، شاخص استرس، اضطراب، انگیزه و احتمال ترک تحصیل." />
          </ul>
        </div>
      </div>
    </div>
  );
}

function PasswordToggle() {
  const [show, setShow] = useState(false);
  const { register } = useFormContext<LoginForm>();
  const { onChange, onBlur, name, ref } = register("password", { required: true });
  return (
    <div className="relative">
      <Lock size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
      <Input
        dir="ltr"
        type={show ? "text" : "password"}
        className="pr-10 pl-9"
        placeholder="••••••••"
        name={name}
        onChange={onChange}
        onBlur={onBlur}
        ref={ref}
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

function Feature({ icon, title, desc, delay }: { icon: React.ReactNode; title: string; desc: string; delay: number }) {
  return (
    <li className="flex gap-3.5 animate-fade-in-up" style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}>
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-500/10 text-blue-300 transition-transform duration-300 hover:scale-110 hover:border-blue-400/50 hover:bg-blue-500/20">{icon}</div>
      <div>
        <p className="text-[14px] font-semibold text-slate-100">{title}</p>
        <p className="mt-1 text-[12px] leading-6 text-slate-400">{desc}</p>
      </div>
    </li>
  );
}
