import { createContext, useContext, useState, ReactNode } from "react";

interface AuthContextType {
  token: string | null;
  rol: string | null;
  setAuth: (token: string, rol: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [rol, setRol] = useState<string | null>(localStorage.getItem("rol"));

  const setAuth = (newToken: string, newRol: string) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("rol", newRol);
    setToken(newToken);
    setRol(newRol);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    setToken(null);
    setRol(null);
  };

  return (
    <AuthContext.Provider value={{ token, rol, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

