import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { usersService, type CreateUserRequest, type UpdateUserRequest } from '@/services/users.service';
import { useAuthStore } from '@/store/authStore';

interface UserFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user?: {
        id: number;
        username: string;
        display_name: string;
        role: string;
        is_active: boolean;
        areas: Array<{ code: string; name: string }>;
    };
    onSuccess: () => void;
}

const ROLES = [
    { value: 'ADMIN', label: 'Administrador' },
    { value: 'WINNE_BAR', label: 'Winne Bar' },
    { value: 'BARRA_PILETA', label: 'Barra Pileta' },
    { value: 'FINCA', label: 'La Finca' },
    { value: 'RESTAURANTE', label: 'Restaurante' },
];

const AREAS = [
    { code: 'WINNE_BAR', name: 'Winne Bar' },
    { code: 'BARRA_PILETA', name: 'Barra Pileta' },
    { code: 'FINCA', name: 'La Finca' },
    { code: 'RESTAURANTE', name: 'Restaurante' },
];

export function UserFormDialog({ open, onOpenChange, user, onSuccess }: UserFormProps) {
    const currentUser = useAuthStore((state) => state.user);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        display_name: '',
        role: 'WINNE_BAR',
        is_active: true,
        areas: [] as string[],
    });

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username,
                password: '',
                display_name: user.display_name,
                role: user.role,
                is_active: user.is_active,
                areas: user.areas.map(a => a.code),
            });
        } else {
            setFormData({
                username: '',
                password: '',
                display_name: '',
                role: 'WINNE_BAR',
                is_active: true,
                areas: [],
            });
        }
        setError('');
    }, [user, open]);

    const handleAreaToggle = (areaCode: string) => {
        setFormData(prev => ({
            ...prev,
            areas: prev.areas.includes(areaCode)
                ? prev.areas.filter(a => a !== areaCode)
                : [...prev.areas, areaCode],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        setLoading(true);
        setError('');

        try {
            if (user) {
                // Actualizar usuario existente
                const updateData: UpdateUserRequest = {
                    admin_id: currentUser.id,
                    user_id: user.id,
                    display_name: formData.display_name,
                    role: formData.role,
                    is_active: formData.is_active ? 1 : 0,
                    areas: formData.areas,
                };

                // Solo incluir username y password si se cambiaron
                if (formData.username !== user.username) {
                    updateData.username = formData.username;
                }
                if (formData.password) {
                    updateData.password = formData.password;
                }

                const result = await usersService.updateUser(updateData);
                if (result.success) {
                    onSuccess();
                    onOpenChange(false);
                } else {
                    setError(result.message || 'Error al actualizar usuario');
                }
            } else {
                // Crear nuevo usuario
                if (!formData.password) {
                    setError('La contraseña es requerida para nuevos usuarios');
                    setLoading(false);
                    return;
                }

                const createData: CreateUserRequest = {
                    admin_id: currentUser.id,
                    username: formData.username,
                    password: formData.password,
                    display_name: formData.display_name,
                    role: formData.role,
                    areas: formData.areas,
                };

                const result = await usersService.createUser(createData);
                if (result.success) {
                    onSuccess();
                    onOpenChange(false);
                } else {
                    setError(result.message || 'Error al crear usuario');
                }
            }
        } catch (err) {
            setError('Error al procesar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{user ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
                    <DialogDescription>
                        {user ? 'Modifica los datos del usuario' : 'Completa los datos para crear un nuevo usuario'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="username">Usuario</Label>
                        <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            required
                            placeholder="nombre.usuario"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">
                            Contraseña {user && <span className="text-muted-foreground text-xs">(dejar vacío para no cambiar)</span>}
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required={!user}
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="display_name">Nombre para mostrar</Label>
                        <Input
                            id="display_name"
                            value={formData.display_name}
                            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                            required
                            placeholder="Juan Pérez"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">Rol</Label>
                        <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ROLES.map((role) => (
                                    <SelectItem key={role.value} value={role.value}>
                                        {role.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Áreas asignadas</Label>
                        <div className="space-y-2">
                            {AREAS.map((area) => (
                                <div key={area.code} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={area.code}
                                        checked={formData.areas.includes(area.code)}
                                        onCheckedChange={() => handleAreaToggle(area.code)}
                                    />
                                    <Label htmlFor={area.code} className="font-normal cursor-pointer">
                                        {area.name}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="is_active"
                            checked={formData.is_active}
                            onCheckedChange={(checked: boolean) => setFormData({ ...formData, is_active: checked })}
                        />
                        <Label htmlFor="is_active" className="font-normal cursor-pointer">
                            Usuario activo
                        </Label>
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Guardando...' : user ? 'Actualizar' : 'Crear'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
