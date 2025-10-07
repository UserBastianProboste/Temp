import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingScreen from './LoadingScreen';

interface ProtectedRouteProps {
  allowedRole?: 'estudiante' | 'coordinador';
  children: React.ReactNode;
}

function roleMatches(allowed: string | undefined, actual: string | undefined) {
  if (!allowed) return true;
  if (!actual) return false;
  const a = actual.toLowerCase();
  const allowedLower = allowed.toLowerCase();
  if (allowedLower === 'estudiante') {
    return a === 'estudiante' || a === 'authenticated';
  }
  if (allowedLower === 'coordinador') {
    return a === 'coordinador';
  }
  return a === allowedLower;
}

export default function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const { isAuthenticated, currentUser, loading, role, roleLoading } = useAuth();
  if (loading || roleLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const actualRole = (role ?? (currentUser as any)?.role) as string | undefined;
  if (allowedRole) {
    if (allowedRole === 'estudiante') {
      if (!isAuthenticated) return <Navigate to="/login" replace />;
    } else {
      if (!roleMatches(allowedRole, actualRole)) return <Navigate to="/login" replace />;
    }
  }
  return <>{children}</>;
}
