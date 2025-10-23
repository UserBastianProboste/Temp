import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { theme } from './theme/theme'; // Import nombrado, no default


import Login from './pages/login';
import RegisterEstudiantes from './pages/registerEstudiantes';
import DashboardEstudiante from './pages/dashboardEstudiante';
import DashboardCoordinador from './pages/dashboardCoordinador';
import EstudianteEmpresas from './pages/estudianteEmpresas';

import { RouteGuard } from './components/RouteGuard';
import SeleccionPractica from "./pages/SeleccionPractica";
import Autoevaluacion from './pages/autoevaluacion';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Retroalimentacion from './pages/Retroalimentacion';
import AdjuntarInformes from "./pages/adjuntarInformesEstudiantes";
import HistorialSolicitudes from "./pages/historialSolicitudes";
import PracticaProfesionalForm from './pages/PracticaProfesionalForm';
import CoordinadorPracticas from './pages/coordinadorPracticas';
import CoordinadorEstudiantes from './pages/coordinadorEstudiantes';
import CoordinadorEmpresas from './pages/coordinadorEmpresas';
import CoordinadorInformesEstudiantes from './pages/coordinadorInformesEstudiantes';
import CalificarAutoevaluacion from './pages/CalificarAutoevaluacion';
import ListaAutoevaluaciones from './pages/ListaAutoevaluaciones';
import PreguntasFrecuentes from './pages/preguntasFrecuentes';
import EvaluacionSupervisorPublica from './pages/EvaluacionSupervisorPublica';
import AuthCallback from "./pages/AuthCallback";
import CoordinadorEvaluarInforme from './pages/coordinadorEvaluarInforme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterEstudiantes />} />
          <Route path="/register-estudiantes" element={<RegisterEstudiantes />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/evaluacion-supervisor/:token" element={<EvaluacionSupervisorPublica />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/autoevaluacion" element={<Autoevaluacion />} />
          <Route path="/historial_solicitudes" element={<HistorialSolicitudes />} />

          {/* Rutas protegidas por autenticación */}
          <Route element={<RouteGuard />}>

            {/* Rutas para el rol de estudiante */}
            <Route path="/estudiante" element={<RouteGuard roleAllowed='estudiante' />}>
              <Route path="dashboard" element={<DashboardEstudiante />} />
              <Route path="autoevaluacion" element={<SeleccionPractica />} />
              <Route path="seleccion-practica" element={<SeleccionPractica />} />
              <Route path="autoevaluacion/:practicaId" element={<Autoevaluacion />} />
              <Route path="fichapractica" element={<PracticaProfesionalForm />} />
              <Route path="adjuntar_informes" element={<AdjuntarInformes />} />
              <Route path="retroalimentacion" element={<Retroalimentacion />} />
              <Route path="empresas" element={<EstudianteEmpresas />} />
              <Route path="preguntas-frecuentes" element={<PreguntasFrecuentes />} />
            </Route>

            {/* Rutas para el rol de coordinador */}
            <Route path="/coordinador" element={<RouteGuard roleAllowed='coordinador' />}>
              <Route path="dashboard" element={<DashboardCoordinador />} />
              <Route path="practicas" element={<CoordinadorPracticas />} />
              <Route path="estudiantes" element={<CoordinadorEstudiantes />} />
              <Route path="empresas" element={<CoordinadorEmpresas />} />
              <Route path="informes-estudiante" element={<CoordinadorInformesEstudiantes />} />
              <Route path="evaluar-informe/:informeId" element={<CoordinadorEvaluarInforme />} />
              <Route path="autoevaluaciones" element={<ListaAutoevaluaciones />} />
              <Route path="calificar-autoevaluacion/:autoevaluacionId" element={<CalificarAutoevaluacion />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
    </ThemeProvider>
  );
}

export default App;