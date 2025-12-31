import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore, getDefaultRouteForRole } from '@/store/authStore';
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { AdminDashboardPage } from '@/pages/dashboard/AdminDashboardPage';
import { WinneBarDashboardPage } from '@/pages/dashboard/WinneBarDashboardPage';
import { BarraPiletaDashboardPage } from '@/pages/dashboard/BarraPiletaDashboardPage';
import { FincaDashboardPage } from '@/pages/dashboard/FincaDashboardPage';
import { RestauranteDashboardPage } from '@/pages/dashboard/RestauranteDashboardPage';
import { CajasResumenPage } from '@/pages/dashboard/cajas/CajasResumenPage';
import { StockPage } from '@/pages/dashboard/stock/StockPage';
import { GastosPage } from '@/pages/dashboard/stock/GastosPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminProductsPage } from '@/pages/admin/AdminProductsPage';
import { Loader2 } from 'lucide-react';
import type { UserRole } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();

  // Dar tiempo para que se inicialice el store desde localStorage
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirigir a la ruta por defecto del usuario según su rol
    const defaultRoute = getDefaultRouteForRole(user.role);
    return <Navigate to={defaultRoute} replace />;
  }

  return <>{children}</>;
}

// Componente para redirección dinámica
function DefaultRedirect() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const defaultRoute = getDefaultRouteForRole(user.role);
  return <Navigate to={defaultRoute} replace />;
}

export function AppRouter() {
  const { isAuthenticated } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  // Dar tiempo para que se inicialice el store desde localStorage
  useEffect(() => {
    // Pequeño delay para asegurar que el store se inicialice
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-hotel-wine-600" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to={getDefaultRouteForRole(useAuthStore.getState().user?.role || '')} replace />
              ) : (
                <LoginPage />
              )
            }
          />
        </Route>

        {/* Rutas protegidas */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/winnebar"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WINNE_BAR']}>
                <WinneBarDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/barra-pileta"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'BARRA_PILETA']}>
                <BarraPiletaDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/finca"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'FINCA']}>
                <FincaDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/restaurante"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'RESTAURANTE']}>
                <RestauranteDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin/users"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin/products"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminProductsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard/cajas" element={<CajasResumenPage />} />
          <Route path="/dashboard/stock" element={<StockPage />} />
          <Route path="/dashboard/gastos" element={<GastosPage />} />
        </Route>

        {/* Redirección por defecto */}
        <Route path="/" element={<DefaultRedirect />} />
        <Route path="*" element={<DefaultRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
