import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import type { Profile } from './types';

interface AuthContextType {
  user: Profile | null;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let mounted = true;

    // Use onAuthStateChange as the single source of truth.
    // It fires INITIAL_SESSION on mount (even on refresh), so we don't
    // need a separate getSession() call which can race with it.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      if (!mounted) return;

      if (session?.user) {
        try {
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (profileErr) throw profileErr;
          if (mounted) setUser(profile || null);
        } catch (err) {
          console.error('Profile fetch error:', err);
          if (mounted) setUser(null);
        }
      } else {
        if (mounted) setUser(null);
      }

      if (mounted) setLoading(false);
    });

    // Safety timeout — if onAuthStateChange never fires (e.g. network issue),
    // unblock the UI after 4 seconds so users aren't stuck on the spinner.
    const timeoutId = setTimeout(() => {
      if (mounted) {
        setLoading((prev) => {
          if (prev) console.warn('Auth safety timeout triggered — unblocking UI');
          return false;
        });
      }
    }, 4000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (username: string, password: string, rememberMe: boolean = true): Promise<boolean> => {
    // Set the remember preference in localStorage so customStorage knows where to save the session
    localStorage.setItem('pmms-auth-remember', rememberMe ? 'true' : 'false');
    
    const { error } = await supabase.auth.signInWithPassword({
      email: `${username}@pmms.local`,
      password,
    });
    return !error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
