import React, { createContext, useContext, useState } from "react";
import { authService, type LoginResponseData } from "../services/auth.service";

interface AuthContextType {
  isAuthenticated: boolean;
  user: LoginResponseData | null;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LoginResponseData | null>(authService.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(authService.isAuthenticated());

  const login = async (loginStr: string, password: string) => {
    const response = await authService.login(loginStr, password);
    if (response.success) {
      setUser(response.data);
      setIsAuthenticated(true);
    } else {
      throw new Error(response.message || "Login falhou");
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
