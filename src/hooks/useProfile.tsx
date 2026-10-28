'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Profile, UserRole } from '@/types';

// Shown on the login page after a forced sign-out.
export const LOGIN_NOTICE_KEY = 'zeiterfassung:login-notice';

const roleCacheKey = (userId: string) => `zeiterfassung:role:${userId}`;

// How often a returning window re-checks that the account is still enabled.
const RECHECK_MIN_INTERVAL_MS = 60_000;

interface ProfileContextValue {
  role: UserRole | null;
  username: string | null;
  email: string | null;
  isAdmin: boolean;
  loading: boolean;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

const readCachedRole = (userId: string): UserRole | null => {
  try {
    const value = localStorage.getItem(roleCacheKey(userId));
    return value === 'admin' || value === 'user' ? value : null;
  } catch {
    return null;
  }
};

const writeCachedRole = (userId: string, role: UserRole): void => {
  try {
    localStorage.setItem(roleCacheKey(userId), role);
  } catch {
    // storage unavailable: the role is simply re-fetched next time
  }
};

export const ProfileProvider = ({ userId, children }: { userId: string; children: ReactNode }) => {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cachedRole] = useState<UserRole | null>(() => readCachedRole(userId));
  const [fetched, setFetched] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const lastCheckAt = useRef(0);

  // Read from the locally stored session, so this also works offline.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
  }, []);

  const forceSignOut = useCallback(
    async (notice: string) => {
      try {
        sessionStorage.setItem(LOGIN_NOTICE_KEY, notice);
      } catch {
        // the notice is only a courtesy
      }
      await supabase.auth.signOut();
      router.push('/login');
    },
    [router]
  );

  const check = useCallback(async () => {
    if (!navigator.onLine) return;
    lastCheckAt.current = Date.now();

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, role, disabled')
      .eq('id', userId)
      .maybeSingle();

    // Network or token trouble must not lock anyone out: keep the cached role.
    if (error) return;

    if (!data) {
      await forceSignOut('Für dieses Konto besteht kein Zugang. Bitte wenden Sie sich an den Administrator.');
      return;
    }
    if (data.disabled) {
      await forceSignOut('Dieses Konto wurde deaktiviert.');
      return;
    }

    writeCachedRole(userId, data.role);
    setProfile(data as Profile);
    setFetched(true);
  }, [userId, forceSignOut]);

  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => {
    const recheckOnReturn = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastCheckAt.current < RECHECK_MIN_INTERVAL_MS) return;
      check();
    };
    document.addEventListener('visibilitychange', recheckOnReturn);
    window.addEventListener('focus', recheckOnReturn);
    return () => {
      document.removeEventListener('visibilitychange', recheckOnReturn);
      window.removeEventListener('focus', recheckOnReturn);
    };
  }, [check]);

  const value = useMemo<ProfileContextValue>(() => {
    const role = profile?.role ?? cachedRole;
    return {
      role,
      username: profile?.username ?? null,
      email,
      isAdmin: role === 'admin',
      // Until the first answer arrives (or while offline with no cache) the role is unknown.
      loading: !fetched && cachedRole === null,
    };
  }, [profile, cachedRole, fetched, email]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

export const useProfile = (): ProfileContextValue => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile muss innerhalb von ProfileProvider verwendet werden');
  return ctx;
};
