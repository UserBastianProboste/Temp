import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { theme } from './theme/theme'; // Import nombrado, no default
import Login from './pages/login';
import RegisterEstudiantes from './pages/registerEstudiantes';
import DashboardEstudiante from './pages/dashboardEstudiante';
import DashboardCoordinador from './pages/dashboardCoordinador';

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
import CoordinadorCrearUsuario from './pages/coordinadorCrearUsuario';
import CoordinadorInformesEstudiantes from './pages/coordinadorInformesEstudiantes';
import CalificarAutoevaluacion from './pages/CalificarAutoevaluacion';
import ListaAutoevaluaciones from './pages/ListaAutoevaluaciones';
import PreguntasFrecuentes from './pages/preguntasFrecuentes';
import EvaluacionSupervisorPublica from './pages/EvaluacionSupervisorPublica';
import AuthCallback from "./pages/AuthCallback";
import ProfileSettings from './pages/ProfileSettings';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/evaluacion-supervisor/:token" element={<EvaluacionSupervisorPublica />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/autoevaluacion" element={<Autoevaluacion />} />
            <Route path="/historial_solicitudes" element={<HistorialSolicitudes />} />

            {/* Rutas protegidas por autenticación */}
            <Route path='/' element={<RouteGuard />}>

              <Route path="perfil" element={<ProfileSettings />} />

              {/* Rutas para el rol de estudiante */}
              <Route path='/estudiante' element={<RouteGuard roleAllowed='estudiante' />}>
                <Route path="/estudiante/dashboard" element={<DashboardEstudiante />} />
                <Route path='/estudiante/autoevaluacion' element={<SeleccionPractica />} />
                <Route path='/estudiante/seleccion-practica' element={<SeleccionPractica />} />
                <Route path='/estudiante/autoevaluacion/:practicaId' element={<Autoevaluacion />} />
                <Route path='/estudiante/fichapractica' element={<PracticaProfesionalForm />} />
                <Route path='/estudiante/empresas' element={<EmpresasPage />} />
                <Route path="/estudiante/adjuntar_informes" element={<AdjuntarInformes />} />
                <Route path="/estudiante/retroalimentacion" element={<Retroalimentacion />} />
                <Route path="/estudiante/preguntas-frecuentes" element={<PreguntasFrecuentes />} />
              </Route>

              {/* Rutas para el rol de coordinador */}
              <Route path='/coordinador' element={<RouteGuard roleAllowed='coordinador' />}>
                <Route path="/coordinador/dashboard" element={<DashboardCoordinador />} />
                <Route path='/coordinador/practicas' element={<CoordinadorPracticas />} />
                <Route path='/coordinador/estudiantes' element={<CoordinadorEstudiantes />} />
                <Route path='/coordinador/crear-usuario' element={<CoordinadorCrearUsuario />} />
                <Route path='/coordinador/empresas' element={<CoordinadorEmpresas />} />
                <Route path='/coordinador/informes-estudiante' element={<CoordinadorInformesEstudiantes />} />
                <Route path="/coordinador/evaluar-informe/:informeId" element={<CoordinadorEvaluarInforme />} />
                <Route path='/coordinador/autoevaluaciones' element={<ListaAutoevaluaciones />} />
                <Route path='/coordinador/calificar-autoevaluacion/:autoevaluacionId' element={<CalificarAutoevaluacion />} />
              </Route>
            </Route>
          </Routes>
        </Router>
    </ThemeProvider>
  );
}

export default App;