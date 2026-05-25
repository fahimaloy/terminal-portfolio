import React, { useState } from 'react';
import axios from 'axios';

export const MeetingBooking: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !date || !time) {
      setStatus('error');
      setMessage('Please fill in all required fields.');
      return;
    }

    setStatus('loading');
    try {
      const res = await axios.post('/api/book-meeting', {
        name,
        email,
        date,
        time,
        reason,
      });

      if (res.data?.ok) {
        setStatus('success');
        setMessage('Your meeting requested has been placed!');
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        throw new Error('Something went wrong');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || err.message || 'Failed to book meeting');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0F172A] border border-purple-500/20 shadow-[0_0_30px_rgba(139,92,246,0.1)] rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold font-sans text-white">Book a Meeting</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 font-sans">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                className="form-premium-input w-full rounded-xl px-4 py-2.5 text-white focus:outline-none text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                required
                className="form-premium-input w-full rounded-xl px-4 py-2.5 text-white focus:outline-none text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2 bg-[#1E293B] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all [color-scheme:dark]"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Time <span className="text-red-500">*</span></label>
                <input
                  type="time"
                  required
                  className="w-full px-4 py-2 bg-[#1E293B] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all [color-scheme:dark]"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Reason for meeting</label>
              <textarea
                className="form-premium-input w-full rounded-xl px-4 py-2.5 text-white focus:outline-none text-sm resize-none h-24"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly describe what you'd like to discuss..."
              />
            </div>

            {status === 'error' && (
              <div className="text-red-400 text-sm py-2">{message}</div>
            )}
            
            {status === 'success' && (
              <div className="text-lime-400 text-sm py-2">{message}</div>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#0F172A] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {status === 'loading' ? 'Booking...' : status === 'success' ? 'Booked!' : 'Submit Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
