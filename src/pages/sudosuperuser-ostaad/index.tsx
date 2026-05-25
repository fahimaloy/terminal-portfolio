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
  const { authorized, loading, user, error } = useAdminGuard();
  const [profile, setProfile] = React.useState<Partial<PortfolioProfile> | null>(null);
  const [skillCount, setSkillCount] = React.useState(0);
  const [projectCount, setProjectCount] = React.useState(0);

  React.useEffect(() => {
    const loadData = async () => {
      const [profileData, skillsData, projectsData] = await Promise.all([
        getPortfolioProfile(),
        getPortfolioSkills(),
        getPortfolioProjects(),
      ]);
      if (profileData) setProfile(profileData);
      setSkillCount(skillsData.length);
      setProjectCount(projectsData.length);
    };
    if (authorized) loadData();
  }, [authorized]);

  if (!authorized && !loading && error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center"><p className="text-red-400 text-lg">{error}</p></div>
      </div>
    );
  }

  return (
    <>
      <Head><title>Admin Dashboard</title></Head>
      <AdminLayout user={user} isLoading={loading}>
        <div>
          <h2 className="text-3xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">Dashboard</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Profile', value: profile?.full_name || 'Not Set', link: '/sudosuperuser-ostaad/profile', action: 'Edit Profile' },
              { label: 'Skills', value: skillCount, link: '/sudosuperuser-ostaad/skills', action: 'Manage Skills' },
              { label: 'Projects', value: projectCount, link: '/sudosuperuser-ostaad/projects', action: 'Manage Projects' },
              { label: 'Media', value: 'Files', link: '/sudosuperuser-ostaad/media', action: 'Manage Media' },
            ].map((card, i) => (
              <div key={i} className="glass-panel rounded-xl p-6 group hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5">
                <div className="text-sm text-gray-400 mb-2">{card.label}</div>
                <div className="text-2xl font-bold text-white mb-3">{card.value}</div>
                <Link href={card.link}><a className="text-xs text-purple-400 hover:text-cyan-400 transition-colors">{card.action} →</a></Link>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-deep rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {[
                  { label: 'Update Personal Details', href: '/sudosuperuser-ostaad/profile' },
                  { label: 'Add New Skill', href: '/sudosuperuser-ostaad/skills' },
                  { label: 'Create New Project', href: '/sudosuperuser-ostaad/projects' },
                  { label: 'Upload Project Media', href: '/sudosuperuser-ostaad/media' },
                ].map((action, i) => (
                  <Link key={i} href={action.href}>
                    <a className="block p-3.5 rounded-xl bg-white/5 border border-gray-800 text-gray-300 hover:text-white hover:bg-purple-500/10 hover:border-purple-500/30 transition-all duration-200 text-sm">{action.label}</a>
                  </Link>
                ))}
              </div>
            </div>

            <div className="glass-deep rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">System Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-800"><span className="text-gray-400">Logged in as:</span><span className="text-white font-medium">{user?.username}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-800"><span className="text-gray-400">Email:</span><span className="text-white font-medium">{user?.email || 'Not set'}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-800"><span className="text-gray-400">Profile:</span><span className={`font-medium ${profile?.full_name ? 'text-lime-400' : 'text-yellow-400'}`}>{profile?.full_name ? 'Configured' : 'Incomplete'}</span></div>
                <div className="flex justify-between py-2"><span className="text-gray-400">Content:</span><span className={`font-medium ${skillCount > 0 && projectCount > 0 ? 'text-lime-400' : 'text-yellow-400'}`}>{skillCount > 0 && projectCount > 0 ? 'Ready' : 'In Progress'}</span></div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

export default DashboardPage;
