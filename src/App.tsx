// src/App.tsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { LoadingScreen, Button } from './components/ui';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { useAuthStore, isTokenValid } from './store/authStore';
import db from './services/database';

import { InstallWizard } from './pages/Install/InstallWizard';
import { LoginPage } from './pages/Login/LoginPage';
import { AdminDashboard } from './pages/Admin/AdminDashboard';
import { StudentsManagement } from './pages/Admin/StudentsManagement';
import { TeachersManagement } from './pages/Admin/TeachersManagement';
import { GradesManagement } from './pages/Admin/GradesManagement';
import { TeacherDashboard } from './pages/Teacher/TeacherDashboard';
import { ConsultantDashboard } from './pages/Consultant/ConsultantDashboard';
import { ParentDashboard } from './pages/Parent/ParentDashboard';
import { StudentDashboard } from './pages/Student/StudentDashboard';

const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-dark-100 mb-2">{title}</h1>
      <p className="text-dark-400">این صفحه در حال توسعه است</p>
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, token } = useAuthStore();
  if (!isAuthenticated || !token || !isTokenValid(token)) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// ===== InstallGuard with FULL error handling =====
const InstallGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<{
    loading: boolean;
    installed: boolean | null;
    error: string | null;
  }>({
    loading: true,
    installed: null,
    error: null,
  });

  useEffect(() => {
    const check = async () => {
      try {
        const installed = await db.isInstalled();
        setState({ loading: false, installed, error: null });
      } catch (err: any) {
        setState({
          loading: false,
          installed: false,
          error: err.message || 'خطا در اتصال به سرور',
        });
      }
    };
    check();
  }, []);

  if (state.loading) {
    return <LoadingScreen message="در حال بارگذاری..." />;
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-red-400 mb-4">خطا در اتصال</h2>
          <p className="text-dark-400 mb-6">{state.error}</p>
          <p className="text-dark-500 text-sm mb-6">
            لطفاً مطمئن شوید که سرور در حال اجراست (پورت ۳۰۰۱) و سپس دوباره تلاش کنید.
          </p>
          <Button onClick={() => window.location.reload()}>تلاش مجدد</Button>
          <button
            className="block w-full mt-3 text-dark-500 text-sm hover:text-dark-300 transition-colors"
            onClick={() => {
              // Force to installation page if user wants to reinstall
              db.resetInstallationCache();
              window.location.href = '/install';
            }}
          >
            ↻ بازنشانی و نصب مجدد
          </button>
        </div>
      </div>
    );
  }

  if (!state.installed) {
    return <Navigate to="/install" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated, token, logout } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && token && !isTokenValid(token)) {
      logout();
    }
    setIsLoading(false);
  }, [isAuthenticated, token, logout]);

  if (isLoading) return <LoadingScreen message="در حال بارگذاری..." />;

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
            borderRadius: '12px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#1e293b' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#1e293b' } },
        }}
      />
      <Routes>
        <Route path="/install" element={<InstallWizard />} />
        <Route
          path="/login"
          element={
            <InstallGuard>
              {isAuthenticated && user ? (
                <Navigate to={`/${user.role}`} replace />
              ) : (
                <LoginPage />
              )}
            </InstallGuard>
          }
        />
        <Route
          path="/admin"
          element={
            <InstallGuard>
              <ProtectedRoute>
                <DashboardLayout allowedRoles={['admin']} />
              </ProtectedRoute>
            </InstallGuard>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="students" element={<StudentsManagement />} />
          <Route path="teachers" element={<TeachersManagement />} />
          <Route path="consultants" element={<PlaceholderPage title="مدیریت مشاوران" />} />
          <Route path="grades" element={<GradesManagement />} />
          <Route path="analytics" element={<PlaceholderPage title="تحلیل مدرسه" />} />
          <Route path="ai-reports" element={<PlaceholderPage title="گزارشات هوشمند" />} />
          <Route path="settings" element={<PlaceholderPage title="تنظیمات" />} />
        </Route>
        <Route
          path="/teacher"
          element={
            <InstallGuard>
              <ProtectedRoute>
                <DashboardLayout allowedRoles={['teacher']} />
              </ProtectedRoute>
            </InstallGuard>
          }
        >
          <Route index element={<TeacherDashboard />} />
          <Route path="classes" element={<PlaceholderPage title="کلاس‌های من" />} />
          <Route path="attendance" element={<PlaceholderPage title="حضور و غیاب" />} />
          <Route path="homework" element={<PlaceholderPage title="تکالیف" />} />
          <Route path="exams" element={<PlaceholderPage title="آزمون‌ها" />} />
          <Route path="reports" element={<PlaceholderPage title="گزارشات" />} />
        </Route>
        <Route
          path="/consultant"
          element={
            <InstallGuard>
              <ProtectedRoute>
                <DashboardLayout allowedRoles={['consultant']} />
              </ProtectedRoute>
            </InstallGuard>
          }
        >
          <Route index element={<ConsultantDashboard />} />
          <Route path="students" element={<PlaceholderPage title="دانش‌آموزان" />} />
          <Route path="risk-alerts" element={<PlaceholderPage title="هشدارها" />} />
          <Route path="mental-health" element={<PlaceholderPage title="سلامت روان" />} />
          <Route path="guidance" element={<PlaceholderPage title="هدایت تحصیلی" />} />
          <Route path="reports" element={<PlaceholderPage title="گزارشات" />} />
        </Route>
        <Route
          path="/parent"
          element={
            <InstallGuard>
              <ProtectedRoute>
                <DashboardLayout allowedRoles={['parent']} />
              </ProtectedRoute>
            </InstallGuard>
          }
        >
          <Route index element={<ParentDashboard />} />
          <Route path="progress" element={<PlaceholderPage title="پیشرفت تحصیلی" />} />
          <Route path="attendance" element={<PlaceholderPage title="حضور و غیاب" />} />
          <Route path="homework" element={<PlaceholderPage title="تکالیف" />} />
          <Route path="reports" element={<PlaceholderPage title="گزارشات" />} />
        </Route>
        <Route
          path="/student"
          element={
            <InstallGuard>
              <ProtectedRoute>
                <DashboardLayout allowedRoles={['student']} />
              </ProtectedRoute>
            </InstallGuard>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="grades" element={<PlaceholderPage title="نمرات" />} />
          <Route path="homework" element={<PlaceholderPage title="تکالیف" />} />
          <Route path="study-plan" element={<PlaceholderPage title="برنامه مطالعه" />} />
          <Route path="wellness" element={<PlaceholderPage title="سلامت روان" />} />
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="*"
          element={
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-dark-600 mb-4">۴۰۴</h1>
                <p className="text-dark-400 mb-6">صفحه مورد نظر یافت نشد</p>
                <a
                  href="/"
                  className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
                >
                  بازگشت به صفحه اصلی
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;