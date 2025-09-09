import useAuth from "../hooks/useAuth";

export default function Logout() {
    const { logout } = useAuth();
    return (
        <button onClick={logout}>
            Cerrar Sesion
        </button>
    );
}
