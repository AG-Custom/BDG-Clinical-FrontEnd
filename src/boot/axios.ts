import axios, { AxiosError } from 'axios';

import type { ApiError, ApiResponse } from '@/types/api/api';
import { lerTokenAuth, limparAuthStorage } from '@/utils/auth-storage';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://localhost:7013',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = lerTokenAuth();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

function extractErrorMessage(error: AxiosError<ApiError | ApiResponse<unknown>>): string {
  const payload = error.response?.data;

  if (payload && typeof payload === 'object') {
    if ('message' in payload && payload.message) {
      return payload.message;
    }

    if ('detail' in payload && payload.detail) {
      return payload.detail;
    }
  }

  return error.message || 'Erro ao processar a requisição.';
}

function isAuthRoute(url?: string): boolean {
  if (!url) {
    return false;
  }

  return (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/primeiro-acesso')
  );
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError | ApiResponse<unknown>>) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url;

    if (status === 401 && !isAuthRoute(requestUrl)) {
      limparAuthStorage();

      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        const redirect = encodeURIComponent(
          `${window.location.pathname}${window.location.search}`,
        );
        window.location.assign(`/login?redirect=${redirect}`);
      }
    }

    const rejected = new Error(extractErrorMessage(error)) as Error & { status?: number };
    rejected.status = status;
    return Promise.reject(rejected);
  },
);
