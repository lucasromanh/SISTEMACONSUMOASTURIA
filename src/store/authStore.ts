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
const storedUser = localStorage.getItem('user');
if (storedUser) {
  try {
    const user = JSON.parse(storedUser);
    useAuthStore.setState({ user, isAuthenticated: true });
  } catch (e) {
    console.error('Error al cargar usuario desde localStorage', e);
  }
}

