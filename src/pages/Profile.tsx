import { BrainCircuit, Eye, EyeOff, KeyRound, Lock, Save, User, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../lib/session";
import { updateProfile, getUsernameById, getAccessCodeById } from "../lib/api";
import { validatePassword } from "../lib/auth";
import { roleLabel } from "../lib/api";
import { Button, Field, Input, notify } from "../components/ui";

export default function Profile() {
  const { session, refresh, logout } = useSession();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  // Get current user info from session
  const sessionUser = session;
  const currentUsername = sessionUser ? getUsernameById(sessionUser.sub) : "";
  const accessCode = sessionUser ? getAccessCodeById(sessionUser.sub) : "";

  if (!sessionUser) {
    navigate("/login");
    return null;
  }

  async function handleUpdateUsername() {
    if (!username.trim()) return notify.error("نام کاربری جدید را وارد کنید");
    if (username.trim().length < 3) return notify.error("نام کاربری باید حداقل ۳ کاراکتر باشد");
    if (!currentPassword) return notify.error("رمز عبور فعلی را وارد کنید");

    setBusy(true);
    const result = await updateProfile(sessionUser.sub, sessionUser.role, currentPassword, username.trim());
    setBusy(false);
    if (!result.ok) return notify.error(result.error ?? "خطا در بروزرسانی");
    notify.success("نام کاربری با موفقیت تغییر کرد");
    await refresh();
    setCurrentPassword("");
    setUsername("");
  }

  async function handleUpdatePassword() {
    if (!currentPassword) return notify.error("رمز عبور فعلی را وارد کنید");
    if (!newPassword) return notify.error("رمز عبور جدید را وارد کنید");
    const err = validatePassword(newPassword);
    if (err) return notify.error(err);
    if (newPassword !== confirmPassword) return notify.error("تأیید رمز عبور یکسان نیست");

    setBusy(true);
    const result = await updateProfile(sessionUser.sub, sessionUser.role, currentPassword, undefined, newPassword);
    setBusy(false);
    if (!result.ok) return notify.error(result.error ?? "خطا در بروزرسانی");
    notify.success("رمز عبور با موفقیت تغییر کرد");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="flex min-h-screen bg-[#060a14]">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-l border-slate-800/70 bg-[#0a101f]/80 backdrop-blur lg:block">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 px-5 pt-6 pb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/30">
              <BrainCircuit size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-50">SIP</p>
              <p className="text-[10px] text-slate-400">سامانه هوشمند مدارس</p>
            </div>
          </div>
          <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-[13px] font-medium text-slate-400 transition-all hover:bg-white/5 hover:text-slate-200 cursor-pointer"
            >
              <ShieldCheck size={17} className="text-slate-500" />
              بازگشت به داشبورد
            </button>
          </nav>
          <div className="border-t border-slate-800/80 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-[12px] font-bold text-slate-200">
                {sessionUser.name.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-slate-200">{sessionUser.name}</p>
                <p className="text-[11px] text-slate-500">{roleLabel(sessionUser.role)}</p>
              </div>
              <button onClick={() => { logout(); navigate("/login"); }} title="خروج" className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-10">
          {/* Header */}
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/30">
              <User size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-50">پروفایل کاربری</h1>
              <p className="text-[12px] text-slate-400">مشاهده و ویرایش اطلاعات حساب کاربری</p>
            </div>
          </div>

          {/* User Info Card */}
          <div className="card-surface mb-6 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-blue-700/20 border border-blue-500/30 text-2xl font-bold text-blue-300">
                {sessionUser.name.slice(0, 1)}
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-slate-100">{sessionUser.name}</h2>
                <p className="text-[13px] text-slate-400">{roleLabel(sessionUser.role)}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-700/50 bg-[#0b1222] p-4">
                <p className="mb-1 text-[11px] font-medium text-slate-500">نام کاربری فعلی</p>
                <p dir="ltr" className="text-[14px] font-medium text-slate-200">{currentUsername}</p>
              </div>
              <div className="rounded-xl border border-slate-700/50 bg-[#0b1222] p-4">
                <p className="mb-1 text-[11px] font-medium text-slate-500">نقش</p>
                <p className="text-[14px] font-medium text-slate-200">{roleLabel(sessionUser.role)}</p>
              </div>
            </div>
            {accessCode && (
              <div className="mt-4 rounded-xl border border-slate-700/50 bg-[#0b1222] p-4">
                <p className="mb-1 text-[11px] font-medium text-slate-500">کد دسترسی</p>
                <p dir="ltr" className="font-mono text-[14px] font-medium tracking-wider text-blue-300">{accessCode}</p>
              </div>
            )}
          </div>

          {/* Change Username */}
          <div className="card-surface mb-6 p-6">
            <h3 className="mb-1 flex items-center gap-2 text-[15px] font-semibold text-slate-100">
              <User size={17} className="text-blue-400" /> تغییر نام کاربری
            </h3>
            <p className="mb-4 text-[12px] text-slate-500">نام کاربری جدید را وارد کنید. برای تغییر، رمز عبور فعلی الزامی است.</p>
            <div className="space-y-3">
              <Field label="نام کاربری جدید">
                <Input dir="ltr" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="نام کاربری جدید" />
              </Field>
              <Field label="رمز عبور فعلی">
                <div className="relative">
                  <Lock size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    dir="ltr"
                    type={showCurrent ? "text" : "password"}
                    className="pr-10 pl-9"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="رمز عبور فعلی"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((s) => !s)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <Button onClick={handleUpdateUsername} loading={busy} disabled={busy}>
                <Save size={15} /> ذخیره نام کاربری
              </Button>
            </div>
          </div>

          {/* Change Password */}
          <div className="card-surface p-6">
            <h3 className="mb-1 flex items-center gap-2 text-[15px] font-semibold text-slate-100">
              <KeyRound size={17} className="text-blue-400" /> تغییر رمز عبور
            </h3>
            <p className="mb-4 text-[12px] text-slate-500">رمز عبور جدید باید حداقل ۶ کاراکتر و شامل حداقل یک عدد باشد.</p>
            <div className="space-y-3">
              <Field label="رمز عبور فعلی">
                <div className="relative">
                  <Lock size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    dir="ltr"
                    type={showCurrent ? "text" : "password"}
                    className="pr-10 pl-9"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="رمز عبور فعلی"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((s) => !s)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <Field label="رمز عبور جدید">
                <div className="relative">
                  <Lock size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    dir="ltr"
                    type={showNew ? "text" : "password"}
                    className="pr-10 pl-9"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="رمز عبور جدید"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((s) => !s)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <Field label="تأیید رمز عبور جدید">
                <div className="relative">
                  <Lock size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    dir="ltr"
                    type={showConfirm ? "text" : "password"}
                    className="pr-10 pl-9"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="دوباره رمز جدید را وارد کنید"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <Button onClick={handleUpdatePassword} loading={busy} disabled={busy}>
                <Save size={15} /> ذخیره رمز عبور
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
