import { BrainCircuit } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes, useParams, useLocation } from "react-router-dom";
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
import Profile from "./pages/Profile";
import { HomePage } from "./pages/HomePage";
import { UptimePage } from "./pages/Uptime";

function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-page-transition">
      {children}
    </div>
  );
}

function SectionTransition({ children }: { children: ReactNode }) {
  return (
    <div className="animate-section-transition">
      {children}
    </div>
  );
}

function BootScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 animate-fade-in">
      <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/30">
        <BrainCircuit size={28} className="text-white" />
      </div>
      <p className="text-[13px] text-slate-400">در حال بارگذاری سیپ — سامانه یکپارچه پیشرفت دانش آموزی...</p>
    </div>
  );
}

function RootRedirect() {
  const { ready, installed, session } = useSession();
  if (!ready) return <BootScreen />;
  if (!installed) return <HomePage />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <HomePage />;
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
      return <SectionTransition><AdminDashboard section={sec} /></SectionTransition>;
    case "teacher":
      return <SectionTransition><TeacherDashboard section={sec} /></SectionTransition>;
    case "consultant":
      return <SectionTransition><ConsultantDashboard section={sec} /></SectionTransition>;
    case "parent":
      return <SectionTransition><ParentDashboard section={sec} /></SectionTransition>;
    case "student":
      return <SectionTransition><StudentDashboard section={sec} /></SectionTransition>;
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
  return (
    <HashRouter>
      <PageTransition>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/install" element={<InstallRoute />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route path="/dashboard/:section" element={<DashboardRoute />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/uptime" element={<UptimePage />} />
          <Route path="/forbidden" element={<Forbidden />} />
          <Route path="/error" element={<ServerError />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PageTransition>
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