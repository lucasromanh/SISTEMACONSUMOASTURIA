import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG } from '@/config/api';

// Tipos para respuestas del backend
export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    error?: string;
    [key: string]: any;
}

class ApiService {
    private axiosInstance: AxiosInstance;

    constructor(baseURL: string) {
        this.axiosInstance = axios.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 30000, // 30 segundos
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

    // GET request
    async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const response: AxiosResponse<ApiResponse<T>> = await this.axiosInstance.get(url, config);
            return response.data;
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    // POST request
    async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const response: AxiosResponse<ApiResponse<T>> = await this.axiosInstance.post(url, data, config);
            return response.data;
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    // PUT request
    async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const response: AxiosResponse<ApiResponse<T>> = await this.axiosInstance.put(url, data, config);
            return response.data;
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    // DELETE request
    async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const response: AxiosResponse<ApiResponse<T>> = await this.axiosInstance.delete(url, config);
            return response.data;
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    // Manejo de errores
    private handleError(error: any): ApiResponse {
        if (error.response?.data) {
            // El backend devolvió una respuesta de error
            return error.response.data;
        }

        // Error de red u otro tipo de error
        return {
            success: false,
            message: 'Error de conexión con el servidor',
            error: error.message,
        };
    }
}

// Instancia para el backend principal
export const backendApi = new ApiService(API_CONFIG.BACKEND_BASE_URL);

// Instancia para caja diaria (para uso futuro)
export const cajaDiariaApi = new ApiService(API_CONFIG.CAJA_DIARIA_BASE_URL);

export default backendApi;
