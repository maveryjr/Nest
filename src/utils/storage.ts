import { supabase } from './supabase';
import { SavedLink, Collection, StorageData, Category } from '../types';

class StorageManager {
  async getData(): Promise<StorageData> {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      // No active session, return default empty data.
      return this.getDefaultData();
    }

    const user = sessionData.session.user;
    console.log('Fetching data for user:', user.id);

    const [linksRes, collectionsRes] = await Promise.all([
      supabase.from('links').select('*').eq('user_id', user.id),
      supabase.from('collections').select('*').eq('user_id', user.id)
    ]);

    if (linksRes.error) console.error('Error fetching links:', linksRes.error);
    if (collectionsRes.error) console.error('Error fetching collections:', collectionsRes.error);

    const data: StorageData = {
      links: (linksRes.data as SavedLink[]) || [],
      collections: (collectionsRes.data as Collection[]) || [],
      categories: this.getDefaultCategories(),
      settings: {
        defaultCategory: 'general',
        autoSummarize: true,
      }
    };

    console.log('Data fetched from Supabase:', data);
    return data;
  }
  
  async addLink(link: Omit<SavedLink, 'id' | 'createdAt' | 'updatedAt' | 'user_id'>): Promise<void> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) throw new Error('User not logged in.');

    const { error } = await supabase.from('links').insert({ ...link, user_id: user.id });
    if (error) throw error;
  }

  async updateLink(linkId: string, updates: Partial<SavedLink>): Promise<void> {
    const { error } = await supabase.from('links').update({ ...updates, updatedAt: new Date() }).eq('id', linkId);
    if (error) throw error;
  }

  async deleteLink(linkId: string): Promise<void> {
    const { error } = await supabase.from('links').delete().eq('id', linkId);
    if (error) throw error;
  }

  async addCollection(collection: Omit<Collection, 'id' | 'createdAt' | 'updatedAt' | 'user_id'>): Promise<void> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) throw new Error('User not logged in.');
    
    const { error } = await supabase.from('collections').insert({ ...collection, user_id: user.id });
    if (error) throw error;
  }

  async updateCollection(collectionId: string, updates: Partial<Collection>): Promise<void> {
    const { error } = await supabase.from('collections').update({ ...updates, updatedAt: new Date() }).eq('id', collectionId);
    if (error) throw error;
  }

  async deleteCollection(collectionId: string): Promise<void> {
    // We can add logic here to reassign links if needed, for now just delete
    const { error } = await supabase.from('collections').delete().eq('id', collectionId);
    if (error) throw error;
  }

  private getDefaultCategories(): Category[] {
    return [
      { id: 'general', name: 'General', color: '#6b7280', isDefault: true },
      { id: 'work', name: 'Work', color: '#3b82f6' },
      { id: 'personal', name: 'Personal', color: '#10b981' },
      { id: 'learning', name: 'Learning', color: '#f59e0b' }
    ];
  }

  private getDefaultData(): StorageData {
    return {
      links: [],
      collections: [],
      categories: this.getDefaultCategories(),
      settings: {
        defaultCategory: 'general',
        autoSummarize: true
      }
    };
  }
}

export const storage = new StorageManager(); 