import { useNavigate } from "react-router-dom";

export default function Logout(){
    const navigate = useNavigate();
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("rol");
        navigate("/login")
    };
    return (
        <button onClick={handleLogout}>
            Cerrar Sesion
        </button>
    )
}
