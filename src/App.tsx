import { BrainCircuit } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { ToasterSetup } from "./components/ui";
import { SessionProvider, useSession } from "./lib/session";
import type { Role } from "./lib/types";
import { ErrorBoundary, Forbidden, NotFound, ServerError } from "./pages/Errors";
import InstallWizard from "./pages/Install";
import Login from "./pages/Login";
import AdminDashboard from "./pages/Admin";
import TeacherDashboard from "./pages/Teacher";
import ConsultantDashboard from "./pages/Consultant";
import ParentDashboard from "./pages/Parent";
import StudentDashboard from "./pages/Student";

function BootScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/30">
        <BrainCircuit size={28} className="text-white" />
      </div>
      <p className="text-[13px] text-slate-400">در حال بارگذاری سامانه هوشمند مدارس…</p>
    </div>
  );
}

function RootRedirect() {
  const { ready, installed, session } = useSession();
  if (!ready) return <BootScreen />;
  if (!installed) return <Navigate to="/install" replace />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

function InstallRoute() {
  const { ready, installed } = useSession();
  if (!ready) return <BootScreen />;
  if (installed) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen">
      <InstallWizard />
    </div>
  );
}

function LoginRoute() {
  const { ready, installed, session } = useSession();
  if (!ready) return <BootScreen />;
  if (!installed) return <Navigate to="/install" replace />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <Login />;
}

function roleDashboard(role: Role, section: string | undefined): ReactNode {
  const sec = section ?? "overview";
  switch (role) {
    case "admin":
      return <AdminDashboard section={sec} />;
    case "teacher":
      return <TeacherDashboard section={sec} />;
    case "consultant":
      return <ConsultantDashboard section={sec} />;
    case "parent":
      return <ParentDashboard section={sec} />;
    case "student":
      return <StudentDashboard section={sec} />;
    default:
      return <Navigate to="/login" replace />;
  }
}

function DashboardRoute() {
  const { ready, installed, session } = useSession();
  const { section } = useParams<{ section?: string }>();
  if (!ready) return <BootScreen />;
  if (!installed) return <Navigate to="/install" replace />;
  if (!session) return <Navigate to="/login" replace />;
  return roleDashboard(session.role, section);
}

function AppInner() {
  // Refresh the session when the tab regains focus (token expiry handling)
  const { refresh } = useSession();
  useEffect(() => {
    const on = () => void refresh();
    window.addEventListener("focus", on);
    return () => window.removeEventListener("focus", on);
  }, [refresh]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/install" element={<InstallRoute />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/dashboard" element={<DashboardRoute />} />
        <Route path="/dashboard/:section" element={<DashboardRoute />} />
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="/error" element={<ServerError />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <ToasterSetup />
        <AppInner />
      </SessionProvider>
    </ErrorBoundary>
  );
}
