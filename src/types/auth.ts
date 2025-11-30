export type UserRole =
  | 'ADMIN'
  | 'WINNE_BAR'
  | 'BARRA_PILETA'
  | 'FINCA'
  | 'RESTAURANTE';

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
}
