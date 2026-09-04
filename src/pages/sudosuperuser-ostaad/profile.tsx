import Head from 'next/head';
import React from 'react';
import {
  getPortfolioProfile,
  upsertPortfolioProfile,
  PortfolioProfile,
} from '../../utils/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminGuard } from '../../utils/adminPageGuard';
import { GlitchText, HudPanel, NeonButton } from '../../components/ui';

const defaultProfile: Partial<PortfolioProfile> = {
  full_name: '',
  title: '',
  bio: '',
  welcome_message: '',
  summary: '',
  phone: '',
  email: '',
  website: '',
  github: '',
  linkedin: '',
};

const ProfilePage = () => {
  const { authorized, loading, user } = useAdminGuard();
  const [profile, setProfile] =
    React.useState<Partial<PortfolioProfile>>(defaultProfile);
  const [credentialsForm, setCredentialsForm] = React.useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
  });
  const [statusMessage, setStatusMessage] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    const loadData = async () => {
      const profileData = await getPortfolioProfile();
      if (profileData) {
        setProfile(profileData);
      }
    };

    if (authorized) {
      loadData();
    }
  }, [authorized]);

  React.useEffect(() => {
    if (user) {
      setCredentialsForm((prev) => ({
        ...prev,
        username: user.username || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  const updateStatus = (message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(''), 2500);
  };

  const handleProfileSave = async () => {
    setIsSaving(true);
    const ok = await upsertPortfolioProfile(profile);
    updateStatus(ok ? 'Profile updated.' : 'Failed to update profile.');
    if (ok) {
      const updated = await getPortfolioProfile();
      if (updated) {
        setProfile(updated);
      }
    }
    setIsSaving(false);
  };

  const handleCredentialsSave = async () => {
    if (!credentialsForm.currentPassword.trim()) {
      updateStatus('Current password is required.');
      return;
    }

    setIsSaving(true);
    const response = await fetch('/api/admin/credentials', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword: credentialsForm.currentPassword,
        username: credentialsForm.username,
        email: credentialsForm.email,
        password: credentialsForm.newPassword,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result?.ok) {
      updateStatus(result?.message || 'Failed to update credentials.');
      setIsSaving(false);
      return;
    }

    setCredentialsForm((prev) => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
    }));
    updateStatus('Credentials updated.');
    setIsSaving(false);
  };

  if (!authorized) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Profile - Admin Panel</title>
      </Head>

      <AdminLayout user={user} isLoading={loading}>
        <div className="max-w-2xl">
          <GlitchText
            accent="cyan"
            className="text-2xl font-display tracking-[2px] mb-6"
          >
            PERSONAL PROFILE
          </GlitchText>

          {statusMessage && (
            <HudPanel accent="green" notch="sm" className="mb-4 p-3">
              <span className="font-body text-sm text-neon-green">
                {statusMessage}
              </span>
            </HudPanel>
          )}

          <HudPanel accent="cyan" notch="md" className="p-6 mb-8">
            <div className="text-[10px] font-display tracking-[3px] text-neon-cyan mb-4">
              PORTFOLIO DETAILS
            </div>

            <div className="grid gap-3 mb-4 md:grid-cols-2">
              <div>
                <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                  Full Name:
                </label>
                <input
                  type="text"
                  className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                  placeholder="Full name"
                  value={profile.full_name || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      full_name: e.target.value,
                    }))
                  }
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                  Title:
                </label>
                <input
                  type="text"
                  className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                  placeholder="Professional title"
                  value={profile.title || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, title: e.target.value }))
                  }
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                  Phone:
                </label>
                <input
                  type="text"
                  className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                  placeholder="Phone number"
                  value={profile.phone || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                  Email:
                </label>
                <input
                  type="email"
                  className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                  placeholder="Email address"
                  value={profile.email || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, email: e.target.value }))
                  }
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                  Website:
                </label>
                <input
                  type="url"
                  className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                  placeholder="Website URL"
                  value={profile.website || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      website: e.target.value,
                    }))
                  }
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                  GitHub:
                </label>
                <input
                  type="url"
                  className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                  placeholder="GitHub profile URL"
                  value={profile.github || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, github: e.target.value }))
                  }
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                  LinkedIn:
                </label>
                <input
                  type="url"
                  className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                  placeholder="LinkedIn profile URL"
                  value={profile.linkedin || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      linkedin: e.target.value,
                    }))
                  }
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                  Avatar URL:
                </label>
                <input
                  type="url"
                  className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                  placeholder="Avatar image URL"
                  value={profile.avatar_url || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      avatar_url: e.target.value,
                    }))
                  }
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                Summary:
              </label>
              <textarea
                className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200 resize-none"
                rows={3}
                placeholder="Short summary"
                value={profile.summary || ''}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    summary: e.target.value,
                  }))
                }
                disabled={isSaving}
              />
            </div>

            <div className="mb-4">
              <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                Bio:
              </label>
              <textarea
                className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200 resize-none"
                rows={4}
                placeholder="Detailed bio"
                value={profile.bio || ''}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    bio: e.target.value,
                  }))
                }
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2 mb-4">
              <label className="block text-[10px] font-display tracking-[2px] text-text-muted">
                Welcome / Greeting Message
              </label>
              <textarea
                value={profile.welcome_message || ''}
                onChange={(e) =>
                  setProfile({ ...profile, welcome_message: e.target.value })
                }
                placeholder="Hi, I'm your AI assistant. Ask me anything about my skills, projects, and professional background!"
                maxLength={500}
                rows={3}
                className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200 resize-none"
                disabled={isSaving}
              />
            </div>

            <NeonButton
              accent="cyan"
              onClick={handleProfileSave}
              disabled={isSaving}
              loading={isSaving}
            >
              {isSaving ? 'SAVING…' : 'SAVE PROFILE'}
            </NeonButton>
          </HudPanel>

          <HudPanel accent="magenta" notch="md" className="p-6">
            <div className="text-[10px] font-display tracking-[3px] text-neon-magenta mb-4">
              ADMIN CREDENTIALS
            </div>

            <p className="mb-4 font-body text-sm text-text-muted">
              Default seed:{' '}
              <code className="text-neon-magenta font-mono">fahimaloy</code> /{' '}
              <code className="text-neon-magenta font-mono">dibona</code> /{' '}
              <code className="text-neon-magenta font-mono">
                private.fahimaloy@proton.me
              </code>
            </p>

            <div className="grid gap-3 mb-4 md:grid-cols-2">
              <div>
                <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                  Username:
                </label>
                <input
                  type="text"
                  className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                  placeholder="Username"
                  value={credentialsForm.username}
                  onChange={(e) =>
                    setCredentialsForm((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                  Private Email:
                </label>
                <input
                  type="email"
                  className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                  placeholder="Private email"
                  value={credentialsForm.email}
                  onChange={(e) =>
                    setCredentialsForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                  Current Password (required):
                </label>
                <input
                  type="password"
                  className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                  placeholder="Current password"
                  value={credentialsForm.currentPassword}
                  onChange={(e) =>
                    setCredentialsForm((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }))
                  }
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                  New Password (optional):
                </label>
                <input
                  type="password"
                  className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                  placeholder="New password"
                  value={credentialsForm.newPassword}
                  onChange={(e) =>
                    setCredentialsForm((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  disabled={isSaving}
                />
              </div>
            </div>

            <NeonButton
              accent="magenta"
              onClick={handleCredentialsSave}
              disabled={isSaving}
              loading={isSaving}
            >
              {isSaving ? 'UPDATING…' : 'UPDATE CREDENTIALS'}
            </NeonButton>
          </HudPanel>
        </div>
      </AdminLayout>
    </>
  );
};

export default ProfilePage;
