import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-hotel-cream-100 via-white to-hotel-wine-50 dark:from-black dark:via-gray-950 dark:to-black">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
