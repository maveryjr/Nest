import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { 
  SavedLink, 
  Collection, 
  Highlight, 
  Category, 
  SmartCollection,
  ReadingAnalytics,
  NestSettings
} from '../types';

export interface NestApiConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  userId?: string;
}

export class NestApiClient {
  private supabase: SupabaseClient;
  private userId?: string;

  constructor(config: NestApiConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
    this.userId = config.userId;
  }

  // Authentication methods
  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (data.user) {
      this.userId = data.user.id;
    }
    
    return { data, error };
  }

  async signUp(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    });
    
    if (data.user) {
      this.userId = data.user.id;
    }
    
    return { data, error };
  }

  async signInWithMagicLink(email: string, redirectTo?: string) {
    const { data, error } = await this.supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo || 'http://localhost:3000/auth/callback',
      },
    });
    
    return { data, error };
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    this.userId = undefined;
    return { error };
  }

  async getCurrentUser() {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (user) {
      this.userId = user.id;
    }
    return user;
  }

  // Links management
  async getLinks(): Promise<SavedLink[]> {
    if (!this.userId) throw new Error('User not authenticated');
    
    const { data, error } = await this.supabase
      .from('links')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return this.transformLinks(data || []);
  }

  async getLinkById(id: string): Promise<SavedLink | null> {
    if (!this.userId) throw new Error('User not authenticated');
    
    const { data, error } = await this.supabase
      .from('links')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    
    return this.transformLink(data);
  }

  async addLink(link: Omit<SavedLink, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedLink> {
    if (!this.userId) throw new Error('User not authenticated');

    const linkData = {
      ...link,
      user_id: this.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('links')
      .insert([this.transformLinkForDb(linkData)])
      .select()
      .single();

    if (error) throw error;
    return this.transformLink(data);
  }

  async updateLink(id: string, updates: Partial<SavedLink>): Promise<SavedLink> {
    if (!this.userId) throw new Error('User not authenticated');

    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('links')
      .update(this.transformLinkForDb(updateData))
      .eq('id', id)
      .eq('user_id', this.userId)
      .select()
      .single();

    if (error) throw error;
    return this.transformLink(data);
  }

  async deleteLink(id: string): Promise<void> {
    if (!this.userId) throw new Error('User not authenticated');

    const { error } = await this.supabase
      .from('links')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);

    if (error) throw error;
  }

  // Collections management
  async getCollections(): Promise<Collection[]> {
    if (!this.userId) throw new Error('User not authenticated');
    
    const { data, error } = await this.supabase
      .from('collections')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return this.transformCollections(data || []);
  }

  async addCollection(collection: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>): Promise<Collection> {
    if (!this.userId) throw new Error('User not authenticated');

    const collectionData = {
      ...collection,
      user_id: this.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('collections')
      .insert([this.transformCollectionForDb(collectionData)])
      .select()
      .single();

    if (error) throw error;
    return this.transformCollection(data);
  }

  async updateCollection(id: string, updates: Partial<Collection>): Promise<Collection> {
    if (!this.userId) throw new Error('User not authenticated');

    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('collections')
      .update(this.transformCollectionForDb(updateData))
      .eq('id', id)
      .eq('user_id', this.userId)
      .select()
      .single();

    if (error) throw error;
    return this.transformCollection(data);
  }

  async deleteCollection(id: string): Promise<void> {
    if (!this.userId) throw new Error('User not authenticated');

    const { error } = await this.supabase
      .from('collections')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);

    if (error) throw error;
  }

  // Highlights management
  async getHighlights(linkId?: string): Promise<Highlight[]> {
    if (!this.userId) throw new Error('User not authenticated');
    
    let query = this.supabase
      .from('highlights')
      .select('*')
      .eq('user_id', this.userId);

    if (linkId) {
      query = query.eq('link_id', linkId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return this.transformHighlights(data || []);
  }

  async addHighlight(highlight: Omit<Highlight, 'id' | 'createdAt' | 'updatedAt'>, linkId: string): Promise<Highlight> {
    if (!this.userId) throw new Error('User not authenticated');

    const highlightData = {
      ...highlight,
      link_id: linkId,
      user_id: this.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('highlights')
      .insert([this.transformHighlightForDb(highlightData)])
      .select()
      .single();

    if (error) throw error;
    return this.transformHighlight(data);
  }

  async updateHighlight(id: string, updates: Partial<Highlight>): Promise<Highlight> {
    if (!this.userId) throw new Error('User not authenticated');

    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('highlights')
      .update(this.transformHighlightForDb(updateData))
      .eq('id', id)
      .eq('user_id', this.userId)
      .select()
      .single();

    if (error) throw error;
    return this.transformHighlight(data);
  }

  async deleteHighlight(id: string): Promise<void> {
    if (!this.userId) throw new Error('User not authenticated');

    const { error } = await this.supabase
      .from('highlights')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);

    if (error) throw error;
  }

  // Search functionality
  async searchLinks(query: string, filters?: {
    category?: string;
    tags?: string[];
    collectionId?: string;
  }): Promise<SavedLink[]> {
    if (!this.userId) throw new Error('User not authenticated');
    
    let supabaseQuery = this.supabase
      .from('links')
      .select('*')
      .eq('user_id', this.userId);

    // Add text search
    if (query) {
      supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,user_note.ilike.%${query}%,url.ilike.%${query}%`);
    }

    // Add filters
    if (filters?.category) {
      supabaseQuery = supabaseQuery.eq('category', filters.category);
    }

    if (filters?.collectionId) {
      supabaseQuery = supabaseQuery.eq('collection_id', filters.collectionId);
    }

    if (filters?.tags && filters.tags.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('tags', filters.tags);
    }

    const { data, error } = await supabaseQuery.order('created_at', { ascending: false });

    if (error) throw error;
    return this.transformLinks(data || []);
  }

  // Real-time subscriptions
  subscribeToLinks(callback: (payload: any) => void) {
    if (!this.userId) throw new Error('User not authenticated');
    
    return this.supabase
      .channel('links_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'links',
          filter: `user_id=eq.${this.userId}`,
        },
        callback
      )
      .subscribe();
  }

  subscribeToCollections(callback: (payload: any) => void) {
    if (!this.userId) throw new Error('User not authenticated');
    
    return this.supabase
      .channel('collections_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collections',
          filter: `user_id=eq.${this.userId}`,
        },
        callback
      )
      .subscribe();
  }

  // Transform methods to convert between database and application formats
  private transformLink(dbLink: any): SavedLink {
    return {
      id: dbLink.id,
      url: dbLink.url,
      title: dbLink.title,
      favicon: dbLink.favicon,
      userNote: dbLink.user_note || '',
      aiSummary: dbLink.ai_summary,
      category: dbLink.category,
      collectionId: dbLink.collection_id,
      isInInbox: dbLink.is_in_inbox,
      createdAt: new Date(dbLink.created_at),
      updatedAt: new Date(dbLink.updated_at),
      domain: dbLink.domain,
      readingTime: dbLink.reading_time,
      tags: dbLink.tags || [],
      contentType: dbLink.content_type,
      mediaAttachments: dbLink.media_attachments || [],
      extractedText: dbLink.extracted_text,
      videoTimestamp: dbLink.video_timestamp,
      author: dbLink.author,
      publishDate: dbLink.publish_date ? new Date(dbLink.publish_date) : undefined,
      sourceMetadata: dbLink.source_metadata,
    };
  }

  private transformLinks(dbLinks: any[]): SavedLink[] {
    return dbLinks.map(link => this.transformLink(link));
  }

  private transformLinkForDb(link: any): any {
    return {
      url: link.url,
      title: link.title,
      favicon: link.favicon,
      user_note: link.userNote,
      ai_summary: link.aiSummary,
      category: link.category,
      collection_id: link.collectionId,
      is_in_inbox: link.isInInbox,
      domain: link.domain,
      reading_time: link.readingTime,
      tags: link.tags,
      content_type: link.contentType,
      media_attachments: link.mediaAttachments,
      extracted_text: link.extractedText,
      video_timestamp: link.videoTimestamp,
      author: link.author,
      publish_date: link.publishDate?.toISOString(),
      source_metadata: link.sourceMetadata,
      created_at: link.created_at,
      updated_at: link.updated_at,
      user_id: link.user_id,
    };
  }

  private transformCollection(dbCollection: any): Collection {
    return {
      id: dbCollection.id,
      name: dbCollection.name,
      description: dbCollection.description,
      createdAt: new Date(dbCollection.created_at),
      updatedAt: new Date(dbCollection.updated_at),
      color: dbCollection.color,
      icon: dbCollection.icon,
      isPublic: dbCollection.is_public,
      tags: dbCollection.tags || [],
    };
  }

  private transformCollections(dbCollections: any[]): Collection[] {
    return dbCollections.map(collection => this.transformCollection(collection));
  }

  private transformCollectionForDb(collection: any): any {
    return {
      name: collection.name,
      description: collection.description,
      color: collection.color,
      icon: collection.icon,
      is_public: collection.isPublic,
      tags: collection.tags,
      created_at: collection.created_at,
      updated_at: collection.updated_at,
      user_id: collection.user_id,
    };
  }

  private transformHighlight(dbHighlight: any): Highlight {
    return {
      id: dbHighlight.id,
      selectedText: dbHighlight.selected_text,
      context: dbHighlight.context,
      position: dbHighlight.position,
      createdAt: new Date(dbHighlight.created_at),
      updatedAt: new Date(dbHighlight.updated_at),
      userNote: dbHighlight.user_note,
      tags: dbHighlight.tags || [],
    };
  }

  private transformHighlights(dbHighlights: any[]): Highlight[] {
    return dbHighlights.map(highlight => this.transformHighlight(highlight));
  }

  private transformHighlightForDb(highlight: any): any {
    return {
      selected_text: highlight.selectedText,
      context: highlight.context,
      position: highlight.position,
      user_note: highlight.userNote,
      tags: highlight.tags,
      created_at: highlight.created_at,
      updated_at: highlight.updated_at,
      link_id: highlight.link_id,
      user_id: highlight.user_id,
    };
  }
}

// Factory function to create API client
export function createNestApiClient(config: NestApiConfig): NestApiClient {
  return new NestApiClient(config);
}

// Export types for consumers
export * from '../types'; 