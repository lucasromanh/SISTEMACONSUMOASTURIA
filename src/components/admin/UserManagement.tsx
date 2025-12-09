import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserPlus, Pencil, Trash2, Shield, Users } from 'lucide-react';
import { usersService, type UserBackend } from '@/services/users.service';
import { useAuthStore } from '@/store/authStore';
import { UserFormDialog } from './UserFormDialog';

const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Administrador',
    WINNE_BAR: 'Winne Bar',
    BARRA_PILETA: 'Barra Pileta',
    FINCA: 'La Finca',
    RESTAURANTE: 'Restaurante',
};

export function UserManagement() {
    const currentUser = useAuthStore((state) => state.user);
    const [users, setUsers] = useState<UserBackend[]>([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserBackend | undefined>();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserBackend | null>(null);

    const loadUsers = async () => {
        if (!currentUser) return;

        setLoading(true);
        try {
            const result = await usersService.listUsers(currentUser.id);
            if (result.success) {
                setUsers(result.users);
            }
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, [currentUser]);

    const handleEdit = (user: UserBackend) => {
        setSelectedUser(user);
        setFormOpen(true);
    };

    const handleCreate = () => {
        setSelectedUser(undefined);
        setFormOpen(true);
    };

    const handleDeleteClick = (user: UserBackend) => {
        setUserToDelete(user);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!currentUser || !userToDelete) return;

        try {
            const result = await usersService.deleteUser(currentUser.id, userToDelete.id);
            if (result.success) {
                await loadUsers();
                setDeleteDialogOpen(false);
                setUserToDelete(null);
            }
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
        }
    };

    const handleFormSuccess = () => {
        loadUsers();
    };

    if (currentUser?.role !== 'ADMIN') {
        return (
            <Card>
                <CardContent className="p-6">
                    <p className="text-muted-foreground">No tienes permisos para gestionar usuarios.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Gestión de Usuarios
                            </CardTitle>
                            <CardDescription>Administra los usuarios del sistema</CardDescription>
                        </div>
                        <Button onClick={handleCreate}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Nuevo Usuario
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Cargando usuarios...</div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No hay usuarios registrados</div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Usuario</TableHead>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Rol</TableHead>
                                        <TableHead>Áreas</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {user.role === 'ADMIN' && <Shield className="h-4 w-4 text-hotel-wine-600" />}
                                                    {user.username}
                                                </div>
                                            </TableCell>
                                            <TableCell>{user.display_name}</TableCell>
                                            <TableCell>
                                                <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                                                    {ROLE_LABELS[user.role] || user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {user.areas.length > 0 ? (
                                                        user.areas.map((area) => (
                                                            <Badge key={area.code} variant="outline" className="text-xs">
                                                                {area.name}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Sin áreas</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.is_active ? 'default' : 'secondary'}>
                                                    {user.is_active ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(user)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteClick(user)}
                                                        disabled={user.id === currentUser.id}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <UserFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                user={selectedUser}
                onSuccess={handleFormSuccess}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que deseas eliminar al usuario <strong>{userToDelete?.username}</strong>?
                            Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
