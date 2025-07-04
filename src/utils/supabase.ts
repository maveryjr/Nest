import { createClient } from '@supabase/supabase-js';

// Custom storage adapter for Chrome extension
const customStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  },
  async setItem(key: string, value: string): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  },
  async removeItem(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
  },
};

const supabaseUrl = 'https://tpjnyiyvpyzzbzhajbjh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwam55aXl2cHl6emJ6aGFqYmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NDA1NTQsImV4cCI6MjA2NzIxNjU1NH0.cflFdHytlTUA_H_AP7E3Kry9-S-xw45pIRoJQtfk4AE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}); 