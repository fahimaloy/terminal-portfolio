import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { animate, createScope, stagger } from 'animejs';
import { canAnimate } from '../../config/animations';
import { logout, clearAdminSession } from '../../utils/adminPageGuard';
import { getMeetings } from '../../utils/api';
import { GlitchText, HudPanel, NeonButton } from '../ui';
import { motionTokens } from '../ui/motionConfig';

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
  { path: '/sudosuperuser-ostaad/experiences', label: 'Experiences', icon: '💼' },
  { path: '/sudosuperuser-ostaad/blogs', label: 'Blogs', icon: '📝' },
  { path: '/sudosuperuser-ostaad/media', label: 'Media', icon: '📁' },
  { path: '/sudosuperuser-ostaad/knowledge', label: 'Knowledge', icon: '🧠' },
  { path: '/sudosuperuser-ostaad/site-texts', label: 'Site Texts', icon: '✏️' },
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: motionTokens.dur.tap, ease: motionTokens.ease }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={!isLoggingOut ? onClose : undefined}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{
          duration: motionTokens.dur.enter,
          ease: motionTokens.ease,
        }}
        className="relative max-w-sm w-full"
      >
        <HudPanel
          accent="red"
          notch="md"
          title="// CONFIRM_LOGOUT"
          className="p-6"
        >
          <div className="text-center space-y-4">
            <div className="text-5xl">🚪</div>
            <h2
              id="logout-title"
              className="font-display tracking-[2px] text-xl text-neon-magenta text-shadow-neon-magenta"
            >
              CONFIRM LOGOUT
            </h2>
            <p className="text-text-muted text-sm font-body">
              Are you sure you want to log out,{' '}
              <span className="text-neon-yellow font-display">{username}</span>?
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <NeonButton
                variant="ghost"
                accent="cyan"
                onClick={onClose}
                disabled={isLoggingOut}
              >
                CANCEL
              </NeonButton>
              <NeonButton
                accent="red"
                onClick={onConfirm}
                disabled={isLoggingOut}
                loading={isLoggingOut}
              >
                {isLoggingOut ? 'LOGGING OUT…' : 'LOGOUT'}
              </NeonButton>
            </div>
          </div>
        </HudPanel>
      </motion.div>
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
  const isMounted = useRef(true);
  const desktopNavRef = useRef<HTMLElement>(null);

  // Stagger the nav items in on first mount.
  useEffect(() => {
    const nav = desktopNavRef.current;
    if (!nav || !canAnimate()) return;

    const scope = createScope({ root: nav });
    scope.add(() => {
      animate(nav.querySelectorAll('.admin-nav-item'), {
        opacity: [0, 1],
        y: [-8, 0],
        duration: 320,
        ease: 'outExpo',
        delay: stagger(35),
      });
    });

    return () => scope.revert();
  }, []);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const data = await getMeetings();
        if (isMounted.current && data) {
          const pending = data.filter(
            (m: unknown) => (m as { status?: string }).status === 'pending',
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
    <div className="min-h-screen bg-bg-void text-text-primary font-body">
      {/* Admin surfaces must never be indexed. */}
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      {/* Header */}
      <header
        className="sticky top-0 z-40 bg-bg-void/95 backdrop-blur-md"
        style={{ borderBottom: '1px solid rgba(0,240,255,0.2)' }}
      >
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-[2px] bg-neon-cyan shadow-[0_0_12px_var(--glow-cyan)]"
        />
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <GlitchText as="h1" accent="cyan" className="text-lg md:text-xl">
                {'// ADMIN_PANEL'}
              </GlitchText>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2">
                <span className="text-[10px] font-display tracking-[2px] text-text-muted">
                  @ {user?.username || 'GUEST'}
                </span>
                <span
                  className="inline-flex items-center px-2 py-0.5 text-[10px] font-display tracking-[2px] uppercase bg-neon-yellow/10 border border-neon-yellow/40 text-neon-yellow"
                  style={{
                    clipPath:
                      'polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px)',
                  }}
                >
                  ADMIN
                </span>
              </div>

              <NeonButton
                variant="ghost"
                accent="magenta"
                onClick={handleLogoutClick}
                disabled={isLoggingOut}
                loading={isLoggingOut}
                aria-label="Logout"
                title="Logout (Ctrl+Shift+L)"
              >
                {isLoggingOut ? 'LOGGING OUT…' : 'LOGOUT'}
              </NeonButton>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 bg-bg-smoke text-neon-cyan transition-all"
                style={{ clipPath: 'var(--clip-notch-sm)' }}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                <span className="text-lg">{mobileMenuOpen ? '✕' : '☰'}</span>
              </button>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav
            ref={desktopNavRef}
            className="hidden md:flex gap-1.5 mt-4 text-sm flex-wrap"
            aria-label="Main navigation"
          >
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <a
                  onClick={handleNavClick}
                  className={`admin-nav-item px-3 py-2 font-display tracking-[1.5px] uppercase text-[10px] transition-all duration-200 flex items-center gap-2 ${
                    isActive(item.path)
                      ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/40 hud-glow-cyan'
                      : 'bg-transparent text-text-secondary border border-white/10 hover:border-white/30 hover:text-text-primary'
                  }`}
                  style={{
                    clipPath:
                      'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)',
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.path === '/sudosuperuser-ostaad/meetings' &&
                    unreadMeetings > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-neon-magenta text-black font-display text-[9px]">
                        {unreadMeetings}
                      </span>
                    )}
                </a>
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{
                duration: motionTokens.dur.enter,
                ease: motionTokens.ease,
              }}
              className="md:hidden border-t border-white/5 bg-bg-void"
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
                      className={`px-4 py-3 font-display tracking-[1.5px] uppercase text-[10px] transition-all flex items-center justify-between ${
                        isActive(item.path)
                          ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/40'
                          : 'text-text-secondary border border-white/10 hover:border-white/30'
                      }`}
                      style={{
                        clipPath:
                          'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)',
                      }}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-lg">{item.icon}</span>
                        <span>{item.label}</span>
                      </span>
                      {item.path === '/sudosuperuser-ostaad/meetings' &&
                        unreadMeetings > 0 && (
                          <span className="bg-neon-magenta text-black text-xs font-display px-2 py-0.5">
                            {unreadMeetings}
                          </span>
                        )}
                    </a>
                  </Link>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <HudPanel
              accent="cyan"
              notch="md"
              className="p-8 text-center space-y-3"
            >
              <div className="w-8 h-8 border-4 border-neon-cyan/20 border-t-neon-cyan rounded-full animate-spin mx-auto" />
              <div className="font-display tracking-[2px] text-neon-cyan">
                LOADING…
              </div>
            </HudPanel>
          </div>
        ) : (
          children
        )}
      </main>

      {/* Footer */}
      <footer
        className="mt-auto"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2 text-[10px] font-display tracking-[2px] uppercase text-text-muted">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse-dot" />
              <span>SYSTEM ONLINE</span>
            </div>
            <div>
              <code className="text-neon-magenta">$ /sudosuperuser-ostaad</code>
            </div>
            <div>v2.0.0 | {user?.username || 'GUEST'}</div>
          </div>
        </div>
      </footer>

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
  <div className="min-h-screen bg-bg-void text-text-primary font-body">
    <header
      className="sticky top-0 z-40 bg-bg-void/95 backdrop-blur-md"
      style={{ borderBottom: '1px solid rgba(0,240,255,0.2)' }}
    >
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-bg-smoke animate-pulse" />
          <div className="h-8 w-24 bg-bg-smoke animate-pulse" />
        </div>
      </div>
    </header>
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="space-y-4">
        <div className="h-8 w-64 bg-bg-smoke animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-bg-smoke animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  </div>
);

export default AdminLayout;
