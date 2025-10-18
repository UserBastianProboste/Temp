import { Navigate, Outlet } from "react-router-dom";
import LoadingScreen from "./LoadingScreen";
import { useAuth } from "../hooks/useAuth";
import { Box, CircularProgress } from "@mui/material";

type AuthGuardProps = {
    roleAllowed?: 'estudiante' | 'coordinador';
}

export const RouteGuard = ({roleAllowed}: AuthGuardProps) => {
    const { isAuthenticated, role, roleLoading, loading } = useAuth();

    // ✅ Mostrar loading mientras verifica la sesión inicial
    if (loading) {
        return (
            <Box 
                display="flex" 
                justifyContent="center" 
                alignItems="center" 
                minHeight="100vh"
            >
                <CircularProgress />
            </Box>
        );
    }

    // ✅ Redirigir a login si no está autenticado
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    // ✅ Mostrar loading mientras carga el rol
    if (roleLoading) {
        return (
            <Box 
                display="flex" 
                justifyContent="center" 
                alignItems="center" 
                minHeight="100vh"
            >
                <CircularProgress />
            </Box>
        );
    }

    // ✅ Verificar rol si se especificó uno
    if (roleAllowed) {
        const normalized = role?.toLowerCase();

        if (normalized !== roleAllowed) {
            // Redirigir al dashboard correcto según el rol del usuario
            if (normalized === 'coordinador') {
                return <Navigate to="/coordinador/dashboard" replace />
            } else if (normalized === 'estudiante') {
                return <Navigate to="/estudiante/dashboard" replace />
            }
            // Si no tiene un rol válido, redirigir a login
            return <Navigate to="/login" replace />
        }
    }

    return <Outlet />
}