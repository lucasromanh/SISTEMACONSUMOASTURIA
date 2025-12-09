import { UserManagement } from '@/components/admin/UserManagement';

export function AdminUsersPage() {
    return (
        <div className="w-full bg-background">
            <div className="px-3 py-4 sm:p-6 space-y-4 sm:space-y-6 w-full">
                <UserManagement />
            </div>
        </div>
    );
}
