import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { theme } from './theme/theme'; // Import nombrado, no default
import Login from '../../../Temp/frontend/src/pages/login';
import RegisterEstudiantes from '../../../Temp/frontend/src/pages/registerEstudiantes';
import DashboardEstudiante from '../../../Temp/frontend/src/pages/dashboardEstudiante';
import DashboardCoordinador from '../../../Temp/frontend/src/pages/dashboardCoordinador';

import { RouteGuard } from './components/RouteGuard';
import SeleccionPractica from "../../../Temp/frontend/src/pages/SeleccionPractica";
import Autoevaluacion from '../../../Temp/frontend/src/pages/autoevaluacion';
import ForgotPassword from '../../../Temp/frontend/src/pages/ForgotPassword';
import ResetPassword from '../../../Temp/frontend/src/pages/ResetPassword';
import Retroalimentacion from '../../../Temp/frontend/src/pages/Retroalimentacion';
import AdjuntarInformes from "../../../Temp/frontend/src/pages/adjuntarInformesEstudiantes";
import HistorialSolicitudes from "../../../Temp/frontend/src/pages/historialSolicitudes";
import PracticaProfesionalForm from '../../../Temp/frontend/src/pages/PracticaProfesionalForm';
import CoordinadorPracticas from '../../../Temp/frontend/src/pages/coordinadorPracticas';
import CoordinadorEstudiantes from '../../../Temp/frontend/src/pages/coordinadorEstudiantes';
import CoordinadorEmpresas from '../../../Temp/frontend/src/pages/coordinadorEmpresas';
import PreguntasFrecuentes from '../../../Temp/frontend/src/pages/preguntasFrecuentes';
import EvaluacionSupervisorPublica from '../../../Temp/frontend/src/pages/EvaluacionSupervisorPublica';
import AuthCallback from "../../../Temp/frontend/src/pages/AuthCallback";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterEstudiantes />} />
            <Route
              path="/register-estudiantes"
              element={<RegisterEstudiantes />}
            />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/evaluacion-supervisor/:token" element={<EvaluacionSupervisorPublica />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/autoevaluacion" element={<Autoevaluacion />} />
            <Route path="/historial_solicitudes" element={<HistorialSolicitudes />} />

            {/* Rutas protegidas por autenticación */}
            <Route path='/' element={<RouteGuard />}>

              {/* Rutas para el rol de estudiante */}
              <Route path='/estudiante' element={<RouteGuard roleAllowed='estudiante' />}>
                <Route path="/estudiante/dashboard" element={<DashboardEstudiante />} />
                <Route path='/estudiante/autoevaluacion' element={<SeleccionPractica />} />
                <Route path='/estudiante/seleccion-practica' element={<SeleccionPractica />} />
                <Route path='/estudiante/autoevaluacion/:practicaId' element={<Autoevaluacion />} />
                <Route path='/estudiante/fichapractica' element={<PracticaProfesionalForm />} />
                <Route path="/estudiante/adjuntar_informes" element={<AdjuntarInformes />} />
                <Route path="/estudiante/retroalimentacion" element={<Retroalimentacion />} />
                <Route path="/estudiante/preguntas-frecuentes" element={<PreguntasFrecuentes />} />
              </Route>

              {/* Rutas para el rol de coordinador */}
              <Route path='/coordinador' element={<RouteGuard roleAllowed='coordinador' />}>
                <Route path="/coordinador/dashboard" element={<DashboardCoordinador />} />
                <Route path='/coordinador/practicas' element={<CoordinadorPracticas />} />
                <Route path='/coordinador/estudiantes' element={<CoordinadorEstudiantes />} />
                <Route path='/coordinador/empresas' element={<CoordinadorEmpresas />} />
              </Route>
            </Route>
          </Routes>
        </Router>
    </ThemeProvider>
  );
}

export default App;