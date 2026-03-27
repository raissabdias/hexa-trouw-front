import axios, { type AxiosInstance } from "axios";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    total: number;
  };
}

export const api: AxiosInstance = axios.create({
  baseURL: "https://limited-zonda-trouw-e468592b.koyeb.app/",
});

api.interceptors.response.use((response) => response.data);

