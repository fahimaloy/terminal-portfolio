import Head from 'next/head';
import React from 'react';
import { useRouter } from 'next/router';

const LoginPage = () => {
  const router = useRouter();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok && result?.ok) {
        setUsername('');
        setPassword('');
        await router.push('/sudosuperuser-ostaad');
      } else {
        setError(result?.error || 'Authentication failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin Login</title>
      </Head>

      <div className="min-h-screen bg-black text-green-400 font-mono flex items-center justify-center">
        <div className="w-full max-w-md p-8 border-2 border-green-400">
          <h1 className="text-3xl font-bold mb-8 text-center">Admin Login</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-900 text-red-300 border border-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <label className="block text-sm mb-2">Username:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black disabled:opacity-50"
                placeholder="Enter username"
              />
            </div>

            <div className="mb-8">
              <label className="block text-sm mb-2">Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black disabled:opacity-50"
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-green-400 text-black font-bold hover:bg-green-300 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Logging In...' : 'Login'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-green-400 text-xs text-center text-green-300">
            <p>$ sudosuperuser-ostaad</p>
            <p>Type the command to access the admin panel</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
