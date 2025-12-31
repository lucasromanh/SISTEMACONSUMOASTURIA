import { create } from 'zustand';
import type { User } from '@/types/auth';
import { authService } from '@/services/auth.service';

// Función helper para obtener la ruta por defecto según el rol
export const getDefaultRouteForRole = (role: string): string => {
  const roleRoutes: Record<string, string> = {
    'ADMIN': '/dashboard/admin',
    'WINNE_BAR': '/dashboard/winnebar',
    'BARRA_PILETA': '/dashboard/barra-pileta',
    'FINCA': '/dashboard/finca',
    'RESTAURANTE': '/dashboard/restaurante',
  };
  return roleRoutes[role] || '/dashboard/winnebar';
};

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (username: string, password: string) => {
    try {
      const result = await authService.login(username, password);

      if (result.success && result.user) {
        set({ user: result.user, isAuthenticated: true });
        localStorage.setItem('user', JSON.stringify(result.user));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
    localStorage.removeItem('user');
  },
}));

// Inicializar desde localStorage si existe
const initializeAuth = () => {
  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      // Validar que el usuario tenga los campos necesarios
      if (user && user.id && user.username && user.role) {
        useAuthStore.setState({ user, isAuthenticated: true });
      } else {
        // Datos corruptos, limpiar
        localStorage.removeItem('user');
      }
    }
  } catch (e) {
    console.error('Error al cargar usuario desde localStorage', e);
    // En caso de error, limpiar localStorage
    localStorage.removeItem('user');
  }
};

// Inicializar al cargar la aplicación
if (typeof window !== 'undefined') {
  initializeAuth();
}

