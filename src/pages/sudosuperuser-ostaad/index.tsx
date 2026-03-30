import Head from 'next/head';
import React from 'react';
import Link from 'next/link';
import {
  getPortfolioProfile,
  getPortfolioProjects,
  getPortfolioSkills,
  PortfolioProfile,
} from '../../utils/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminGuard } from '../../utils/adminPageGuard';

const DashboardPage = () => {
  const { authorized, loading, user } = useAdminGuard();
  const [profile, setProfile] =
    React.useState<Partial<PortfolioProfile> | null>(null);
  const [skillCount, setSkillCount] = React.useState(0);
  const [projectCount, setProjectCount] = React.useState(0);

  React.useEffect(() => {
    const loadData = async () => {
      const [profileData, skillsData, projectsData] = await Promise.all([
        getPortfolioProfile(),
        getPortfolioSkills(),
        getPortfolioProjects(),
      ]);

      if (profileData) {
        setProfile(profileData);
      }
      setSkillCount(skillsData.length);
      setProjectCount(projectsData.length);
    };

    if (authorized) {
      loadData();
    }
  }, [authorized]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!authorized) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard</title>
      </Head>

      <AdminLayout user={user}>
        <div>
          <h2 className="text-3xl font-bold mb-8">Dashboard</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="border border-green-400 p-6 bg-black">
              <div className="text-sm text-green-300 mb-2">Profile</div>
              <div className="text-2xl font-bold mb-3">
                {profile?.full_name || 'Not Set'}
              </div>
              <Link
                href="/sudosuperuser-ostaad/profile"
                className="text-xs text-green-400 underline hover:text-green-300"
              >
                Edit Profile {'->'}
              </Link>
            </div>

            <div className="border border-green-400 p-6 bg-black">
              <div className="text-sm text-green-300 mb-2">Skills</div>
              <div className="text-2xl font-bold mb-3">{skillCount}</div>
              <Link
                href="/sudosuperuser-ostaad/skills"
                className="text-xs text-green-400 underline hover:text-green-300"
              >
                Manage Skills {'->'}
              </Link>
            </div>

            <div className="border border-green-400 p-6 bg-black">
              <div className="text-sm text-green-300 mb-2">Projects</div>
              <div className="text-2xl font-bold mb-3">{projectCount}</div>
              <Link
                href="/sudosuperuser-ostaad/projects"
                className="text-xs text-green-400 underline hover:text-green-300"
              >
                Manage Projects {'->'}
              </Link>
            </div>

            <div className="border border-green-400 p-6 bg-black">
              <div className="text-sm text-green-300 mb-2">Media</div>
              <div className="text-2xl font-bold mb-3">Files</div>
              <Link
                href="/sudosuperuser-ostaad/media"
                className="text-xs text-green-400 underline hover:text-green-300"
              >
                Manage Media {'->'}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="border border-green-400 p-6">
              <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href="/sudosuperuser-ostaad/profile"
                  className="block p-3 bg-black border border-green-400 text-green-400 hover:bg-green-400 hover:text-black transition-colors"
                >
                  Update Personal Details
                </Link>
                <Link
                  href="/sudosuperuser-ostaad/skills"
                  className="block p-3 bg-black border border-green-400 text-green-400 hover:bg-green-400 hover:text-black transition-colors"
                >
                  Add New Skill
                </Link>
                <Link
                  href="/sudosuperuser-ostaad/projects"
                  className="block p-3 bg-black border border-green-400 text-green-400 hover:bg-green-400 hover:text-black transition-colors"
                >
                  Create New Project
                </Link>
                <Link
                  href="/sudosuperuser-ostaad/media"
                  className="block p-3 bg-black border border-green-400 text-green-400 hover:bg-green-400 hover:text-black transition-colors"
                >
                  Upload Project Media
                </Link>
              </div>
            </div>

            <div className="border border-green-400 p-6">
              <h3 className="text-lg font-bold mb-4">System Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-300">Logged in as:</span>
                  <span className="font-bold">{user?.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-300">Email:</span>
                  <span className="font-bold text-xs break-all">
                    {user?.email || 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-300">Profile Status:</span>
                  <span className="font-bold">
                    {profile?.full_name ? 'Configured' : 'Incomplete'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-300">Content Ready:</span>
                  <span className="font-bold">
                    {skillCount > 0 && projectCount > 0 ? 'Yes' : 'In Progress'}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-green-400 text-xs text-green-300">
                <p>$ /sudosuperuser-ostaad</p>
                <p>Welcome to the admin dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

export default DashboardPage;
