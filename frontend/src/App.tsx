import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme/theme';

import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';

import Login from './pages/login';
import RegisterEstudiantes from './pages/registerEstudiantes';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import DashboardEstudiante from './pages/dashboardEstudiante';
import DashboardCoordinador from './pages/dashboardCoordinador';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRole?: 'estudiante' | 'coordinador' }> =
  ({ children, allowedRole }) => {
    const { user, role, loading } = useAuth();
    if (loading) return <div style={{ padding: 40 }}>Cargando...</div>;
    if (!user) return <Navigate to="/login" replace />;
    if (allowedRole && role !== allowedRole) return <Navigate to="/login" replace />;
    return <>{children}</>;
  };

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterEstudiantes />} />
            <Route path="/register-estudiantes" element={<RegisterEstudiantes />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route
              path="/dashboard-estudiante"
              element={
                <ProtectedRoute allowedRole="estudiante">
                  <DashboardEstudiante />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard-coordinador"
              element={
                <ProtectedRoute allowedRole="coordinador">
                  <DashboardCoordinador />
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;