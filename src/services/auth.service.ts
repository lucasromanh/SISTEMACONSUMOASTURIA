import backendApi from './api.service';
import { ENDPOINTS } from '@/config/api';
import type { User } from '@/types/auth';

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    message?: string;
    user?: {
        id: number;
        username: string;
        display_name: string;
        role: string;
        is_active: boolean;
        areas: Array<{
            code: string;
            name: string;
        }>;
    };
}

class AuthService {
    async login(username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> {
        try {
            const response = await backendApi.post<LoginResponse>(ENDPOINTS.AUTH.LOGIN, {
                username,
                password,
            });

            if (response.success && response.user) {
                // Transformar respuesta del backend al formato del frontend
                const user: User = {
                    id: response.user.id,
                    username: response.user.username,
                    displayName: response.user.display_name,
                    role: response.user.role as any,
                    isActive: response.user.is_active,
                    areas: response.user.areas,
                };

                return {
                    success: true,
                    user,
                };
            }

            return {
                success: false,
                message: response.message || 'Error al iniciar sesión',
            };
        } catch (error: any) {
            console.error('Login error:', error);
            return {
                success: false,
                message: error.message || 'Error de conexión con el servidor',
            };
        }
    }
}

export const authService = new AuthService();
export default authService;
