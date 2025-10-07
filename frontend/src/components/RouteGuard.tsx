import { useAuth } from "../hooks/useAuth";
import { Navigate, Outlet } from "react-router-dom";
import LoadingScreen from "./LoadingScreen";

interface AuthGuardProps {
    roleAllowed?: 'estudiante' | 'coordinador';
}

export const RouteGuard = ({roleAllowed}: AuthGuardProps) => {
    const { isAuthenticated, currentUser, role, roleLoading } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" />
    }
    if (roleLoading) return <LoadingScreen />
    // resolve role (normalize legacy 'student' to 'estudiante')
    const resolved = (role ?? (currentUser as any)?.role) as string | undefined;
    const normalized = resolved === 'student' ? 'estudiante' : resolved;
    if (roleAllowed && normalized !== roleAllowed) {
        return <Navigate to="/login" />
    }

    return <Outlet />
}
