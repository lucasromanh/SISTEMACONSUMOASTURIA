import type { UserRole } from '@/types/auth';
import { Badge } from '@/components/ui/badge';

const roleConfig: Record<UserRole, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  ADMIN: { label: 'Administrador', variant: 'default' },
  WINNE_BAR: { label: 'Winne Bar', variant: 'secondary' },
  BARRA_PILETA: { label: 'Barra Pileta', variant: 'secondary' },
  FINCA: { label: 'La Finca', variant: 'secondary' },
  RESTAURANTE: { label: 'Restaurante', variant: 'secondary' },
};

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const config = roleConfig[role];
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
