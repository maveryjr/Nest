import { supabase } from './supabase';
import { SavedLink, Collection, StorageData, Category, SmartCollection } from '../types';
import { AnalyticsService } from './analytics';

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
    const links = (linksRes.data || []).map((dbLink: any) => {
      console.log('Storage: getData highlights for link', dbLink.id, dbLink.highlights);
      return {
        id: dbLink.id,
        url: dbLink.url,
        title: dbLink.title,
        favicon: dbLink.favicon,
        userNote: dbLink.user_note || '',
        aiSummary: dbLink.ai_summary,
        category: dbLink.category,
        collectionId: dbLink.collection_id,
        isInInbox: dbLink.is_in_inbox || false,
        highlights: this.parseHighlights(dbLink.highlights),
        createdAt: new Date(dbLink.created_at),
        updatedAt: new Date(dbLink.updated_at),
        domain: dbLink.domain,
      };
    });

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
      smartCollections: await this.getSmartCollections(),
      categories: this.getDefaultCategories(),
      settings: {
        defaultCategory: 'general',
        autoSummarize: true,
        enableSmartCollections: true,
      }
    };

    console.log('Data fetched from Supabase:', data);
    return data;
  }
  
  async addLink(link: Omit<SavedLink, 'id' | 'createdAt' | 'updatedAt' | 'user_id'>): Promise<{ success: boolean, error?: string, linkId?: string }> {
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
      highlights: link.highlights ? JSON.stringify(link.highlights) : null,
    };
    console.log('Storage: addLink dbLink.highlights:', dbLink.highlights);
    const { data, error } = await supabase.from('links').insert(dbLink).select('id').single();
    if (error) {
      console.error('Supabase addLink error:', error);
      return { success: false, error: error.message || 'Database error occurred.' };
    }
    return { success: true, linkId: data.id };
  }

  async updateLink(linkId: string, updates: Partial<SavedLink>): Promise<void> {
    // Convert highlights to JSON for database storage
    const dbUpdates: any = { ...updates, updated_at: new Date() };
    if (updates.highlights !== undefined) {
      dbUpdates.highlights = updates.highlights ? JSON.stringify(updates.highlights) : null;
    }
    // Remove camelCase fields that don't exist in database
    delete dbUpdates.collectionId;
    delete dbUpdates.userNote;
    delete dbUpdates.aiSummary;
    delete dbUpdates.isInInbox;
    delete dbUpdates.createdAt;
    delete dbUpdates.updatedAt;
    
    // Map camelCase to snake_case for database fields
    if (updates.collectionId !== undefined) dbUpdates.collection_id = updates.collectionId;
    if (updates.userNote !== undefined) dbUpdates.user_note = updates.userNote;
    if (updates.aiSummary !== undefined) dbUpdates.ai_summary = updates.aiSummary;
    if (updates.isInInbox !== undefined) dbUpdates.is_in_inbox = updates.isInInbox;
    console.log('Storage: updateLink dbUpdates.highlights:', dbUpdates.highlights);
    const { error } = await supabase.from('links').update(dbUpdates).eq('id', linkId);
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
        isInInbox: result.is_in_inbox || false,
        highlights: this.parseHighlights(result.highlights),
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
        isInInbox: dbLink.is_in_inbox || false,
        highlights: this.parseHighlights(dbLink.highlights),
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
      highlights: this.parseHighlights(dbLink.highlights),
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

  // Smart Collections methods
  async getSmartCollections(): Promise<SmartCollection[]> {
    // Get default smart collections
    const defaultCollections = this.getDefaultSmartCollections();
    
    // For now, return default collections only to avoid circular dependency
    // TODO: Implement AI-powered suggestions in a separate service
    return defaultCollections;
  }

  async generateAISmartCollections(links: SavedLink[]): Promise<SmartCollection[]> {
    // This method can be called separately to generate AI suggestions
    try {
      if (links.length > 5) {
        const { aiService } = await import('./ai');
        return await aiService.generateSmartCollectionSuggestions(links);
      }
    } catch (error) {
      console.error('Failed to generate AI smart collection suggestions:', error);
    }
    return [];
  }

  async createSmartCollection(collection: Omit<SmartCollection, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    // TODO: Implement database storage for smart collections
    console.log('Creating smart collection:', collection);
  }

  async updateSmartCollection(collectionId: string, updates: Partial<SmartCollection>): Promise<void> {
    // TODO: Implement database update for smart collections
    console.log('Updating smart collection:', collectionId, updates);
  }

  async deleteSmartCollection(collectionId: string): Promise<void> {
    // TODO: Implement database deletion for smart collections
    console.log('Deleting smart collection:', collectionId);
  }

  async getSmartCollectionLinks(smartCollectionId: string): Promise<SavedLink[]> {
    const smartCollections = await this.getSmartCollections();
    const smartCollection = smartCollections.find(sc => sc.id === smartCollectionId);
    
    if (!smartCollection) {
      return [];
    }

    // Get all user links
    const allLinks = (await this.getData()).links;
    
    // Apply filters based on smart collection criteria
    return this.filterLinksForSmartCollection(allLinks, smartCollection);
  }

  private filterLinksForSmartCollection(links: SavedLink[], smartCollection: SmartCollection): SavedLink[] {
    let filteredLinks = [...links];

    // Apply date range filter
    if (smartCollection.filters?.dateRange) {
      const { start, end } = smartCollection.filters.dateRange;
      filteredLinks = filteredLinks.filter(link => {
        const linkDate = link.createdAt;
        if (start && linkDate < start) return false;
        if (end && linkDate > end) return false;
        return true;
      });
    }

    // Apply category filter
    if (smartCollection.filters?.categories?.length) {
      filteredLinks = filteredLinks.filter(link => 
        smartCollection.filters!.categories!.includes(link.category)
      );
    }

    // Apply domain filter
    if (smartCollection.filters?.domains?.length) {
      filteredLinks = filteredLinks.filter(link => 
        smartCollection.filters!.domains!.some(domain => 
          link.domain.includes(domain)
        )
      );
    }

    // Apply content type filter (based on AI analysis or domain patterns)
    if (smartCollection.filters?.contentType?.length) {
      filteredLinks = filteredLinks.filter(link => {
        // Simple content type detection based on domain
        const contentType = this.detectContentTypeFromDomain(link.domain);
        return smartCollection.filters!.contentType!.includes(contentType);
      });
    }

    // Apply smart collection specific logic
    switch (smartCollection.id) {
      case 'recent-reads':
        return filteredLinks
          .filter(link => link.createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 20);

      case 'ai-related':
        return filteredLinks
          .filter(link => this.isAIRelated(link))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      case 'unread':
        return filteredLinks
          .filter(link => !link.userNote || link.userNote.trim() === '') // No notes = likely unread
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      case 'tutorials':
        return filteredLinks
          .filter(link => this.isTutorial(link))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      case 'github-repos':
        return filteredLinks
          .filter(link => link.domain.includes('github.com'))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      default:
        return filteredLinks;
    }
  }

  private detectContentTypeFromDomain(domain: string): string {
    if (domain.includes('youtube.com') || domain.includes('vimeo.com')) return 'video';
    if (domain.includes('github.com')) return 'tool';
    if (domain.includes('docs.') || domain.includes('documentation')) return 'documentation';
    if (domain.includes('medium.com') || domain.includes('blog')) return 'blog';
    if (domain.includes('news') || domain.includes('cnn.com')) return 'news';
    return 'article';
  }

  private isAIRelated(link: SavedLink): boolean {
    const content = `${link.title} ${link.userNote} ${link.aiSummary || ''}`.toLowerCase();
    const aiKeywords = [
      'artificial intelligence', 'machine learning', 'deep learning', 'neural network',
      'ai', 'ml', 'gpt', 'chatgpt', 'openai', 'tensorflow', 'pytorch', 'llm',
      'natural language processing', 'nlp', 'computer vision', 'reinforcement learning'
    ];
    return aiKeywords.some(keyword => content.includes(keyword));
  }

  private isTutorial(link: SavedLink): boolean {
    const content = `${link.title} ${link.userNote}`.toLowerCase();
    const tutorialKeywords = [
      'tutorial', 'how to', 'guide', 'step by step', 'learn', 'course',
      'introduction to', 'getting started', 'beginner', 'walkthrough'
    ];
    return tutorialKeywords.some(keyword => content.includes(keyword));
  }

  private getDefaultSmartCollections(): SmartCollection[] {
    const now = new Date();
    return [
      {
        id: 'recent-reads',
        name: '📚 Recent Reads',
        description: 'Links saved in the last 7 days',
        query: 'created_at >= now() - interval \'7 days\'',
        isSystem: true,
        autoUpdate: true,
        icon: '📚',
        color: '#3b82f6',
        filters: {
          dateRange: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'ai-related',
        name: '🤖 AI & Machine Learning',
        description: 'Content related to artificial intelligence and machine learning',
        query: 'title ILIKE \'%ai%\' OR title ILIKE \'%machine learning%\' OR title ILIKE \'%neural%\'',
        isSystem: true,
        autoUpdate: true,
        icon: '🤖',
        color: '#8b5cf6',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'unread',
        name: '📖 To Read',
        description: 'Links without notes (likely unread)',
        query: 'user_note IS NULL OR user_note = \'\'',
        isSystem: true,
        autoUpdate: true,
        icon: '📖',
        color: '#f59e0b',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'tutorials',
        name: '🎓 Tutorials & Guides',
        description: 'Educational content and tutorials',
        query: 'title ILIKE \'%tutorial%\' OR title ILIKE \'%guide%\' OR title ILIKE \'%how to%\'',
        isSystem: true,
        autoUpdate: true,
        icon: '🎓',
        color: '#10b981',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'github-repos',
        name: '⭐ GitHub Repositories',
        description: 'GitHub repositories and projects',
        query: 'domain LIKE \'%github.com%\'',
        isSystem: true,
        autoUpdate: true,
        icon: '⭐',
        color: '#6b7280',
        filters: {
          domains: ['github.com']
        },
        createdAt: now,
        updatedAt: now
      }
    ];
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
      smartCollections: [],
      categories: this.getDefaultCategories(),
      settings: {
        defaultCategory: 'general',
        autoSummarize: true,
        enableSmartCollections: true,
      }
    };
  }

  async getLinkByUrl(url: string): Promise<SavedLink | null> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('user_id', user.id)
      .eq('url', url)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw error;
    }

    // Map database fields to TypeScript camelCase
    return {
      id: data.id,
      url: data.url,
      title: data.title,
      favicon: data.favicon,
      userNote: data.user_note || '',
      aiSummary: data.ai_summary,
      category: data.category,
      collectionId: data.collection_id,
      isInInbox: data.is_in_inbox || false,
      highlights: this.parseHighlights(data.highlights),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      domain: data.domain,
    };
  }

  // Helper function to safely parse highlights
  private parseHighlights(highlightsData: any): any[] {
    if (!highlightsData) {
      console.log('Storage: No highlights data found');
      return [];
    }
    if (typeof highlightsData === 'string') {
      try {
        const parsed = JSON.parse(highlightsData);
        const result = Array.isArray(parsed) ? parsed : [];
        console.log('Storage: Parsed highlights from JSON:', result.length, 'highlights', result);
        return result;
      } catch (error) {
        console.warn('Failed to parse highlights JSON:', error);
        return [];
      }
    }
    if (Array.isArray(highlightsData)) {
      console.log('Storage: Found highlights array:', highlightsData.length, 'highlights', highlightsData);
      return highlightsData;
    }
    console.log('Storage: Highlights data in unexpected format:', typeof highlightsData, highlightsData);
    return [];
  }

  // Activity Tracking methods
  async logActivity(type: 'save' | 'read' | 'highlight' | 'organize' | 'search', linkId?: string, collectionId?: string, metadata?: Record<string, any>): Promise<void> {
    // For now, store activities in localStorage until we have database schema
    try {
      const activities = await this.getActivities();
      const newActivity = {
        id: Date.now().toString(),
        type,
        linkId,
        collectionId,
        metadata,
        createdAt: new Date()
      };
      
      activities.push(newActivity);
      
      // Keep only last 1000 activities to prevent storage bloat
      const recentActivities = activities.slice(-1000);
      
      await chrome.storage.local.set({ 'nest_activities': recentActivities });
      
      // Update streaks
      await this.updateStreaks(type);
      
      console.log('Activity logged:', newActivity);
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  async getActivities(limit: number = 100): Promise<any[]> {
    try {
      const result = await chrome.storage.local.get('nest_activities');
      const activities = result.nest_activities || [];
      return activities.slice(-limit).reverse(); // Most recent first
    } catch (error) {
      console.error('Failed to get activities:', error);
      return [];
    }
  }

  async getActivityStats(): Promise<{
    totalSaves: number;
    totalReads: number;
    totalHighlights: number;
    totalOrganizations: number;
    totalSearches: number;
    activeDays: number;
    currentStreak: number;
    bestStreak: number;
    thisWeekActivity: number;
    lastActiveDate?: Date;
  }> {
    try {
      const activities = await this.getActivities(1000);
      const streaks = await this.getStreaks();
      
      const stats = {
        totalSaves: activities.filter(a => a.type === 'save').length,
        totalReads: activities.filter(a => a.type === 'read').length,
        totalHighlights: activities.filter(a => a.type === 'highlight').length,
        totalOrganizations: activities.filter(a => a.type === 'organize').length,
        totalSearches: activities.filter(a => a.type === 'search').length,
        activeDays: this.getUniqueDays(activities).length,
        currentStreak: streaks.find(s => s.type === 'daily_save')?.currentCount || 0,
        bestStreak: streaks.find(s => s.type === 'daily_save')?.bestCount || 0,
        thisWeekActivity: this.getThisWeekActivity(activities),
        lastActiveDate: activities.length > 0 ? new Date(activities[0].createdAt) : undefined
      };
      
      return stats;
    } catch (error) {
      console.error('Failed to get activity stats:', error);
      return {
        totalSaves: 0,
        totalReads: 0,
        totalHighlights: 0,
        totalOrganizations: 0,
        totalSearches: 0,
        activeDays: 0,
        currentStreak: 0,
        bestStreak: 0,
        thisWeekActivity: 0
      };
    }
  }

  async getStreaks(): Promise<any[]> {
    try {
      const result = await chrome.storage.local.get('nest_streaks');
      return result.nest_streaks || [];
    } catch (error) {
      console.error('Failed to get streaks:', error);
      return [];
    }
  }

  private async updateStreaks(activityType: string): Promise<void> {
    try {
      const streaks = await this.getStreaks();
      const today = new Date().toDateString();
      
      // Update daily save streak
      if (activityType === 'save') {
        let dailySaveStreak = streaks.find(s => s.type === 'daily_save');
        
        if (!dailySaveStreak) {
          dailySaveStreak = {
            id: 'daily_save',
            type: 'daily_save',
            currentCount: 0,
            bestCount: 0,
            lastActivityAt: new Date(),
            createdAt: new Date()
          };
          streaks.push(dailySaveStreak);
        }
        
        const lastActivityDate = new Date(dailySaveStreak.lastActivityAt).toDateString();
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
        
        if (lastActivityDate === today) {
          // Already counted today, no change
        } else if (lastActivityDate === yesterday) {
          // Consecutive day, increment streak
          dailySaveStreak.currentCount++;
          dailySaveStreak.lastActivityAt = new Date();
        } else {
          // Streak broken, reset to 1
          dailySaveStreak.currentCount = 1;
          dailySaveStreak.lastActivityAt = new Date();
        }
        
        // Update best streak
        if (dailySaveStreak.currentCount > dailySaveStreak.bestCount) {
          dailySaveStreak.bestCount = dailySaveStreak.currentCount;
        }
      }
      
      // Update weekly organize streak
      if (activityType === 'organize') {
        let weeklyOrganizeStreak = streaks.find(s => s.type === 'weekly_organize');
        
        if (!weeklyOrganizeStreak) {
          weeklyOrganizeStreak = {
            id: 'weekly_organize',
            type: 'weekly_organize',
            currentCount: 0,
            bestCount: 0,
            lastActivityAt: new Date(),
            createdAt: new Date()
          };
          streaks.push(weeklyOrganizeStreak);
        }
        
        const thisWeek = this.getWeekNumber(new Date());
        const lastWeek = this.getWeekNumber(new Date(weeklyOrganizeStreak.lastActivityAt));
        
        if (thisWeek === lastWeek) {
          // Same week, no change to count
        } else if (thisWeek === lastWeek + 1) {
          // Next week, increment
          weeklyOrganizeStreak.currentCount++;
          weeklyOrganizeStreak.lastActivityAt = new Date();
        } else {
          // Gap in weeks, reset
          weeklyOrganizeStreak.currentCount = 1;
          weeklyOrganizeStreak.lastActivityAt = new Date();
        }
        
        if (weeklyOrganizeStreak.currentCount > weeklyOrganizeStreak.bestCount) {
          weeklyOrganizeStreak.bestCount = weeklyOrganizeStreak.currentCount;
        }
      }
      
      await chrome.storage.local.set({ 'nest_streaks': streaks });
    } catch (error) {
      console.error('Failed to update streaks:', error);
    }
  }

  private getUniqueDays(activities: any[]): string[] {
    const days = new Set<string>();
    activities.forEach(activity => {
      const day = new Date(activity.createdAt).toDateString();
      days.add(day);
    });
    return Array.from(days);
  }

  private getThisWeekActivity(activities: any[]): number {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return activities.filter(activity => 
      new Date(activity.createdAt) >= oneWeekAgo
    ).length;
  }

  private getWeekNumber(date: Date): number {
    const onejan = new Date(date.getFullYear(), 0, 1);
    const millisecsInDay = 86400000;
    return Math.ceil((((date.getTime() - onejan.getTime()) / millisecsInDay) + onejan.getDay() + 1) / 7);
  }

  async shouldShowNudge(): Promise<{ show: boolean; type?: string; message?: string }> {
    try {
      const stats = await this.getActivityStats();
      const activities = await this.getActivities(50);
      
      // Check if user hasn't saved anything today
      const today = new Date().toDateString();
      const todayActivities = activities.filter(a => 
        new Date(a.createdAt).toDateString() === today && a.type === 'save'
      );
      
      if (todayActivities.length === 0) {
        // Check if they have a streak to maintain
        if (stats.currentStreak > 0) {
          return {
            show: true,
            type: 'streak_reminder',
            message: `You have a ${stats.currentStreak}-day saving streak! Don't break it - save something today.`
          };
        }
        
        // Check if they've been inactive for a while
        if (stats.lastActiveDate) {
          const daysSinceActive = Math.floor((Date.now() - stats.lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceActive >= 3) {
            return {
              show: true,
              type: 'inactive_reminder',
              message: `Welcome back! You haven't saved anything in ${daysSinceActive} days. Found something interesting?`
            };
          }
        }
        
        // General daily reminder
        const hour = new Date().getHours();
        if (hour >= 10 && hour <= 20) { // Between 10 AM and 8 PM
          return {
            show: true,
            type: 'daily_reminder',
            message: 'Discover something new today? Save it to Nest!'
          };
        }
      }
      
      return { show: false };
    } catch (error) {
      console.error('Failed to check nudge status:', error);
      return { show: false };
    }
  }
}

export const storage = new StorageManager(); 