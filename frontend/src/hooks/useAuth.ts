import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface AuthResult {
  rol: string | null;
  username: string;
  logout: () => void;
}

export default function useAuth(): AuthResult {
  const navigate = useNavigate();

  const rol = localStorage.getItem("rol");
  const username = localStorage.getItem("username") || "Usuario";

  const logout = useCallback(() => {
    localStorage.clear();
    navigate("/login");
  }, [navigate]);

  return { rol, username, logout };
}
