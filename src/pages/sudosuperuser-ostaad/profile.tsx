import Head from 'next/head';
import React from 'react';
import {
  getPortfolioProfile,
  upsertPortfolioProfile,
  PortfolioProfile,
} from '../../utils/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminGuard } from '../../utils/adminPageGuard';

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
          <h2 className="text-2xl font-bold mb-6">Personal Profile</h2>

          {statusMessage && (
            <div className="mb-4 p-3 bg-lime-500/10 border border-lime-500/30 text-lime-400 text-sm rounded-xl">
              {statusMessage}
            </div>
          )}

          <div className="glass-deep rounded-xl p-6 mb-8">
            <h3 className="text-lg font-bold text-white mb-4">
              Portfolio Details
            </h3>

            <div className="grid gap-3 mb-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Full Name:
                </label>
                <input
                  type="text"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
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
                <label className="block text-sm text-gray-400 mb-1">
                  Title:
                </label>
                <input
                  type="text"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                  placeholder="Professional title"
                  value={profile.title || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, title: e.target.value }))
                  }
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Phone:
                </label>
                <input
                  type="text"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                  placeholder="Phone number"
                  value={profile.phone || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Email:
                </label>
                <input
                  type="email"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                  placeholder="Email address"
                  value={profile.email || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, email: e.target.value }))
                  }
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Website:
                </label>
                <input
                  type="url"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
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
                <label className="block text-sm text-gray-400 mb-1">
                  GitHub:
                </label>
                <input
                  type="url"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                  placeholder="GitHub profile URL"
                  value={profile.github || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, github: e.target.value }))
                  }
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  LinkedIn:
                </label>
                <input
                  type="url"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
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
                <label className="block text-sm text-gray-400 mb-1">
                  Avatar URL:
                </label>
                <input
                  type="url"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
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
              <label className="block text-sm text-gray-400 mb-1">
                Summary:
              </label>
              <textarea
                className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500 resize-none"
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
              <label className="block text-sm text-gray-400 mb-1">Bio:</label>
              <textarea
                className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500 resize-none"
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
              <label className="block text-sm text-gray-400">
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
                className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500 resize-none"
                disabled={isSaving}
              />
            </div>

            <button
              onClick={handleProfileSave}
              disabled={isSaving}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl font-medium transition-all shadow-lg disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

          <div className="glass-deep rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">
              Admin Credentials
            </h3>

            <p className="mb-4 text-sm text-gray-400">
              Default seed: <code className="text-purple-400">fahimaloy</code> /{' '}
              <code className="text-purple-400">dibona</code> /{' '}
              <code className="text-purple-400">
                private.fahimaloy@proton.me
              </code>
            </p>

            <div className="grid gap-3 mb-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Username:
                </label>
                <input
                  type="text"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
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
                <label className="block text-sm text-gray-400 mb-1">
                  Private Email:
                </label>
                <input
                  type="email"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
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
                <label className="block text-sm text-gray-400 mb-1">
                  Current Password (required):
                </label>
                <input
                  type="password"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
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
                <label className="block text-sm text-gray-400 mb-1">
                  New Password (optional):
                </label>
                <input
                  type="password"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
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

            <button
              onClick={handleCredentialsSave}
              disabled={isSaving}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl font-medium transition-all shadow-lg disabled:opacity-50"
            >
              {isSaving ? 'Updating...' : 'Update Credentials'}
            </button>
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

export default ProfilePage;
