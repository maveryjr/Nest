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

    // Map database fields to TypeScript camelCase
    const links = (linksRes.data || []).map((dbLink: any) => ({
      id: dbLink.id,
      url: dbLink.url,
      title: dbLink.title,
      favicon: dbLink.favicon,
      userNote: dbLink.user_note || '',
      aiSummary: dbLink.ai_summary,
      category: dbLink.category,
      collectionId: dbLink.collection_id,
      isInInbox: dbLink.is_in_inbox || false,
      createdAt: new Date(dbLink.created_at),
      updatedAt: new Date(dbLink.updated_at),
      domain: dbLink.domain,
    }));

    const collections = (collectionsRes.data || []).map((dbCol: any) => ({
      id: dbCol.id,
      name: dbCol.name,
      description: dbCol.description,
      color: dbCol.color,
      createdAt: new Date(dbCol.created_at),
      updatedAt: new Date(dbCol.updated_at),
    }));

    const data: StorageData = {
      links,
      collections,
      categories: this.getDefaultCategories(),
      settings: {
        defaultCategory: 'general',
        autoSummarize: true,
      }
    };

    console.log('Data fetched from Supabase:', data);
    return data;
  }
  
  async addLink(link: Omit<SavedLink, 'id' | 'createdAt' | 'updatedAt' | 'user_id'>): Promise<{ success: boolean, error?: string }> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      console.error('User not logged in');
      return { success: false, error: 'User not logged in.' };
    }

    // Map camelCase to snake_case for database insertion
    const dbLink = {
      user_id: user.id,
      collection_id: link.collectionId || null,
      url: link.url,
      title: link.title,
      favicon: link.favicon,
      domain: link.domain,
      user_note: link.userNote,
      ai_summary: link.aiSummary,
      category: link.category,
      is_in_inbox: link.isInInbox || false,
    };

    const { error } = await supabase.from('links').insert(dbLink);
    if (error) {
      console.error('Supabase addLink error:', error);
      return { success: false, error: error.message || 'Database error occurred.' };
    }
    return { success: true };
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
    
    // Map camelCase to snake_case for database insertion
    const dbCollection = {
      user_id: user.id,
      name: collection.name,
      description: collection.description,
      color: collection.color,
    };
    
    const { error } = await supabase.from('collections').insert(dbCollection);
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

  async searchLinks(query: string): Promise<SavedLink[]> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      console.error('User not logged in');
      return [];
    }

    if (!query.trim()) {
      return [];
    }

    try {
      const { data, error } = await supabase.rpc('search_user_links', {
        search_query: query.trim(),
        user_uuid: user.id,
        result_limit: 50
      });

      if (error) {
        console.error('Search error:', error);
        return [];
      }

      // Map database results to TypeScript objects
      return (data || []).map((result: any) => ({
        id: result.id,
        url: result.url,
        title: result.title,
        favicon: result.favicon,
        userNote: result.user_note || '',
        aiSummary: result.ai_summary,
        category: result.category,
        collectionId: result.collection_id,
        createdAt: new Date(result.created_at),
        updatedAt: new Date(result.updated_at),
        domain: result.domain,
        // Add search-specific properties
        searchRank: result.rank,
        searchHeadline: result.headline,
      }));
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  async getUserTags(): Promise<{ id: string; name: string; usageCount: number }[]> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      console.error('User not logged in');
      return [];
    }

    try {
      const { data, error } = await supabase.rpc('get_user_tags_with_counts', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error fetching user tags:', error);
        return [];
      }

      return (data || []).map((tag: any) => ({
        id: tag.id,
        name: tag.name,
        usageCount: tag.usage_count || 0
      }));
    } catch (error) {
      console.error('Failed to get user tags:', error);
      return [];
    }
  }

  async getLinkTags(linkId: string): Promise<{ id: string; name: string }[]> {
    try {
      const { data, error } = await supabase.rpc('get_link_tags', {
        link_uuid: linkId
      });

      if (error) {
        console.error('Error fetching link tags:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get link tags:', error);
      return [];
    }
  }

  async addTagsToLink(linkId: string, tagNames: string[]): Promise<{ success: boolean; error?: string }> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      return { success: false, error: 'User not logged in.' };
    }

    try {
      const { error } = await supabase.rpc('add_tags_to_link', {
        link_uuid: linkId,
        tag_names: tagNames,
        user_uuid: user.id
      });

      if (error) {
        console.error('Error adding tags to link:', error);
        return { success: false, error: error.message || 'Failed to add tags.' };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to add tags to link:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async getLinksByTag(tagName: string): Promise<SavedLink[]> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      console.error('User not logged in');
      return [];
    }

    try {
      const { data, error } = await supabase.rpc('get_links_by_tag', {
        user_uuid: user.id,
        tag_name: tagName
      });

      if (error) {
        console.error('Error fetching links by tag:', error);
        return [];
      }

      // Map database results to TypeScript objects
      return (data || []).map((dbLink: any) => ({
        id: dbLink.id,
        url: dbLink.url,
        title: dbLink.title,
        favicon: dbLink.favicon,
        userNote: dbLink.user_note || '',
        aiSummary: dbLink.ai_summary,
        category: dbLink.category,
        collectionId: dbLink.collection_id,
        createdAt: new Date(dbLink.created_at),
        updatedAt: new Date(dbLink.updated_at),
        domain: dbLink.domain,
      }));
    } catch (error) {
      console.error('Failed to get links by tag:', error);
      return [];
    }
  }

  async cleanupUnusedTags(): Promise<number> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      return 0;
    }

    try {
      const { data, error } = await supabase.rpc('cleanup_unused_tags', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error cleaning up unused tags:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Failed to cleanup unused tags:', error);
      return 0;
    }
  }

  // Inbox-specific methods
  async moveToInbox(linkId: string): Promise<void> {
    const { error } = await supabase
      .from('links')
      .update({ 
        is_in_inbox: true,
        collection_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', linkId);
    if (error) throw error;
  }

  async moveFromInbox(linkId: string, collectionId?: string): Promise<void> {
    const { error } = await supabase
      .from('links')
      .update({ 
        is_in_inbox: false,
        collection_id: collectionId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', linkId);
    if (error) throw error;
  }

  async getInboxLinks(): Promise<SavedLink[]> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_in_inbox', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching inbox links:', error);
      return [];
    }

    return (data || []).map((dbLink: any) => ({
      id: dbLink.id,
      url: dbLink.url,
      title: dbLink.title,
      favicon: dbLink.favicon,
      userNote: dbLink.user_note || '',
      aiSummary: dbLink.ai_summary,
      category: dbLink.category,
      collectionId: dbLink.collection_id,
      isInInbox: dbLink.is_in_inbox || false,
      createdAt: new Date(dbLink.created_at),
      updatedAt: new Date(dbLink.updated_at),
      domain: dbLink.domain,
    }));
  }

  async bulkMoveFromInbox(linkIds: string[], collectionId?: string): Promise<void> {
    const { error } = await supabase
      .from('links')
      .update({ 
        is_in_inbox: false,
        collection_id: collectionId || null,
        updated_at: new Date().toISOString()
      })
      .in('id', linkIds);
    if (error) throw error;
  }

  async toggleCollectionSharing(collectionId: string, makePublic: boolean): Promise<{ success: boolean; shareToken?: string; message: string }> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      return { success: false, message: 'User not logged in.' };
    }

    try {
      const { data, error } = await supabase.rpc('toggle_collection_sharing', {
        collection_uuid: collectionId,
        user_uuid: user.id,
        make_public: makePublic
      });

      if (error) {
        console.error('Error toggling collection sharing:', error);
        return { success: false, message: error.message || 'Failed to update sharing settings.' };
      }

      const result = data?.[0];
      return {
        success: result?.success || false,
        shareToken: result?.share_token,
        message: result?.message || 'Sharing settings updated.'
      };
    } catch (error) {
      console.error('Failed to toggle collection sharing:', error);
      return { success: false, message: (error as Error).message };
    }
  }

  async getCollectionSharingInfo(collectionId: string): Promise<{ isPublic: boolean; shareToken?: string; viewCount: number } | null> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('collections')
        .select('is_public, share_token, view_count')
        .eq('id', collectionId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching collection sharing info:', error);
        return null;
      }

      return {
        isPublic: data.is_public || false,
        shareToken: data.share_token,
        viewCount: data.view_count || 0
      };
    } catch (error) {
      console.error('Failed to get collection sharing info:', error);
      return null;
    }
  }

  // Public methods for viewing shared collections (no auth required)
  static async getPublicCollection(shareToken: string): Promise<{
    id: string;
    name: string;
    description?: string;
    viewCount: number;
    createdAt: Date;
    ownerEmail: string;
  } | null> {
    try {
      const { data, error } = await supabase.rpc('get_public_collection', {
        token: shareToken
      });

      if (error) {
        console.error('Error fetching public collection:', error);
        return null;
      }

      const collection = data?.[0];
      if (!collection) {
        return null;
      }

      return {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        viewCount: collection.view_count || 0,
        createdAt: new Date(collection.created_at),
        ownerEmail: collection.owner_email
      };
    } catch (error) {
      console.error('Failed to get public collection:', error);
      return null;
    }
  }

  static async getPublicCollectionLinks(shareToken: string): Promise<Array<{
    id: string;
    url: string;
    title: string;
    favicon?: string;
    domain: string;
    userNote?: string;
    aiSummary?: string;
    category: string;
    createdAt: Date;
    tags: string[];
  }>> {
    try {
      const { data, error } = await supabase.rpc('get_public_collection_links', {
        token: shareToken
      });

      if (error) {
        console.error('Error fetching public collection links:', error);
        return [];
      }

      return (data || []).map((link: any) => ({
        id: link.id,
        url: link.url,
        title: link.title,
        favicon: link.favicon,
        domain: link.domain,
        userNote: link.user_note,
        aiSummary: link.ai_summary,
        category: link.category,
        createdAt: new Date(link.created_at),
        tags: link.tag_names || []
      }));
    } catch (error) {
      console.error('Failed to get public collection links:', error);
      return [];
    }
  }

  static async incrementViewCount(shareToken: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_collection_views', {
        token: shareToken
      });

      if (error) {
        console.error('Error incrementing view count:', error);
      }
    } catch (error) {
      console.error('Failed to increment view count:', error);
    }
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