import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore, isTokenValid } from '../../store/authStore';
import { Sidebar } from './Sidebar';
import type { UserRole } from '../../types';

interface DashboardLayoutProps {
  allowedRoles: UserRole[];
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ allowedRoles }) => {
  const { user, token, isAuthenticated, logout } = useAuthStore();

  // Check authentication
  if (!isAuthenticated || !user || !token) {
    return <Navigate to="/login" replace />;
  }

  // Check token validity
  if (!isTokenValid(token)) {
    logout();
    return <Navigate to="/login" replace />;
  }

  // Check role authorization
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Sidebar />
      <main className="pr-64 min-h-screen">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
