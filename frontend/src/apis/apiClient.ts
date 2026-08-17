import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';

import type { ApiError, ApiRequestOptions, ApiResult } from '../types/api';
import { appConfig } from '../utils/env';

declare module 'axios' {
  export interface AxiosRequestConfig {
    _authToken?: string | null;
    _authRefreshAttempted?: boolean;
  }

  export interface InternalAxiosRequestConfig {
    _authToken?: string | null;
    _authRefreshAttempted?: boolean;
  }
}

interface BackendErrorPayload {
  message?: unknown;
  errorMessage?: unknown;
}

interface ApiClientRuntime {
  getToken?: () => string | null;
  onUnauthenticated?: (error: ApiError) => void;
  refreshToken?: () => Promise<string | null>;
}

let runtimeConfig: ApiClientRuntime = {};

export const axiosApiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: {
    accept: 'application/json',
  },
});

function errorKindForStatus(status: number): ApiError['kind'] {
  if (status === 400 || status === 413 || status === 415 || status === 422) return 'validation';
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'unauthorized';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status >= 500) return 'server';
  return 'unexpected';
}

function readMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const { message, errorMessage } = payload as BackendErrorPayload;
    for (const candidate of [message, errorMessage]) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate;
      }
    }
  }
  return fallback;
}

function normalizeAxiosError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return {
      kind: 'unexpected',
      status: null,
      message: error instanceof Error ? error.message : 'Request failed',
      details: error,
    };
  }

  const status = error.response?.status ?? null;
  if (status === null) {
    return {
      kind: 'network',
      status: null,
      message: error.message || 'Network request failed',
      details: {
        code: error.code,
        message: error.message,
      },
    };
  }

  return {
    kind: errorKindForStatus(status),
    status,
    message: readMessage(error.response?.data, error.message || `Request failed with status ${status}`),
    details: error.response?.data,
  };
}

export function configureApiClient(config: ApiClientRuntime): void {
  runtimeConfig = config;
}

axiosApiClient.interceptors.request.use((config) => {
  const token = config._authToken ?? runtimeConfig.getToken?.() ?? null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosApiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const normalizedError = normalizeAxiosError(error);
    if (!originalRequest._authRefreshAttempted && runtimeConfig.refreshToken) {
      originalRequest._authRefreshAttempted = true;
      const refreshedToken = await runtimeConfig.refreshToken();
      if (refreshedToken) {
        originalRequest._authToken = refreshedToken;
        originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
        return axiosApiClient(originalRequest);
      }
    }

    runtimeConfig.onUnauthenticated?.(normalizedError);
    return Promise.reject(error);
  },
);

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResult<T>> {
  try {
    const requestConfig: AxiosRequestConfig = {
      url: path,
      method: options.method ?? 'GET',
      data: options.body,
      headers: options.headers,
      _authToken: options.token,
    };

    const response = await axiosApiClient.request<T>(requestConfig);
    return { ok: true, data: response.data };
  } catch (error) {
    return {
      ok: false,
      error: normalizeAxiosError(error),
    };
  }
}
