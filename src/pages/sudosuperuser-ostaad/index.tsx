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
import { canAnimate, durations, easings } from '../../config/animations';

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
        // Was 420ms — no --dur-420 exists, so this takes the next token down
        // (durations[300]), matching ExperienceTimeline/AdminLayout.
        duration: durations[300] * 1000,
        ease: easings.outExpo,
        // Was stagger(70) — now the --dur-stagger token (60ms). anime's
        // default `from` is already 'first', so the cascade order is
        // unchanged; only the step is 10ms tighter.
        delay: stagger(durations.stagger * 1000, { from: 'first' }),
      });
    });

    return () => scope.revert();
  }, [authorized]);

  if (!authorized && !loading && error) {
    return (
      <div className="min-h-screen bg-bg-void flex items-center justify-center px-4">
        <HudPanel accent="coral" className="p-6 text-center">
          <div className="font-display text-sm text-neon-coral tracking-[3px]">
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
      accent: 'lime' as const,
      link: '/sudosuperuser-ostaad/skills',
      action: 'Manage Skills',
    },
    {
      label: 'PROJECTS',
      value: projectCount,
      numeric: true as const,
      accent: 'coral' as const,
      link: '/sudosuperuser-ostaad/projects',
      action: 'Manage Projects',
    },
    {
      label: 'BLOG POSTS',
      value: blogCount,
      numeric: true as const,
      accent: 'amber' as const,
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
            <h2
              className="font-display text-lg text-neon-cyan tracking-wider"
              // Replaces the retired `text-shadow-neon-cyan`, which was
              // `0 0 8px var(--neon-cyan), 0 0 16px var(--glow-cyan)` — an
              // opaque core plus a wide halo. The admin panel is matte and
              // mono-chrome since the editorial restyle, so this page title
              // takes only the faintest token-backed lift: 0.1 alpha, no core.
              // It reads as a lit edge rather than a lamp, and it stops the
              // cyan title looking unfinished against the `--glow-cyan-faint`
              // hairline the admin chrome already draws beneath it.
              style={{ textShadow: '0 0 14px var(--glow-cyan-faint)' }}
            >
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
                    <Link href={card.link} legacyBehavior>
                      <a className="inline-flex items-center min-h-[44px] min-w-[44px] text-[10px] font-display tracking-[2px] text-neon-cyan hover:text-neon-amber transition-colors">
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
            <HudPanel accent="cyan" title="// QUICK_ACTIONS" className="p-4">
              <div className="space-y-2">
                {QUICK_ACTIONS.map((action) => (
                  <Link key={action.href} href={action.href} legacyBehavior>
                    <a className="block px-3 py-2.5 min-h-[44px] min-w-[44px] bg-[var(--overlay-white-03)] border border-[var(--overlay-white-10)] text-text-secondary hover:text-text-primary hover:border-neon-cyan/30 hover:bg-neon-cyan/5 transition-all duration-200 text-xs font-body clip-notch-sm">
                      {action.label}
                    </a>
                  </Link>
                ))}
              </div>
            </HudPanel>

            <HudPanel accent="coral" title="// SYSTEM_INFO" className="p-4">
              <div className="space-y-2 text-xs font-body">
                <Row label="Logged in as" value={user?.username || '—'} />
                <Row label="Email" value={user?.email || 'Not set'} />
                <div className="flex justify-between items-center py-2 border-b border-[var(--overlay-white-05)]">
                  <span className="text-text-muted">Profile</span>
                  <NeonChip accent={profile?.full_name ? 'lime' : 'amber'}>
                    {profile?.full_name ? 'CONFIGURED' : 'INCOMPLETE'}
                  </NeonChip>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-text-muted">Content</span>
                  <NeonChip
                    accent={
                      skillCount > 0 && projectCount > 0 ? 'lime' : 'amber'
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
    <div className="flex justify-between py-2 border-b border-[var(--overlay-white-05)]">
      <span className="text-text-muted">{label}</span>
      <span className="text-text-primary font-medium truncate ml-3">
        {value}
      </span>
    </div>
  );
}

export default DashboardPage;
