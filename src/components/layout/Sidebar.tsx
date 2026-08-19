import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  BarChart3,
  Brain,
  Settings,
  LogOut,
  UserCheck,
  Calendar,
  FileText,
  Bell,
  Heart,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types';

interface SidebarItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

const getSidebarItems = (role: UserRole): SidebarItem[] => {
  switch (role) {
    case 'admin':
      return [
        { path: '/admin', label: 'داشبورد', icon: LayoutDashboard },
        { path: '/admin/students', label: 'دانش‌آموزان', icon: Users },
        { path: '/admin/teachers', label: 'دبیران', icon: GraduationCap },
        { path: '/admin/consultants', label: 'مشاوران', icon: UserCheck },
        { path: '/admin/grades', label: 'پایه‌ها و کلاس‌ها', icon: BookOpen },
        { path: '/admin/analytics', label: 'تحلیل مدرسه', icon: BarChart3 },
        { path: '/admin/ai-reports', label: 'گزارشات هوشمند', icon: Brain },
        { path: '/admin/settings', label: 'تنظیمات', icon: Settings },
      ];
    case 'teacher':
      return [
        { path: '/teacher', label: 'داشبورد', icon: LayoutDashboard },
        { path: '/teacher/classes', label: 'کلاس‌های من', icon: GraduationCap },
        { path: '/teacher/attendance', label: 'حضور و غیاب', icon: ClipboardList },
        { path: '/teacher/homework', label: 'تکالیف', icon: FileText },
        { path: '/teacher/exams', label: 'آزمون‌ها', icon: BookOpen },
        { path: '/teacher/reports', label: 'گزارشات', icon: BarChart3 },
      ];
    case 'consultant':
      return [
        { path: '/consultant', label: 'داشبورد', icon: LayoutDashboard },
        { path: '/consultant/students', label: 'دانش‌آموزان', icon: Users },
        { path: '/consultant/risk-alerts', label: 'هشدارها', icon: Bell },
        { path: '/consultant/mental-health', label: 'سلامت روان', icon: Heart },
        { path: '/consultant/guidance', label: 'هدایت تحصیلی', icon: Target },
        { path: '/consultant/reports', label: 'گزارشات', icon: BarChart3 },
      ];
    case 'parent':
      return [
        { path: '/parent', label: 'داشبورد', icon: LayoutDashboard },
        { path: '/parent/progress', label: 'پیشرفت تحصیلی', icon: TrendingUp },
        { path: '/parent/attendance', label: 'حضور و غیاب', icon: Calendar },
        { path: '/parent/homework', label: 'تکالیف', icon: FileText },
        { path: '/parent/reports', label: 'گزارشات', icon: BarChart3 },
      ];
    case 'student':
      return [
        { path: '/student', label: 'داشبورد', icon: LayoutDashboard },
        { path: '/student/grades', label: 'نمرات', icon: BookOpen },
        { path: '/student/homework', label: 'تکالیف', icon: FileText },
        { path: '/student/study-plan', label: 'برنامه مطالعه', icon: Calendar },
        { path: '/student/wellness', label: 'سلامت روان', icon: Heart },
      ];
    default:
      return [];
  }
};

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  if (!user) return null;

  const items = getSidebarItems(user.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleLabel = (role: UserRole): string => {
    const labels: Record<UserRole, string> = {
      admin: 'مدیر سیستم',
      teacher: 'دبیر',
      consultant: 'مشاور',
      parent: 'والدین',
      student: 'دانش‌آموز',
    };
    return labels[role];
  };

  return (
    <aside className="fixed right-0 top-0 h-screen w-64 bg-dark-900 border-l border-dark-700 flex flex-col z-40">
      {/* Header */}
      <div className="p-6 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600/20 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h2 className="font-bold text-dark-100">SIP</h2>
            <p className="text-xs text-dark-500">سامانه هوشمند</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === `/${user.role}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-600/20 text-primary-400'
                      : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-dark-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-dark-700 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-dark-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-dark-100 truncate">{user.fullName}</p>
            <p className="text-xs text-dark-500">{getRoleLabel(user.role)}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>خروج از سیستم</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
