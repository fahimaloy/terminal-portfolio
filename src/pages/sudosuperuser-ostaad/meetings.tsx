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
          <h2 className="text-2xl font-bold mb-6">Meeting Requests</h2>

          {statusMessage && (
            <div className="mb-4 p-3 bg-lime-500/10 border border-lime-500/30 text-lime-400 text-sm rounded-xl">
              {statusMessage}
            </div>
          )}

          {meetings.length > 0 ? (
            <div className="glass-deep rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Requests ({meetings.length})
              </h3>
              <div className="space-y-4">
                {meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="p-4 bg-white/5 border border-gray-800 rounded-xl flex flex-col md:flex-row justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="font-bold text-white mb-1">
                        {meeting.name} &lt;{meeting.email}&gt;
                      </div>
                      <div className="text-sm text-gray-400 mb-1">
                        <span className="font-bold">Date & Time:</span>{' '}
                        {meeting.date} at {meeting.time}
                      </div>
                      <div className="text-sm text-gray-400 mb-2">
                        <span className="font-bold">Reason:</span>{' '}
                        {meeting.reason || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Requested on:{' '}
                        {new Date(meeting.created_at || '').toLocaleString()}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <select
                        className="form-premium-input rounded-xl p-2 text-white text-sm focus:outline-none"
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
                      <button
                        onClick={() => handleDeleteMeeting(meeting.id)}
                        disabled={isSaving}
                        className="bg-white/5 border border-gray-700/50 text-gray-400 rounded-xl hover:text-white hover:bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm transition-all disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 p-6 glass-deep rounded-xl">
              No meeting requests yet.
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
};

export default MeetingsPage;
