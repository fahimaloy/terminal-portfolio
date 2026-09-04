import Head from 'next/head';
import React from 'react';
import {
  getMeetings,
  deleteMeeting,
  updateMeeting,
  PortfolioMeeting,
} from '../../utils/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminGuard } from '../../utils/adminPageGuard';
import { GlitchText, HudPanel, NeonButton } from '../../components/ui';

const MeetingsPage = () => {
  const { authorized, loading, user } = useAdminGuard();
  const [meetings, setMeetings] = React.useState<PortfolioMeeting[]>([]);
  const [statusMessage, setStatusMessage] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const loadData = React.useCallback(async () => {
    const data = await getMeetings();
    setMeetings(data);
  }, []);

  React.useEffect(() => {
    if (authorized) {
      loadData();
    }
  }, [authorized, loadData]);

  const updateStatus = (message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(''), 2500);
  };

  const handleStatusChange = async (id: number, status: string) => {
    setIsSaving(true);
    const ok = await updateMeeting(id, { status });
    updateStatus(ok ? 'Status updated.' : 'Failed to update status.');
    if (ok) {
      await loadData();
    }
    setIsSaving(false);
  };

  const handleDeleteMeeting = async (id: number) => {
    if (!confirm('Are you sure you want to delete this meeting request?'))
      return;

    setIsSaving(true);
    const ok = await deleteMeeting(id);
    updateStatus(ok ? 'Meeting deleted.' : 'Failed to delete meeting.');
    if (ok) {
      await loadData();
    }
    setIsSaving(false);
  };

  if (!authorized) return null;

  return (
    <>
      <Head>
        <title>Meetings - Admin Panel</title>
      </Head>

      <AdminLayout user={user} isLoading={loading}>
        <div className="max-w-4xl">
          <GlitchText
            accent="yellow"
            className="text-2xl font-display tracking-[2px] mb-6"
          >
            MEETING REQUESTS
          </GlitchText>

          {statusMessage && (
            <HudPanel accent="green" notch="sm" className="mb-4 p-3">
              <span className="font-body text-sm text-neon-green">
                {statusMessage}
              </span>
            </HudPanel>
          )}

          {meetings.length > 0 ? (
            <HudPanel accent="yellow" notch="md" className="p-6">
              <div className="text-[10px] font-display tracking-[3px] text-neon-yellow mb-4">
                REQUESTS ({meetings.length})
              </div>
              <div className="space-y-4">
                {meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="p-4 bg-white/[0.03] border border-white/10 clip-notch-sm flex flex-col md:flex-row justify-between gap-4 hover:border-neon-cyan/30 transition-all duration-200"
                  >
                    <div className="flex-1">
                      <div className="font-display tracking-[2px] text-text-primary text-sm mb-1">
                        {meeting.name} &lt;{meeting.email}&gt;
                      </div>
                      <div className="font-body text-sm text-text-muted mb-1">
                        <span className="font-display text-[10px] tracking-[2px]">
                          Date & Time:
                        </span>{' '}
                        {meeting.date} at {meeting.time}
                      </div>
                      <div className="font-body text-sm text-text-muted mb-2">
                        <span className="font-display text-[10px] tracking-[2px]">
                          Reason:
                        </span>{' '}
                        {meeting.reason || 'N/A'}
                      </div>
                      <div className="font-mono text-xs text-text-muted">
                        Requested on:{' '}
                        {new Date(meeting.created_at || '').toLocaleString()}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <select
                        className="bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] clip-notch-sm transition-all duration-200 [color-scheme:dark]"
                        value={meeting.status}
                        onChange={(e) =>
                          handleStatusChange(meeting.id, e.target.value)
                        }
                        disabled={isSaving}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                      </select>
                      <NeonButton
                        variant="ghost"
                        accent="red"
                        onClick={() => handleDeleteMeeting(meeting.id)}
                        disabled={isSaving}
                      >
                        DELETE
                      </NeonButton>
                    </div>
                  </div>
                ))}
              </div>
            </HudPanel>
          ) : (
            <HudPanel accent="yellow" notch="md" className="p-6 text-center">
              <span className="font-body text-sm text-text-muted">
                No meeting requests yet.
              </span>
            </HudPanel>
          )}
        </div>
      </AdminLayout>
    </>
  );
};

export default MeetingsPage;
