import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { logout, clearAdminSession } from '../../utils/adminPageGuard';
import { getMeetings } from '../../utils/api';

type AdminLayoutProps = {
  children: React.ReactNode;
  user: { username: string; email: string | null } | null;
  isLoading?: boolean;
};

const navItems = [
  { path: '/sudosuperuser-ostaad', label: 'Dashboard', icon: '📊' },
  { path: '/sudosuperuser-ostaad/profile', label: 'Profile', icon: '👤' },
  { path: '/sudosuperuser-ostaad/skills', label: 'Skills', icon: '🎯' },
  { path: '/sudosuperuser-ostaad/projects', label: 'Projects', icon: '🚀' },
  { path: '/sudosuperuser-ostaad/media', label: 'Media', icon: '📁' },
  { path: '/sudosuperuser-ostaad/knowledge', label: 'Knowledge', icon: '🧠' },
  { path: '/sudosuperuser-ostaad/meetings', label: 'Meetings', icon: '📅' },
  { path: '/sudosuperuser-ostaad/ai/models', label: 'Models', icon: '🤖' },
  { path: '/sudosuperuser-ostaad/ai/usage', label: 'Usage', icon: '📈' },
];

// Logout Confirmation Modal
const LogoutConfirmation: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoggingOut: boolean;
  username: string;
}> = ({ isOpen, onClose, onConfirm, isLoggingOut, username }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={!isLoggingOut ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-[#0F172A] border border-gray-700 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-fade-in">
        <div className="text-center">
          {/* Icon */}
          <div className="text-5xl mb-4">🚪</div>

          {/* Title */}
          <h2
            id="logout-title"
            className="text-xl font-bold text-purple-400 mb-2"
          >
            Confirm Logout
          </h2>

          {/* Message */}
          <p className="text-gray-400 text-sm mb-6">
            Are you sure you want to log out,{' '}
            <span className="text-purple-400 font-bold">{username}</span>?
          </p>

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              disabled={isLoggingOut}
              className="px-4 py-2 border border-gray-600 text-gray-400 hover:bg-white/10 rounded-xl disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoggingOut}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isLoggingOut ? (
                <>
                  <span className="animate-spin">⟳</span>
                  <span>Logging out...</span>
                </>
              ) : (
                <>
                  <span>🚪</span>
                  <span>Logout</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  user,
  isLoading = false,
}) => {
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadMeetings, setUnreadMeetings] = useState(0);

  // Keyboard shortcut for logout (Ctrl+Shift+L)
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        if (!isLoggingOut) {
          setShowLogoutConfirm(true);
        }
      }
      // Escape to close modal
      if (e.key === 'Escape' && showLogoutConfirm) {
        setShowLogoutConfirm(false);
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [isLoggingOut, showLogoutConfirm]);

  useEffect(() => {
    // Fetch unread meetings count
    const fetchMeetings = async () => {
      try {
        const data = await getMeetings();
        if (data) {
          const pending = data.filter(
            (m: any) => m.status === 'pending',
          ).length;
          setUnreadMeetings(pending);
        }
      } catch {
        // Ignore errors
      }
    };
    fetchMeetings();
  }, []);

  const handleLogoutClick = useCallback(() => {
    if (!isLoggingOut) {
      setShowLogoutConfirm(true);
    }
  }, [isLoggingOut]);

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    clearAdminSession();
    await logout();
    await router.push('/sudosuperuser-ostaad/login');
  };

  const handleLogoutCancel = useCallback(() => {
    setShowLogoutConfirm(false);
  }, []);

  const isActive = (path: string) => {
    if (path === '/sudosuperuser-ostaad') {
      return router.pathname === path;
    }
    return router.pathname.startsWith(path);
  };

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-mono">
      {/* Header */}
      <header className="border-b border-gray-800 sticky top-0 bg-[#0a0a0f]/95 backdrop-blur-lg z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">Admin Dashboard</h1>
            </div>

            <div className="flex items-center gap-4">
              {/* User info */}
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm text-gray-400">@</span>
                <span className="text-sm font-bold text-white">
                  {user?.username}
                </span>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogoutClick}
                disabled={isLoggingOut}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-sm font-medium rounded-xl transition-all shadow-lg disabled:opacity-50"
                aria-label="Logout"
                title="Logout (Ctrl+Shift+L)"
              >
                {isLoggingOut ? (
                  <>
                    <span className="animate-spin mr-1">⟳</span>
                    <span className="hidden sm:inline">Logging out...</span>
                  </>
                ) : (
                  <>
                    <span>🚪</span>
                    <span className="hidden sm:inline">Logout</span>
                  </>
                )}
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 border border-gray-600 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                <span className="text-lg">{mobileMenuOpen ? '✕' : '☰'}</span>
              </button>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav
            className="hidden md:flex gap-1.5 mt-4 text-sm flex-wrap"
            aria-label="Main navigation"
          >
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <a
                  onClick={handleNavClick}
                  className={`px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 backdrop-blur-sm ${
                    isActive(item.path)
                      ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-lg shadow-purple-500/5'
                      : 'text-gray-400 border border-transparent hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.path === '/sudosuperuser-ostaad/meetings' &&
                    unreadMeetings > 0 && (
                      <span className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {unreadMeetings}
                      </span>
                    )}
                </a>
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`md:hidden border-t border-gray-800 overflow-hidden transition-all duration-300 ${
            mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
          aria-hidden={!mobileMenuOpen}
        >
          <nav
            className="flex flex-col p-4 gap-2 text-sm"
            aria-label="Mobile navigation"
          >
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <a
                  onClick={handleNavClick}
                  className={`px-4 py-3 rounded-xl transition-all flex items-center justify-between ${
                    isActive(item.path)
                      ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  {item.path === '/sudosuperuser-ostaad/meetings' &&
                    unreadMeetings > 0 && (
                      <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                        {unreadMeetings}
                      </span>
                    )}
                </a>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="text-4xl mb-4 animate-pulse">⚡</div>
              <div className="text-gray-400">Loading...</div>
            </div>
          </div>
        ) : (
          children
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="text-lime-400">●</span>
              <span>System Online</span>
            </div>
            <div>
              <code className="text-purple-400">$ /sudosuperuser-ostaad</code>
            </div>
            <div>
              v2.0.0 | {user?.username || 'Guest'}
            </div>
          </div>
        </div>
      </footer>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmation
        isOpen={showLogoutConfirm}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
        isLoggingOut={isLoggingOut}
        username={user?.username || 'User'}
      />
    </div>
  );
};

// Loading skeleton component
export const AdminLayoutSkeleton: React.FC = () => (
  <div className="min-h-screen bg-[#0a0a0f] text-white font-mono">
    <header className="border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-gray-800 animate-pulse rounded"></div>
          <div className="h-8 w-24 bg-gray-800 animate-pulse rounded"></div>
        </div>
      </div>
    </header>
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="space-y-4">
        <div className="h-8 w-64 bg-gray-800 animate-pulse rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-800 animate-pulse rounded border border-gray-800"
            ></div>
          ))}
        </div>
      </div>
    </main>
  </div>
);

export default AdminLayout;
