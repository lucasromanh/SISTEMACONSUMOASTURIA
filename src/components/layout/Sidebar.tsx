import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Coffee,
  Waves,
  TreePine,
  UtensilsCrossed,
  Wallet,
  Package,
  Receipt,
  Users,
  ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CierreCajaButton } from '@/components/cajas/CierreCajaButton';
import { EnviarCargosHabitacionButton } from '@/components/cajas/EnviarCargosHabitacionButton';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard Global',
    href: '/dashboard/admin',
    icon: LayoutDashboard,
    roles: ['ADMIN'],
  },
  {
    title: 'Winne Bar',
    href: '/dashboard/winnebar',
    icon: Coffee,
    roles: ['ADMIN', 'WINNE_BAR'],
  },
  {
    title: 'Barra Pileta',
    href: '/dashboard/barra-pileta',
    icon: Waves,
    roles: ['ADMIN', 'BARRA_PILETA'],
  },
  {
    title: 'La Finca',
    href: '/dashboard/finca',
    icon: TreePine,
    roles: ['ADMIN', 'FINCA'],
  },
  {
    title: 'Restaurante',
    href: '/dashboard/restaurante',
    icon: UtensilsCrossed,
    roles: ['ADMIN', 'RESTAURANTE'],
  },
];

const otherNavItems: NavItem[] = [
  {
    title: 'Cajas',
    href: '/dashboard/cajas',
    icon: Wallet,
  },
  {
    title: 'Stock',
    href: '/dashboard/stock',
    icon: Package,
  },
  {
    title: 'Gastos',
    href: '/dashboard/gastos',
    icon: Receipt,
  },
];

const adminNavItems: NavItem[] = [
  {
    title: 'Usuarios',
    href: '/dashboard/admin/users',
    icon: Users,
    roles: ['ADMIN'],
  },
  {
    title: 'Productos',
    href: '/dashboard/admin/products',
    icon: ShoppingCart,
    roles: ['ADMIN'],
  },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const location = useLocation();
  const { user } = useAuthStore();

  if (!user) return null;

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user.role)
  );

  return (
    <div className="flex h-full flex-col border-r bg-background">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-hotel-wine-800">Consumos</h2>
        <p className="text-xs text-muted-foreground">Sistema de Gestión</p>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1">
          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">ÁREAS</p>
          {filteredNavItems.map((item) => {
            const getAreaColor = (href: string) => {
              if (href.includes('winnebar')) return location.pathname === href ? 'bg-amber-100 text-amber-900 border-l-4 border-amber-600 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-600' : 'text-muted-foreground hover:bg-amber-50 dark:hover:bg-amber-900/20';
              if (href.includes('barra-pileta')) return location.pathname === href ? 'bg-blue-100 text-blue-900 border-l-4 border-blue-600 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-600' : 'text-muted-foreground hover:bg-blue-50 dark:hover:bg-blue-900/20';
              if (href.includes('finca')) return location.pathname === href ? 'bg-green-100 text-green-900 border-l-4 border-green-600 dark:bg-green-900/30 dark:text-green-400 dark:border-green-600' : 'text-muted-foreground hover:bg-green-50 dark:hover:bg-green-900/20';
              if (href.includes('restaurante')) return location.pathname === href ? 'bg-red-100 text-red-900 border-l-4 border-red-600 dark:bg-red-900/30 dark:text-red-400 dark:border-red-600' : 'text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20';
              return location.pathname === href ? 'bg-hotel-wine-100 text-hotel-wine-900 font-medium dark:bg-hotel-wine-900/30 dark:text-hotel-wine-400' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground';
            };

            return (
              <Link key={item.href} to={item.href} onClick={onNavigate}>
                <span
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors font-medium',
                    getAreaColor(item.href)
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </span>
              </Link>
            );
          })}
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">GESTIÓN</p>
          {otherNavItems.map((item) => (
            <Link key={item.href} to={item.href} onClick={onNavigate}>
              <span
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  location.pathname === item.href
                    ? 'bg-hotel-wine-100 text-hotel-wine-900 font-medium dark:bg-hotel-wine-900/30 dark:text-hotel-wine-400'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </span>
            </Link>
          ))}
        </div>

        {user.role === 'ADMIN' && (
          <>
            <Separator className="my-4" />
            <div className="space-y-1">
              <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">ADMINISTRACIÓN</p>
              {adminNavItems.map((item) => (
                <Link key={item.href} to={item.href} onClick={onNavigate}>
                  <span
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      location.pathname === item.href
                        ? 'bg-hotel-wine-100 text-hotel-wine-900 font-medium dark:bg-hotel-wine-900/30 dark:text-hotel-wine-400'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}

        <Separator className="my-4" />

        {/* Botón de Cierre de Caja */}
        {/* Botón de Cierre de Caja */}
        <div className="px-3 pb-3 space-y-2">
          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">CIERRE DE CAJA</p>
          <CierreCajaButton
            variant="outline"
            area={user.role === 'ADMIN' ? undefined :
              user.role === 'WINNE_BAR' ? 'WINNE_BAR' :
                user.role === 'BARRA_PILETA' ? 'BARRA_PILETA' :
                  user.role === 'FINCA' ? 'FINCA' :
                    user.role === 'RESTAURANTE' ? 'RESTAURANTE' : undefined
            }
          />
          <EnviarCargosHabitacionButton
            variant="outline"
            area={user.role === 'ADMIN' ? undefined :
              user.role === 'WINNE_BAR' ? 'WINNE_BAR' :
                user.role === 'BARRA_PILETA' ? 'BARRA_PILETA' :
                  user.role === 'FINCA' ? 'FINCA' :
                    user.role === 'RESTAURANTE' ? 'RESTAURANTE' : undefined
            }
          />
        </div>
      </ScrollArea>
    </div>
  );
}
