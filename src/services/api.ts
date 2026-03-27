import axios, { type AxiosInstance } from "axios";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    total: number;
  };
}

const DEFAULT_API_URL = "https://limited-zonda-trouw-e468592b.koyeb.app/";
const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? DEFAULT_API_URL;

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
});

api.interceptors.response.use((response) => response.data);

