import Head from 'next/head';
import React from 'react';
import Link from 'next/link';
import { createScope, animate, stagger } from 'animejs';
import {
  getPortfolioProfile,
  getPortfolioProjects,
  getPortfolioSkills,
  PortfolioProfile,
} from '../../utils/api';
import { adminListBlogs } from '../../utils/blogApi';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminGuard } from '../../utils/adminPageGuard';
import {
  HudPanel,
  NeonChip,
  AnimatedCounter,
  Tilt3D,
} from '../../components/ui';
import { canAnimate } from '../../config/animations';

const QUICK_ACTIONS = [
  { label: 'Update Personal Details', href: '/sudosuperuser-ostaad/profile' },
  { label: 'Add New Skill', href: '/sudosuperuser-ostaad/skills' },
  { label: 'Create New Project', href: '/sudosuperuser-ostaad/projects' },
  { label: 'Write a Blog Post', href: '/sudosuperuser-ostaad/blogs/new' },
  { label: 'Upload Project Media', href: '/sudosuperuser-ostaad/media' },
];

const DashboardPage = () => {
  const { authorized, loading, user, error } = useAdminGuard();
  const [profile, setProfile] =
    React.useState<Partial<PortfolioProfile> | null>(null);
  const [skillCount, setSkillCount] = React.useState(0);
  const [projectCount, setProjectCount] = React.useState(0);
  const [blogCount, setBlogCount] = React.useState(0);
  const [draftCount, setDraftCount] = React.useState(0);

  const gridRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const loadData = async () => {
      const [profileData, skillsData, projectsData, blogs] = await Promise.all([
        getPortfolioProfile(),
        getPortfolioSkills(),
        getPortfolioProjects(),
        adminListBlogs(),
      ]);
      if (profileData) setProfile(profileData);
      setSkillCount(skillsData.length);
      setProjectCount(projectsData.length);
      setBlogCount(blogs.filter((b) => b.status === 'published').length);
      setDraftCount(blogs.filter((b) => b.status === 'draft').length);
    };
    if (authorized) loadData();
  }, [authorized]);

  // Stagger the stat cards in.
  React.useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !authorized || !canAnimate()) return;

    const scope = createScope({ root: grid });
    scope.add(() => {
      animate(grid.querySelectorAll('.dash-card'), {
        opacity: [0, 1],
        y: [18, 0],
        scale: [0.96, 1],
        duration: 420,
        ease: 'outExpo',
        delay: stagger(70),
      });
    });

    return () => scope.revert();
  }, [authorized]);

  if (!authorized && !loading && error) {
    return (
      <div className="min-h-screen bg-bg-void flex items-center justify-center px-4">
        <HudPanel accent="red" notch="md" className="p-6 text-center">
          <div className="font-display text-sm text-neon-red tracking-[3px]">
            SESSION ERROR
          </div>
          <p className="font-body text-sm text-text-secondary mt-2">{error}</p>
        </HudPanel>
      </div>
    );
  }

  const cards = [
    {
      label: 'PROFILE',
      value: profile?.full_name || 'NOT SET',
      numeric: false as const,
      accent: 'cyan' as const,
      link: '/sudosuperuser-ostaad/profile',
      action: 'Edit Profile',
    },
    {
      label: 'SKILLS',
      value: skillCount,
      numeric: true as const,
      accent: 'green' as const,
      link: '/sudosuperuser-ostaad/skills',
      action: 'Manage Skills',
    },
    {
      label: 'PROJECTS',
      value: projectCount,
      numeric: true as const,
      accent: 'magenta' as const,
      link: '/sudosuperuser-ostaad/projects',
      action: 'Manage Projects',
    },
    {
      label: 'BLOG POSTS',
      value: blogCount,
      numeric: true as const,
      accent: 'yellow' as const,
      link: '/sudosuperuser-ostaad/blogs',
      action: 'Manage Blogs',
    },
  ];

  return (
    <>
      <Head>
        <title>Admin Dashboard</title>
      </Head>
      <AdminLayout user={user} isLoading={loading}>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="font-display text-lg text-neon-cyan text-shadow-neon-cyan tracking-wider">
              DASHBOARD
            </h2>
            <p className="text-[10px] font-mono text-text-muted mt-1">
              {'>'} SYSTEM OVERVIEW
              {draftCount > 0 &&
                ` · ${draftCount} DRAFT${draftCount > 1 ? 'S' : ''} PENDING`}
            </p>
          </div>

          {/* Stat cards */}
          <div
            ref={gridRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {cards.map((card) => (
              <div key={card.label} className="dash-card">
                <Tilt3D intensity={3}>
                  <HudPanel
                    accent={card.accent}
                    notch="md"
                    title={`// ${card.label}`}
                    className="p-4 h-full"
                  >
                    <div className="text-2xl font-display text-text-primary mb-3 truncate">
                      {card.numeric ? (
                        <AnimatedCounter value={card.value as number} />
                      ) : (
                        card.value
                      )}
                    </div>
                    <Link href={card.link}>
                      <a className="text-[10px] font-display tracking-[2px] text-neon-cyan hover:text-neon-yellow transition-colors">
                        {card.action.toUpperCase()} →
                      </a>
                    </Link>
                  </HudPanel>
                </Tilt3D>
              </div>
            ))}
          </div>

          {/* Lower grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HudPanel
              accent="cyan"
              notch="md"
              title="// QUICK_ACTIONS"
              className="p-4"
            >
              <div className="space-y-2">
                {QUICK_ACTIONS.map((action) => (
                  <Link key={action.href} href={action.href}>
                    <a className="block px-3 py-2.5 bg-white/[0.03] border border-white/10 text-text-secondary hover:text-text-primary hover:border-neon-cyan/30 hover:bg-neon-cyan/5 transition-all duration-200 text-xs font-body clip-notch-sm">
                      {action.label}
                    </a>
                  </Link>
                ))}
              </div>
            </HudPanel>

            <HudPanel
              accent="magenta"
              notch="md"
              title="// SYSTEM_INFO"
              className="p-4"
            >
              <div className="space-y-2 text-xs font-body">
                <Row label="Logged in as" value={user?.username || '—'} />
                <Row label="Email" value={user?.email || 'Not set'} />
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-text-muted">Profile</span>
                  <NeonChip accent={profile?.full_name ? 'green' : 'yellow'}>
                    {profile?.full_name ? 'CONFIGURED' : 'INCOMPLETE'}
                  </NeonChip>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-text-muted">Content</span>
                  <NeonChip
                    accent={
                      skillCount > 0 && projectCount > 0 ? 'green' : 'yellow'
                    }
                  >
                    {skillCount > 0 && projectCount > 0
                      ? 'READY'
                      : 'IN PROGRESS'}
                  </NeonChip>
                </div>
              </div>
            </HudPanel>
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-white/5">
      <span className="text-text-muted">{label}</span>
      <span className="text-text-primary font-medium truncate ml-3">
        {value}
      </span>
    </div>
  );
}

export default DashboardPage;
