import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login";
import RegisterEstudiante from "./pages/registerEstudiantes";
import DashboardEstudiante from "./pages/dashboardEstudiante";
import DashboardCoordinador from "./pages/dashboardCoordinador";

function App() {
  const isLoggedIn = !!localStorage.getItem("token");
  const rol = localStorage.getItem("rol");

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<RegisterEstudiante />} />

        <Route
          path="/dashboard-estudiante"
          element={
            isLoggedIn && rol === "estudiante"
              ? <DashboardEstudiante />
              : <Navigate to="/login" />
          }
        />

        <Route
          path="/dashboard-coordinador"
          element={
            isLoggedIn && rol === "coordinador"
              ? <DashboardCoordinador />
              : <Navigate to="/login" />
          }
        />

        <Route path="/" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;
