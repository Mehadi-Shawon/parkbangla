import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (authUser) => {
    if (!authUser) { setUser(null); return null; }
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .single();
    setUser(data || null);
    return data || null;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session?.user ?? null).finally(() => setLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchProfile(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Account profile not found. Please contact support.');
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      throw new Error('Your account has been deactivated. Contact support.');
    }

    setUser(profile);
    return profile;
  };

  const register = async ({ name, email, phone, password, role }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone: phone || null, role: role || 'driver' } },
    });
    if (error) { console.error('signUp error:', error); throw error; }

    // The handle_new_auth_user trigger creates the public.users row synchronously,
    // but the JS client may need a moment for replication. Wait briefly then fetch.
    await new Promise(r => setTimeout(r, 1500));

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .single();

    // If profile is null (e.g. email confirmation pending), construct a minimal object
    // so the caller can still navigate. The full profile will load on next session restore.
    const userData = profile || { name, email, phone, role: role || 'driver' };
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateUser = (updates) => setUser(prev => ({ ...prev, ...updates }));

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
