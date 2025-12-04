import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { Hotel } from 'lucide-react';
import { InstallPWAButton } from '@/components/common/InstallPWAButton';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        // Obtener el usuario del store después del login
        const user = useAuthStore.getState().user;
        if (user) {
          // Importar la función helper
          const { getDefaultRouteForRole } = await import('@/store/authStore');
          const defaultRoute = getDefaultRouteForRole(user.role);
          navigate(defaultRoute, { replace: true });
        } else {
          navigate('/dashboard/winnebar', { replace: true });
        }
      } else {
        setError('Usuario o contraseña incorrectos');
      }
    } catch (err) {
      setError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <Card>
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-hotel-wine-100 dark:bg-hotel-wine-900/30 rounded-full">
              <Hotel className="h-8 w-8 text-hotel-wine-700 dark:text-hotel-wine-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-hotel-wine-900 dark:text-hotel-wine-400">Hotel Asturias</CardTitle>
          <CardDescription>Sistema de Gestión de Consumos</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="Ingrese su usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ingrese su contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted rounded-lg text-xs text-muted-foreground">
            <p className="font-semibold mb-2">Usuarios de prueba:</p>
            <ul className="space-y-1">
              <li>• admin / admin123 (Administrador)</li>
              <li>• winnebar / winne123 (Winne Bar)</li>
              <li>• pileta / pileta123 (Barra Pileta)</li>
              <li>• finca / finca123 (La Finca)</li>
              <li>• resto / resto123 (Restaurante)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
      <InstallPWAButton />
    </div>
  );
}
