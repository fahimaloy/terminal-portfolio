import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { logout } from '../../utils/adminPageGuard';

type AdminLayoutProps = {
  children: React.ReactNode;
  user: { username: string; email: string | null } | null;
};

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, user }) => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    await router.push('/sudosuperuser-ostaad/login');
  };

  const isActive = (path: string) => router.pathname === path;

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      <div className="border-b border-green-400">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm">{user?.username}</span>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-3 py-1 bg-green-400 text-black hover:bg-green-300 disabled:opacity-50 text-sm font-bold"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>

          <nav className="flex gap-4 text-sm">
            <Link
              href="/sudosuperuser-ostaad"
              className={`px-3 py-2 border ${
                isActive('/sudosuperuser-ostaad')
                  ? 'bg-green-400 text-black'
                  : 'border-green-400 hover:bg-green-400 hover:text-black'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/sudosuperuser-ostaad/profile"
              className={`px-3 py-2 border ${
                isActive('/sudosuperuser-ostaad/profile')
                  ? 'bg-green-400 text-black'
                  : 'border-green-400 hover:bg-green-400 hover:text-black'
              }`}
            >
              Profile
            </Link>
            <Link
              href="/sudosuperuser-ostaad/skills"
              className={`px-3 py-2 border ${
                isActive('/sudosuperuser-ostaad/skills')
                  ? 'bg-green-400 text-black'
                  : 'border-green-400 hover:bg-green-400 hover:text-black'
              }`}
            >
              Skills
            </Link>
            <Link
              href="/sudosuperuser-ostaad/projects"
              className={`px-3 py-2 border ${
                isActive('/sudosuperuser-ostaad/projects')
                  ? 'bg-green-400 text-black'
                  : 'border-green-400 hover:bg-green-400 hover:text-black'
              }`}
            >
              Projects
            </Link>
            <Link
              href="/sudosuperuser-ostaad/media"
              className={`px-3 py-2 border ${
                isActive('/sudosuperuser-ostaad/media')
                  ? 'bg-green-400 text-black'
                  : 'border-green-400 hover:bg-green-400 hover:text-black'
              }`}
            >
              Media
            </Link>
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
};
