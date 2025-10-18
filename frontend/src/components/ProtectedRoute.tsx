import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

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
  
  // Mostrar loading mientras verifica sesión
  if (loading || roleLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <div>Cargando...</div>
      </div>
    );
  }
  
  // Si no está autenticado, redirigir a login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  const actualRole = (role ?? (currentUser as any)?.role) as string | undefined;
  
  // Si se requiere un rol específico
  if (allowedRole) {
    if (!roleMatches(allowedRole, actualRole)) {
      // Redirigir al dashboard correcto según el rol del usuario
      if (actualRole === 'coordinador') {
        return <Navigate to="/coordinador/dashboard" replace />;
      } else if (actualRole === 'estudiante') {
        return <Navigate to="/estudiante/dashboard" replace />;
      }
      return <Navigate to="/login" replace />;
    }
  }
  
  return <>{children}</>;
}
