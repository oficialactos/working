import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

// Custom storage adapter for Capacitor
const isNative = Capacitor.isNativePlatform();

const capacitorStorage = {
  getItem: async (key: string) => {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key: string, value: string) => {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string) => {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key });
  },
};

const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: isNative ? capacitorStorage : undefined,
  }
});

function normalizeSupabaseUrl(value?: string) {
  const url = value?.trim();
  if (!url) return 'https://placeholder.supabase.co';

  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
