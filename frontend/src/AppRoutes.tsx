import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import LoadingScreen from './components/LoadingScreen';
import { RouteGuard } from './components/RouteGuard';
import { coordinatorRoutes } from './routes/coordinatorRoutes';
import {
  AuthCallbackPage,
  AutoevaluacionPage,
  EvaluacionSupervisorPublicaPage,
  ForgotPasswordPage,
  HistorialSolicitudesPage,
  LoginPage,
  RegisterEstudiantesPage,
  ResetPasswordPage,
} from './routes/lazyImports';
import { studentRoutes } from './routes/studentRoutes';

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Navigate to="/register-estudiantes" replace />} />
        <Route path="/register-estudiantes" element={<RegisterEstudiantesPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/evaluacion-supervisor/:token" element={<EvaluacionSupervisorPublicaPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/autoevaluacion" element={<AutoevaluacionPage />} />
        <Route path="/historial_solicitudes" element={<HistorialSolicitudesPage />} />

        <Route element={<RouteGuard />}>
          <Route path="/estudiante" element={<RouteGuard roleAllowed="estudiante" />}>
            {studentRoutes.map(({ path, element }) => (
              <Route key={path} path={path} element={element} />
            ))}
          </Route>

          <Route path="/coordinador" element={<RouteGuard roleAllowed="coordinador" />}>
            {coordinatorRoutes.map(({ path, element }) => (
              <Route key={path} path={path} element={element} />
            ))}
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
