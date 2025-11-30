import { Menu, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RoleBadge } from '@/components/common/RoleBadge';
import { ModeToggle } from '@/components/common/ModeToggle';
import { useAuthStore } from '@/store/authStore';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from '@/components/layout/Sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopBarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function TopBar({ sidebarOpen, setSidebarOpen }: TopBarProps) {
  const { user, logout } = useAuthStore();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="flex h-16 items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile Menu */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <Sidebar onNavigate={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-semibold text-hotel-wine-800">Hotel Asturias</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Desktop: Show full user info */}
          <div className="hidden md:flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{user.displayName}</span>
            <RoleBadge role={user.role} />
          </div>

          <div className="hidden md:block">
            <ModeToggle />
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={logout} 
            title="Cerrar sesión"
            className="hidden md:flex"
          >
            <LogOut className="h-5 w-5" />
          </Button>

          {/* Mobile: Dropdown menu with user options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{user.displayName}</span>
                  <RoleBadge role={user.role} />
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
