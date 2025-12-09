export type UserRole =
  | 'ADMIN'
  | 'WINNE_BAR'
  | 'BARRA_PILETA'
  | 'FINCA'
  | 'RESTAURANTE';

export interface UserArea {
  code: string;
  name: string;
}

export interface User {
  id: number; // Backend usa ID numérico
  username: string;
  displayName: string;
  role: UserRole;
  isActive?: boolean;
  areas?: UserArea[]; // Áreas asignadas al usuario
}

