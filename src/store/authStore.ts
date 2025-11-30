import { create } from 'zustand';
import type { User } from '@/types/auth';

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
    // Mock users
    const users: { username: string; password: string; user: User }[] = [
      {
        username: 'admin',
        password: 'admin123',
        user: { id: '1', username: 'admin', displayName: 'Administrador', role: 'ADMIN' },
      },
      {
        username: 'winnebar',
        password: 'winne123',
        user: { id: '2', username: 'winnebar', displayName: 'Winne Bar', role: 'WINNE_BAR' },
      },
      {
        username: 'pileta',
        password: 'pileta123',
        user: { id: '3', username: 'pileta', displayName: 'Barra Pileta', role: 'BARRA_PILETA' },
      },
      {
        username: 'finca',
        password: 'finca123',
        user: { id: '4', username: 'finca', displayName: 'La Finca', role: 'FINCA' },
      },
      {
        username: 'resto',
        password: 'resto123',
        user: { id: '5', username: 'resto', displayName: 'Restaurante', role: 'RESTAURANTE' },
      },
    ];

    const foundUser = users.find((u) => u.username === username && u.password === password);

    if (foundUser) {
      set({ user: foundUser.user, isAuthenticated: true });
      localStorage.setItem('user', JSON.stringify(foundUser.user));
      return true;
    }

    return false;
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
