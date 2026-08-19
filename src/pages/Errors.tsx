import { Component, type ErrorInfo, type ReactNode } from "react";
import { Ban, Fingerprint, RefreshCw, SearchX, ServerCrash } from "lucide-react";
import { Link } from "react-router-dom";

function ErrorFrame({ code, title, desc, icon }: { code: string; title: string; desc: string; icon: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-blue-500/25 bg-blue-500/10 text-blue-400">{icon}</div>
      <div>
        <p className="text-[13px] font-bold tracking-widest text-slate-500">{code}</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-50">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-[13px] leading-7 text-slate-400">{desc}</p>
      </div>
      <Link to="/" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500">
        بازگشت به صفحه اصلی
      </Link>
    </div>
  );
}

export function NotFound() {
  return <ErrorFrame code="404" title="صفحه یافت نشد" desc="آدرس‌ای که به دنبال آن هستید وجود ندارد یا جابه‌جا شده است." icon={<SearchX size={34} />} />;
}

export function Forbidden() {
  return <ErrorFrame code="403" title="دسترسی محدود" desc="حساب شما مجوز مشاهده این بخش را ندارد. این صفحه فقط برای نقش‌های مجاز در دسترس است." icon={<Ban size={34} />} />;
}

export function ServerError() {
  return <ErrorFrame code="500" title="خطای سرور" desc="مشکلی در پردازش درخواست پیش آمد. لطفاً دوباره تلاش کنید." icon={<ServerCrash size={34} />} />;
}

interface BoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    void error;
    void info;
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFrame
          code="500"
          title="خطای غیرمنتظره"
          desc="مشکلی در رندر صفحه رخ داد. صفحه را بارگذاری مجدد کنید."
          icon={<Fingerprint size={34} />}
        />
      );
    }
    return this.props.children;
  }
}

export function ResetBoundaryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 cursor-pointer"
    >
      <RefreshCw size={14} /> بارگذاری مجدد
    </button>
  );
}
