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

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!authorized) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Profile - Admin Panel</title>
      </Head>

      <AdminLayout user={user}>
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold mb-6">Personal Profile</h2>

          {statusMessage && (
            <div className="mb-4 p-3 bg-green-900 text-green-300 border border-green-400 text-sm">
              {statusMessage}
            </div>
          )}

          <div className="border border-green-400 p-6 mb-8">
            <h3 className="text-lg font-bold mb-4">Portfolio Details</h3>

            <div className="grid gap-3 mb-4 md:grid-cols-2">
              <div>
                <label className="block text-sm mb-1">Full Name:</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black"
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
                <label className="block text-sm mb-1">Title:</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black"
                  placeholder="Professional title"
                  value={profile.title || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, title: e.target.value }))
                  }
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Phone:</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black"
                  placeholder="Phone number"
                  value={profile.phone || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Email:</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black"
                  placeholder="Email address"
                  value={profile.email || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, email: e.target.value }))
                  }
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Website:</label>
                <input
                  type="url"
                  className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black"
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
                <label className="block text-sm mb-1">GitHub:</label>
                <input
                  type="url"
                  className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black"
                  placeholder="GitHub profile URL"
                  value={profile.github || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, github: e.target.value }))
                  }
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm mb-1">LinkedIn:</label>
                <input
                  type="url"
                  className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black"
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
                <label className="block text-sm mb-1">Avatar URL:</label>
                <input
                  type="url"
                  className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black"
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
              <label className="block text-sm mb-1">Summary:</label>
              <textarea
                className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black"
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
              <label className="block text-sm mb-1">Bio:</label>
              <textarea
                className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black"
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

            <button
              onClick={handleProfileSave}
              disabled={isSaving}
              className="px-4 py-2 bg-green-400 text-black font-bold hover:bg-green-300 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

          <div className="border border-green-400 p-6">
            <h3 className="text-lg font-bold mb-4">Admin Credentials</h3>

            <p className="mb-4 text-sm text-green-300">
              Default seed: <code className="text-green-200">fahimaloy</code> /{' '}
              <code className="text-green-200">dibona</code> /{' '}
              <code className="text-green-200">
                private.fahimaloy@proton.me
              </code>
            </p>

            <div className="grid gap-3 mb-4 md:grid-cols-2">
              <div>
                <label className="block text-sm mb-1">Username:</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black"
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
                <label className="block text-sm mb-1">Private Email:</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black"
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
                <label className="block text-sm mb-1">
                  Current Password (required):
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black"
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
                <label className="block text-sm mb-1">
                  New Password (optional):
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black"
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
              className="px-4 py-2 bg-green-400 text-black font-bold hover:bg-green-300 disabled:opacity-50"
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
