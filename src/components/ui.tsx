import { Toaster, toast } from "react-hot-toast";
import { Check, Copy, Loader2, X } from "lucide-react";
import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "../utils/cn";
import { faNum } from "../lib/format";

export function ToasterSetup() {
  return (
    <Toaster
      position="top-left"
      toastOptions={{
        duration: 3200,
        style: {
          background: "#0d1526",
          color: "#e2e8f0",
          border: "1px solid rgba(148,163,184,0.18)",
          fontFamily: "Vazirmatn, sans-serif",
          fontSize: "13px",
          direction: "rtl",
        },
        success: { iconTheme: { primary: "#34d399", secondary: "#0d1526" } },
        error: { iconTheme: { primary: "#fb7185", secondary: "#0d1526" } },
      }}
    />
  );
}

export const notify = {
  success: (m: string) => toast.success(m),
  error: (m: string) => toast.error(m),
  info: (m: string) => toast(m),
};

type ButtonVariant = "primary" | "ghost" | "danger" | "outline" | "success";

export function Button({
  variant = "primary",
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20",
    danger: "bg-rose-600/90 hover:bg-rose-500 text-white",
    ghost: "bg-white/5 hover:bg-white/10 text-slate-200 border border-transparent",
    outline: "bg-transparent hover:bg-white/5 text-slate-300 border border-slate-600/60",
  };
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
        styles[variant],
        className,
      )}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Field({ label, error, hint, children }: { label?: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[13px] font-medium text-slate-300">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-[11px] text-rose-400">{error}</span>}
    </label>
  );
}

const controlBase =
  "w-full rounded-xl border border-slate-700/70 bg-[#0b1222] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(controlBase, className)} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(controlBase, "cursor-pointer", className)}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(controlBase, "min-h-20 resize-y", className)} />;
}

export function Card({ title, subtitle, action, children, className }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("card-surface p-5", className)}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-[15px] font-semibold text-slate-100">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

const TONES = {
  blue: { chip: "bg-blue-500/15 text-blue-300 border-blue-500/25", bar: "bg-blue-500" },
  emerald: { chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", bar: "bg-emerald-500" },
  amber: { chip: "bg-amber-500/15 text-amber-300 border-amber-500/25", bar: "bg-amber-500" },
  rose: { chip: "bg-rose-500/15 text-rose-300 border-rose-500/25", bar: "bg-rose-500" },
  violet: { chip: "bg-violet-500/15 text-violet-300 border-violet-500/25", bar: "bg-violet-500" },
  slate: { chip: "bg-slate-500/15 text-slate-300 border-slate-500/25", bar: "bg-slate-500" },
  cyan: { chip: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25", bar: "bg-cyan-500" },
  orange: { chip: "bg-orange-500/15 text-orange-300 border-orange-500/25", bar: "bg-orange-500" },
} as const;

export type Tone = keyof typeof TONES;

export function StatCard({ icon, label, value, sub, tone = "blue" }: { icon: ReactNode; label: string; value: string; sub?: string; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <div className="card-surface p-5 flex items-center gap-4">
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border", t.chip)}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[12px] text-slate-400">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-slate-50">{value}</p>
        {sub && <p className="mt-0.5 truncate text-[11px] text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

export function Badge({ tone = "slate", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium", TONES[tone].chip, className)}>{children}</span>;
}

export function riskTone(score: number): Tone {
  if (score < 25) return "emerald";
  if (score < 50) return "amber";
  if (score < 75) return "orange";
  return "rose";
}

export const RISK_LABELS: Record<string, string> = { low: "پایین", medium: "متوسط", high: "بالا", critical: "بحرانی" };

export function RiskBadge({ score }: { score: number }) {
  return (
    <Badge tone={riskTone(score)}>
      ریسک {faNum(score)} — {RISK_LABELS[score < 25 ? "low" : score < 50 ? "medium" : score < 75 ? "high" : "critical"]}
    </Badge>
  );
}

export function RiskBar({ score }: { score: number }) {
  const color = score < 25 ? "bg-emerald-500" : score < 50 ? "bg-amber-500" : score < 75 ? "bg-orange-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full max-w-36 overflow-hidden rounded-full bg-slate-700/50">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[11px] font-semibold text-slate-300">{faNum(score)}</span>
    </div>
  );
}

export function ProgressBar({ value, tone = "blue" }: { value: number; tone?: Tone }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700/50">
      <div className={cn("h-full rounded-full transition-all duration-700", TONES[tone].bar)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm anim-fade-in" onClick={onClose} />
      <div className={cn("relative w-full rounded-2xl border border-slate-700/60 bg-[#0d1526] p-6 shadow-2xl anim-scale-in max-h-[88vh] overflow-y-auto", wide ? "max-w-3xl" : "max-w-md")}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200 cursor-pointer" aria-label="بستن">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function SkeletonGrid({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, desc, action }: { icon: ReactNode; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700/60 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        {desc && <p className="mx-auto mt-1 max-w-sm text-[12px] leading-6 text-slate-500">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-slate-700/50 bg-[#0b1222] p-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all cursor-pointer",
            active === t.key ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          /* clipboard unavailable */
        }
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-700/60 bg-white/5 px-2 py-1 text-[11px] text-slate-300 transition hover:bg-white/10 cursor-pointer"
    >
      {done ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
      {done ? "کپی شد" : "کپی"}
    </button>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-50">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}