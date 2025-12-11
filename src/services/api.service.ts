import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG } from '@/config/api';

// Tipos para respuestas del backend
export interface ApiResponse<_T = unknown> {
    success: boolean;
    message?: string;
    error?: string;
    [key: string]: any;
}

class ApiService {
    private axiosInstance: AxiosInstance;
    private maxRetries = 2; // Reintentar hasta 2 veces
    private retryDelay = 1000; // 1 segundo entre reintentos

    constructor(baseURL: string) {
        this.axiosInstance = axios.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 60000, // ✅ 60 segundos (aumentado de 30)
        });

        // Request interceptor
        this.axiosInstance.interceptors.request.use(
            (config) => {
                // Aquí podrías agregar tokens de autenticación si fuera necesario
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.axiosInstance.interceptors.response.use(
            (response) => {
                return response;
            },
            (error) => {
                // Manejo de errores global
                if (error.response) {
                    // El servidor respondió con un código de error
                    console.error('API Error:', error.response.data);
                } else if (error.request) {
                    // La petición se hizo pero no hubo respuesta
                    console.error('Network Error:', error.request);
                } else {
                    // Algo pasó al configurar la petición
                    console.error('Error:', error.message);
                }
                return Promise.reject(error);
            }
        );
    }

    // ✅ NUEVO: Función auxiliar para reintentar peticiones
    private async retryRequest<T>(
        requestFn: () => Promise<AxiosResponse<ApiResponse<T>>>,
        retries = this.maxRetries
    ): Promise<ApiResponse<T>> {
        try {
            const response = await requestFn();
            return response.data;
        } catch (error: any) {
            // Solo reintentar en errores de red o timeout
            const shouldRetry =
                retries > 0 &&
                (error.code === 'ECONNABORTED' ||
                    error.code === 'ERR_NETWORK' ||
                    !error.response);

            if (shouldRetry) {
                console.warn(`Reintentando petición... (${this.maxRetries - retries + 1}/${this.maxRetries})`);
                await this.sleep(this.retryDelay);
                return this.retryRequest(requestFn, retries - 1);
            }

            return this.handleError(error);
        }
    }

    // ✅ NUEVO: Helper para esperar
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // GET request con reintentos
    async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.retryRequest(() => this.axiosInstance.get(url, config));
    }

    // POST request con reintentos
    async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.retryRequest(() => this.axiosInstance.post(url, data, config));
    }

    // PUT request con reintentos
    async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.retryRequest(() => this.axiosInstance.put(url, data, config));
    }

    // DELETE request con reintentos
    async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.retryRequest(() => this.axiosInstance.delete(url, config));
    }

    // Manejo de errores mejorado
    private handleError(error: any): ApiResponse {
        if (error.response?.data) {
            // El backend devolvió una respuesta de error
            return error.response.data;
        }

        // ✅ MEJORADO: Mensajes más específicos según el tipo de error
        let message = 'Error de conexión con el servidor';

        if (error.code === 'ECONNABORTED') {
            message = 'La petición tardó demasiado tiempo. Verifica tu conexión a internet.';
        } else if (error.code === 'ERR_NETWORK') {
            message = 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
        } else if (error.message) {
            message = error.message;
        }

        return {
            success: false,
            message,
            error: error.code || 'UNKNOWN_ERROR',
        };
    }
}

// Instancia para el backend principal
export const backendApi = new ApiService(API_CONFIG.BACKEND_BASE_URL);

// Instancia para caja diaria (para uso futuro)
export const cajaDiariaApi = new ApiService(API_CONFIG.CAJA_DIARIA_BASE_URL);

export default backendApi;
