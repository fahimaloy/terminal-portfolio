import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

type AdminSessionUser = {
  username: string;
  email: string | null;
};

export const useAdminGuard = () => {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AdminSessionUser | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/admin/session', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          router.push('/sudosuperuser-ostaad/login');
          setAuthorized(false);
          setLoading(false);
          return;
        }

        const data = await response.json();
        if (data.user) {
          setUser(data.user);
          setAuthorized(true);
        } else {
          router.push('/sudosuperuser-ostaad/login');
          setAuthorized(false);
        }
      } catch (error) {
        router.push('/sudosuperuser-ostaad/login');
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

  return { authorized, loading, user };
};

export const logout = async () => {
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (_error) {
    // Ignore logout errors and continue redirect flow.
  }
};
