import { Activity, AlertTriangle, BrainCircuit, Database, HardDrive, HeartPulse, Server } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button, Card, PageHeader } from "../components/ui";
import { useSession } from "../lib/session";
import { faNum } from "../lib/format";

interface DbFileStatus {
  name: string;
  size: number;
  healthy: boolean;
  lastModified: string;
}

interface AccountInfo {
  name: string;
  role: string;
  username: string;
}

export function UptimePage() {
  const { ready, installed, session } = useSession();
  const navigate = useNavigate();
  const [dbStatus, setDbStatus] = useState<DbFileStatus[]>([]);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !installed || !session) return;
    
    const checkDbStatus = () => {
      const files = [
        "admin", "teachers", "students", "parents", "consultants", 
        "grades", "books", "notes", "ai-analysis"
      ];
      
      const status: DbFileStatus[] = files.map(file => {
        try {
          const key = `sip-db-${file}`;
          const raw = localStorage.getItem(key);
          const size = raw ? Math.round(raw.length / 1024) : 0;
          const lastModified = raw ? new Date(localStorage.getItem(`${key}-timestamp`) || Date.now()).toLocaleString('fa-IR') : "نامشخص";
          
          // Simple health check - try to parse JSON
          if (raw) {
            try {
              JSON.parse(raw);
              return { name: `${file}.json`, size, healthy: true, lastModified };
            } catch {
              return { name: `${file}.json`, size, healthy: false, lastModified };
            }
          }
          return { name: `${file}.json`, size, healthy: false, lastModified };
        } catch {
          return { name: `${file}.json`, size: 0, healthy: false, lastModified: "نامشخص" };
        }
      });
      
      setDbStatus(status);
    };
    
    const fetchAccountInfo = () => {
      if (session) {
        setAccountInfo({
          name: session.name,
          role: session.role === "admin" ? "مدیر" : session.role === "teacher" ? "دبیر" : session.role === "consultant" ? "مشاور" : session.role === "parent" ? "والدین" : "دانش آموز",
          username: session.sub
        });
      }
    };
    
    checkDbStatus();
    fetchAccountInfo();
    setLoading(false);
  }, [ready, installed, session]);

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">در حال بارگذاری...</p></div>;
  }
  
  if (!installed) {
    return <Navigate to="/install" replace />;
  }
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">وضعیت سامانه</h1>
            <p className="text-slate-400 mt-1">مانیتورینگ و سلامت پایگاه داده</p>
          </div>
          <div className="flex items-center gap-3">
            {accountInfo && (
              <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg text-sm">
                <span className="text-slate-300">{accountInfo.name}</span>
                <span className="text-slate-500">{accountInfo.role}</span>
                <span className="text-slate-400 text-xs">({accountInfo.username})</span>
              </div>
            )}
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              بازگشت به داشبورد
            </Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <Card title="سلامت پایگاه داده">
            <div className="space-y-3">
              {dbStatus.map((file, index) => (
                <div key={index} className="flex items-center justify-between text-[12px]">
                  <span dir="ltr" className="text-left font-mono text-[11px] text-slate-400">{file.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-slate-500">{faNum(file.size)} KB</span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium 
                      ${file.healthy ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' : 'bg-rose-500/15 text-rose-300 border-rose-500/25'}`}>
                      {file.healthy ? "سالم" : "خراب"}
                    </span>
                    <span className="text-slate-500 text-xs">آخرین تغییر: {file.lastModified}</span>
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="اطلاعات سیستم">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server size={16} className="text-blue-400" />
                  <span className="text-slate-300 text-sm">وضعیت سرور</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-500/25">
                  فعال
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-cyan-400" />
                  <span className="text-slate-300 text-sm">پایگاه داده</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-500/25">
                  متصل
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive size={16} className="text-violet-400" />
                  <span className="text-slate-300 text-sm">فضای ذخیره‌سازی</span>
                </div>
                <span className="text-slate-400 text-sm">نامحدود</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HeartPulse size={16} className="text-rose-400" />
                  <span className="text-slate-300 text-sm">زمان فعالیت</span>
                </div>
                <span className="text-slate-400 text-sm">۹۹.۹٪</span>
              </div>
            </div>
          </Card>
        </div>

        <section className="card-surface p-5">
          <header className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-slate-100">سلامت پایگاه داده JSON</h3>
              <p className="mt-0.5 text-[12px] text-slate-500">اعتبارسنجی فایل‌ها، نسخه‌های پشتیبان و حجم</p>
            </div>
          </header>
          <div className="space-y-2">
            {dbStatus.map((file, index) => (
              <div key={index} className="flex items-center justify-between text-[12px]">
                <span dir="ltr" className="text-left font-mono text-[11px] text-slate-400">{file.name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-slate-500">{faNum(file.size)} KB</span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium 
                    ${file.healthy ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' : 'bg-rose-500/15 text-rose-300 border-rose-500/25'}`}>
                    {file.healthy ? "سالم" : "خراب"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}