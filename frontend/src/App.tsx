import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login";
import RegisterEstudiante from "./pages/registerEstudiantes";
import DashboardEstudiante from "./pages/dashboardEstudiante";
import DashboardCoordinador from "./pages/dashboardCoordinador";
import FichasPracticas from "./pages/fichasPracticas";
import Empresas from "./pages/empresas";
import { useAuth } from "./context/AuthContext";

function App() {
  const { token, rol } = useAuth();
  const isLoggedIn = !!token;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<RegisterEstudiante />} />

        <Route
          path="/dashboard-estudiante"
          element={
            isLoggedIn && rol === "estudiante" ? (
              <DashboardEstudiante />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/dashboard-coordinador"
          element={
            isLoggedIn && rol === "coordinador" ? (
              <DashboardCoordinador />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/fichas-practicas"
          element={
            isLoggedIn && rol === "estudiante" ? (
              <FichasPracticas />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/empresas"
          element={
            isLoggedIn && rol === "estudiante" ? (
              <Empresas />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to={
                isLoggedIn
                  ? rol === "coordinador"
                    ? "/dashboard-coordinador"
                    : "/dashboard-estudiante"
                  : "/login"
              }
            />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
