import { api, type ApiResponse } from "./api";

export interface LoginResponseData {
  userId: number;
  login: string;
  accessToken: string;
}

export const authService = {
  async login(login: string, password: string): Promise<ApiResponse<LoginResponseData>> {
    const response = await api.post<any, ApiResponse<LoginResponseData>>("/auth/login", {
      login,
      password,
    });
    
    if (response.success && response.data.accessToken) {
      localStorage.setItem("accessToken", response.data.accessToken);
      localStorage.setItem("user", JSON.stringify(response.data));
    }
    
    return response;
  },

  logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
  },

  getToken(): string | null {
    return localStorage.getItem("accessToken");
  },

  getUser(): LoginResponseData | null {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
};
