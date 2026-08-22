import { BrainCircuit, LogOut, Menu, UserCircle, X, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../utils/cn";
import { faDate } from "../lib/format";
import { roleLabel } from "../lib/api";
import type { Role } from "../lib/types";

export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

interface AppShellProps {
  role: Role;
  userName: string;
  nav: NavItem[];
  section: string;
  onNavigate: (key: string) => void;
  onLogout: () => void;
  children: ReactNode;
}

export function AppShell({ role, userName, nav, section, onNavigate, onLogout, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const active = nav.find((n) => n.key === section);

  const sidebar = (
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
        {nav.map((n) => (
          <button
            key={n.key}
            onClick={() => {
              onNavigate(n.key);
              setMobileOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all cursor-pointer",
              section === n.key
                ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                : "border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200",
            )}
          >
            <n.icon size={17} className={section === n.key ? "text-blue-400" : "text-slate-500"} />
            {n.label}
          </button>
        ))}
      </nav>
      <div className="px-3 pb-2">
        <button
          onClick={() => { navigate("/profile"); setMobileOpen(false); }}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all cursor-pointer",
            "border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200",
          )}
        >
          <UserCircle size={17} className="text-slate-500" />
          پروفایل کاربری
        </button>
      </div>
      <div className="border-t border-slate-800/80 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/profile")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-[12px] font-bold text-slate-200 transition-all hover:from-blue-500/20 hover:to-blue-700/20 hover:border-blue-500/30 cursor-pointer"
            title="پروفایل"
          >
            {userName.slice(0, 1)}
          </button>
          <button onClick={() => navigate("/profile")} className="min-w-0 flex-1 cursor-pointer text-left">
            <p className="truncate text-[13px] font-medium text-slate-200 hover:text-blue-300 transition-colors">{userName}</p>
            <p className="text-[11px] text-slate-500">{roleLabel(role)}</p>
          </button>
          <button onClick={onLogout} title="خروج" className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-l border-slate-800/70 bg-[#0a101f]/80 backdrop-blur lg:block">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-72 border-l border-slate-800 bg-[#0a101f] anim-fade-in">
            <button onClick={() => setMobileOpen(false)} className="absolute left-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 cursor-pointer">
              <X size={16} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-800/70 bg-[#070b14]/85 px-5 py-3.5 backdrop-blur">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden cursor-pointer">
            <Menu size={18} />
          </button>
          <h2 className="text-[15px] font-semibold text-slate-100">{active?.label ?? "داشبورد"}</h2>
          <div className="mr-auto flex items-center gap-3">
            <span className="hidden text-[12px] text-slate-500 md:block">{faDate(new Date().toISOString())}</span>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
              هوش مصنوعی فعال
            </span>
          </div>
        </header>
        <main className="flex-1 p-5 lg:p-7">{children}</main>
      </div>
    </div>
  );
}