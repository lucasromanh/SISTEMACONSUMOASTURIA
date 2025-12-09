import backendApi from './api.service';
import { ENDPOINTS } from '@/config/api';

// Interfaces para usuarios
export interface CreateUserRequest {
    admin_id: number;
    username: string;
    password: string;
    display_name: string;
    role: string;
    areas: string[]; // Array de códigos de área
}

export interface CreateUserResponse {
    success: boolean;
    id: number;
    message?: string;
}

export interface UpdateUserRequest {
    admin_id: number;
    user_id: number;
    username?: string;
    password?: string;
    display_name?: string;
    role?: string;
    is_active?: number;
    areas?: string[];
}

export interface UserBackend {
    id: number;
    username: string;
    display_name: string;
    role: string;
    is_active: boolean;
    created_at: string;
    areas: Array<{
        code: string;
        name: string;
    }>;
}

export interface ListUsersResponse {
    success: boolean;
    users: UserBackend[];
    message?: string;
}

class UsersService {
    // Listar todos los usuarios (solo ADMIN)
    async listUsers(adminId: number): Promise<ListUsersResponse> {
        const response = await backendApi.post(
            ENDPOINTS.USERS.LIST,
            {
                admin_id: adminId,
            }
        );

        if (response.success) {
            return {
                success: true,
                users: response.users || [],
                message: response.message,
            };
        }

        return {
            success: false,
            users: [],
            message: response.message || 'Error al listar usuarios',
        };
    }

    // Crear un nuevo usuario (solo ADMIN)
    async createUser(data: CreateUserRequest): Promise<CreateUserResponse> {
        const response = await backendApi.post(
            ENDPOINTS.USERS.CREATE,
            data
        );

        if (response.success) {
            return {
                success: true,
                id: response.id || 0,
                message: response.message,
            };
        }

        return {
            success: false,
            id: 0,
            message: response.message || 'Error al crear usuario',
        };
    }

    // Actualizar un usuario (solo ADMIN)
    async updateUser(data: UpdateUserRequest): Promise<{ success: boolean; message?: string }> {
        const response = await backendApi.post(
            ENDPOINTS.USERS.UPDATE,
            data
        );

        return {
            success: response.success || false,
            message: response.message,
        };
    }

    // Eliminar un usuario (solo ADMIN)
    async deleteUser(adminId: number, userId: number): Promise<{ success: boolean; message?: string }> {
        const response = await backendApi.post(
            ENDPOINTS.USERS.DELETE,
            {
                admin_id: adminId,
                user_id: userId,
            }
        );

        return {
            success: response.success || false,
            message: response.message,
        };
    }
}

export const usersService = new UsersService();
export default usersService;
