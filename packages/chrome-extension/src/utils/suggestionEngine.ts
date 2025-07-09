// Smart suggestion engine for generating next-best-action recommendations
import { SavedLink, Collection } from '../types';
import { storage } from './storage';
import { activityAnalyzer, ActivityPattern, StaleContentItem, ContentCluster } from './activityAnalyzer';
import { aiService } from './ai';

export interface Suggestion {
  id: string;
  type: 'read_next' | 'archive' | 'organize' | 'review_highlights' | 'create_collection' | 'clear_inbox' | 'focus_session' | 'digest_old';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  actionData: any;
  reasoning: string;
  dismissible: boolean;
  estimatedTime?: string; // "5 min", "10-15 min", etc.
  confidence: number; // 0-1 scale
  category: 'productivity' | 'organization' | 'learning' | 'maintenance';
}

export interface InboxSummary {
  totalItems: number;
  itemsByCategory: Record<string, number>;
  stalestItem: SavedLink | null;
  newestItem: SavedLink | null;
  avgDaysInInbox: number;
  recommendedActions: string[];
}

export interface BatchActionResult {
  success: boolean;
  itemsProcessed: number;
  itemsArchived: number;
  collectionsCreated: number;
  errors: string[];
  summary: string;
}

export class SuggestionEngine {
  private static instance: SuggestionEngine;
  
  public static getInstance(): SuggestionEngine {
    if (!SuggestionEngine.instance) {
      SuggestionEngine.instance = new SuggestionEngine();
    }
    return SuggestionEngine.instance;
  }

  /**
   * Generate personalized suggestions based on user patterns and current state
   */
  async generateSuggestions(): Promise<Suggestion[]> {
    try {
      const [patterns, staleContent, clusters, data] = await Promise.all([
        activityAnalyzer.analyzeUserPatterns(),
        activityAnalyzer.identifyStaleContent(),
        activityAnalyzer.detectContentClusters(),
        storage.getData()
      ]);

      const suggestions: Suggestion[] = [];
      const inboxItems = data.links.filter(link => link.isInInbox);
      
      // Generate different types of suggestions
      suggestions.push(...await this.generateReadingSuggestions(patterns, data.links));
      suggestions.push(...await this.generateOrganizationSuggestions(clusters, inboxItems));
      suggestions.push(...await this.generateMaintenanceSuggestions(staleContent, patterns));
      suggestions.push(...await this.generateProductivitySuggestions(patterns, inboxItems));
      suggestions.push(...await this.generateLearningEnhancementSuggestions(data));

      // Sort by priority and confidence
      return suggestions
        .sort((a, b) => this.priorityScore(b) - this.priorityScore(a))
        .slice(0, 8); // Return top 8 suggestions to avoid overwhelming
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      return this.getFallbackSuggestions();
    }
  }

  /**
   * Get a comprehensive summary for Inbox Zero implementation
   */
  async getSummarizeAndClearSuggestion(): Promise<{
    summary: InboxSummary;
    batchActions: Array<{
      action: 'archive' | 'organize' | 'delete';
      items: SavedLink[];
      reason: string;
    }>;
    estimatedTime: string;
  }> {
    try {
      const [staleContent, clusters, data] = await Promise.all([
        activityAnalyzer.identifyStaleContent(),
        activityAnalyzer.detectContentClusters(),
        storage.getData()
      ]);

      const inboxItems = data.links.filter(link => link.isInInbox);
      
      // Generate comprehensive inbox summary
      const summary = this.generateInboxSummary(inboxItems);
      
      // Plan batch actions
      const batchActions = this.planBatchActions(inboxItems, staleContent, clusters);
      
      // Estimate time required
      const estimatedTime = this.estimateProcessingTime(batchActions);

      return { summary, batchActions, estimatedTime };
    } catch (error) {
      console.error('Failed to generate inbox summary:', error);
      throw error;
    }
  }

  /**
   * Execute batch actions for inbox management
   */
  async executeBatchActions(actions: Array<{
    action: 'archive' | 'organize' | 'delete';
    items: SavedLink[];
    reason: string;
    collectionId?: string;
  }>): Promise<BatchActionResult> {
    const result: BatchActionResult = {
      success: true,
      itemsProcessed: 0,
      itemsArchived: 0,
      collectionsCreated: 0,
      errors: [],
      summary: ''
    };

    try {
      for (const actionGroup of actions) {
        for (const item of actionGroup.items) {
          try {
            switch (actionGroup.action) {
              case 'archive':
                await storage.updateLink(item.id, { 
                  isInInbox: false, 
                  collectionId: actionGroup.collectionId 
                });
                result.itemsArchived++;
                break;
              
              case 'organize':
                if (actionGroup.collectionId) {
                  await storage.updateLink(item.id, { 
                    isInInbox: false, 
                    collectionId: actionGroup.collectionId 
                  });
                  result.itemsArchived++;
                }
                break;
              
              case 'delete':
                // For now, just archive instead of hard delete for safety
                await storage.updateLink(item.id, { isInInbox: false });
                result.itemsArchived++;
                break;
            }
            
            result.itemsProcessed++;
            
            // Log the action for tracking
            await storage.logActivity('organize', item.id, undefined, {
              action: actionGroup.action,
              reason: actionGroup.reason,
              batchOperation: true
            });
          } catch (error) {
            result.errors.push(`Failed to ${actionGroup.action} "${item.title}": ${error}`);
            result.success = false;
          }
        }
      }

      // Generate summary
      result.summary = this.generateBatchActionSummary(result);
      
      return result;
    } catch (error) {
      console.error('Batch action execution failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  /**
   * Get context-aware suggestions for the current time of day
   */
  async getTimeAwareSuggestions(): Promise<Suggestion[]> {
    const patterns = await activityAnalyzer.analyzeUserPatterns();
    const currentHour = new Date().getHours();
    const isPreferredTime = patterns.preferredReadingTimes.includes(currentHour);
    
    if (isPreferredTime) {
      return this.generateReadingFocusedSuggestions();
    } else {
      return this.generateOrganizationFocusedSuggestions();
    }
  }

  // Private helper methods

  private async generateReadingSuggestions(patterns: ActivityPattern, links: SavedLink[]): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    const recommendations = await activityAnalyzer.getReadingRecommendations(3);
    
    if (recommendations.length > 0) {
      const topRecommendation = recommendations[0];
      suggestions.push({
        id: `read_${topRecommendation.id}`,
        type: 'read_next',
        priority: 'high',
        title: 'Continue Your Learning Journey',
        description: `Based on your reading habits, "${topRecommendation.title}" looks like a great next read.`,
        actionData: { linkId: topRecommendation.id, link: topRecommendation },
        reasoning: `This matches your preference for ${topRecommendation.domain} content and fits your typical reading patterns.`,
        dismissible: true,
        estimatedTime: this.estimateReadingTime(topRecommendation),
        confidence: 0.8,
        category: 'learning'
      });
    }

    // Suggest focus session if user has good patterns
    if (patterns.averageSessionLength > 20 && patterns.readingVelocity > 1) {
      suggestions.push({
        id: 'focus_session_suggestion',
        type: 'focus_session',
        priority: 'medium',
        title: 'Start a Focus Session',
        description: `You typically read for ${Math.round(patterns.averageSessionLength)} minutes. Want to start a focused reading session?`,
        actionData: { 
          suggestedDuration: Math.round(patterns.averageSessionLength),
          recommendations: recommendations.slice(0, 3)
        },
        reasoning: 'Based on your typical reading session length and current focus patterns.',
        dismissible: true,
        estimatedTime: `${Math.round(patterns.averageSessionLength)} min`,
        confidence: 0.7,
        category: 'productivity'
      });
    }

    return suggestions;
  }

  private async generateOrganizationSuggestions(clusters: ContentCluster[], inboxItems: SavedLink[]): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    if (inboxItems.length > 10) {
      suggestions.push({
        id: 'inbox_overwhelm',
        type: 'clear_inbox',
        priority: 'high',
        title: 'Your Inbox Needs Attention',
        description: `You have ${inboxItems.length} items in your inbox. Let's organize them efficiently.`,
        actionData: { itemCount: inboxItems.length },
        reasoning: 'Large inbox can reduce productivity and make finding content harder.',
        dismissible: false,
        estimatedTime: '10-15 min',
        confidence: 0.9,
        category: 'organization'
      });
    }

    // Suggest creating collections from clusters
    for (const cluster of clusters.slice(0, 2)) {
      if (cluster.confidence > 0.7) {
        suggestions.push({
          id: `create_collection_${cluster.theme.replace(/\s+/g, '_')}`,
          type: 'create_collection',
          priority: 'medium',
          title: `Organize ${cluster.theme}`,
          description: `Create a "${cluster.suggestedCollectionName}" collection for your ${cluster.links.length} related items.`,
          actionData: {
            cluster,
            suggestedName: cluster.suggestedCollectionName,
            linkIds: cluster.links.map(l => l.id)
          },
          reasoning: `These ${cluster.links.length} items share a common theme and would benefit from organization.`,
          dismissible: true,
          estimatedTime: '2-3 min',
          confidence: cluster.confidence,
          category: 'organization'
        });
      }
    }

    return suggestions;
  }

  private async generateMaintenanceSuggestions(staleContent: StaleContentItem[], patterns: ActivityPattern): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    if (staleContent.length > 0) {
      const urgentStale = staleContent.filter(item => item.staleness > 0.8);
      
      if (urgentStale.length > 0) {
        suggestions.push({
          id: 'archive_stale_content',
          type: 'archive',
          priority: 'medium',
          title: 'Archive Old Content',
          description: `${urgentStale.length} items haven't been accessed in a while and could be archived.`,
          actionData: { staleItems: urgentStale },
          reasoning: 'Archiving stale content helps keep your active workspace clean and focused.',
          dismissible: true,
          estimatedTime: '5 min',
          confidence: 0.8,
          category: 'maintenance'
        });
      }

      // Suggest reviewing never-accessed items
      const neverAccessed = staleContent.filter(item => item.reason === 'never_accessed');
      if (neverAccessed.length >= 3) {
        suggestions.push({
          id: 'review_never_accessed',
          type: 'review_highlights',
          priority: 'low',
          title: 'Review Unread Items',
          description: `You have ${neverAccessed.length} items you've saved but never opened. Worth a quick review?`,
          actionData: { items: neverAccessed.slice(0, 5) },
          reasoning: 'These might contain valuable insights or could be safely archived.',
          dismissible: true,
          estimatedTime: '10 min',
          confidence: 0.6,
          category: 'maintenance'
        });
      }
    }

    return suggestions;
  }

  private async generateProductivitySuggestions(patterns: ActivityPattern, inboxItems: SavedLink[]): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Suggest digest review if user has been inactive for a while
    const activities = await storage.getActivities(10);
    const lastActivity = activities[0];
    
    if (lastActivity) {
      const daysSinceLastActivity = Math.floor(
        (Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastActivity >= patterns.organizationFrequency * 1.5) {
        suggestions.push({
          id: 'digest_old_content',
          type: 'digest_old',
          priority: 'low',
          title: 'Catch Up on Your Content',
          description: `It's been ${daysSinceLastActivity} days since your last organization session. Want a digest of what you've saved?`,
          actionData: { daysSince: daysSinceLastActivity },
          reasoning: 'Regular content review helps maintain knowledge retention and organization.',
          dismissible: true,
          estimatedTime: '5-10 min',
          confidence: 0.7,
          category: 'productivity'
        });
      }
    }

    return suggestions;
  }

  private async generateLearningEnhancementSuggestions(data: any): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    
    // Count highlights across all links
    const totalHighlights = data.links.reduce((count: number, link: SavedLink) => 
      count + (link.highlights?.length || 0), 0
    );

    if (totalHighlights > 5) {
      suggestions.push({
        id: 'review_highlights_learning',
        type: 'review_highlights',
        priority: 'medium',
        title: 'Review Your Highlights',
        description: `You have ${totalHighlights} highlights across your saved content. Perfect for a quick review session!`,
        actionData: { highlightCount: totalHighlights },
        reasoning: 'Regular highlight review reinforces learning and helps identify knowledge patterns.',
        dismissible: true,
        estimatedTime: '8-12 min',
        confidence: 0.8,
        category: 'learning'
      });
    }

    return suggestions;
  }

  private async generateReadingFocusedSuggestions(): Promise<Suggestion[]> {
    const recommendations = await activityAnalyzer.getReadingRecommendations(5);
    
    return recommendations.slice(0, 3).map((link, index) => ({
      id: `focused_read_${link.id}`,
      type: 'read_next',
      priority: index === 0 ? 'high' : 'medium',
      title: `Perfect Time to Read`,
      description: `"${link.title}" - matches your current reading preferences.`,
      actionData: { linkId: link.id, link },
      reasoning: 'This is one of your preferred reading times.',
      dismissible: true,
      estimatedTime: this.estimateReadingTime(link),
      confidence: 0.8,
      category: 'learning'
    }));
  }

  private async generateOrganizationFocusedSuggestions(): Promise<Suggestion[]> {
    const clusters = await activityAnalyzer.detectContentClusters();
    
    return clusters.slice(0, 2).map(cluster => ({
      id: `organize_${cluster.theme.replace(/\s+/g, '_')}`,
      type: 'organize',
      priority: 'medium',
      title: 'Quick Organization',
      description: `Organize your ${cluster.links.length} ${cluster.theme} items.`,
      actionData: { cluster },
      reasoning: 'Good time for organization tasks during non-reading hours.',
      dismissible: true,
      estimatedTime: '3-5 min',
      confidence: cluster.confidence,
      category: 'organization'
    }));
  }

  private generateInboxSummary(inboxItems: SavedLink[]): InboxSummary {
    const itemsByCategory = inboxItems.reduce((acc, item) => {
      const category = item.category || 'general';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const now = new Date();
    const sortedByAge = [...inboxItems].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    const totalDays = inboxItems.reduce((sum, item) => {
      const days = Math.floor((now.getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);

    return {
      totalItems: inboxItems.length,
      itemsByCategory,
      stalestItem: sortedByAge[0] || null,
      newestItem: sortedByAge[sortedByAge.length - 1] || null,
      avgDaysInInbox: inboxItems.length > 0 ? Math.round(totalDays / inboxItems.length) : 0,
      recommendedActions: this.generateRecommendedActions(inboxItems)
    };
  }

  private planBatchActions(
    inboxItems: SavedLink[], 
    staleContent: StaleContentItem[], 
    clusters: ContentCluster[]
  ): Array<{
    action: 'archive' | 'organize' | 'delete';
    items: SavedLink[];
    reason: string;
  }> {
    const actions: Array<{
      action: 'archive' | 'organize' | 'delete';
      items: SavedLink[];
      reason: string;
    }> = [];

    // Archive very stale content
    const veryStale = staleContent.filter(item => item.staleness > 0.8);
    if (veryStale.length > 0) {
      actions.push({
        action: 'archive',
        items: veryStale.map(item => item.link),
        reason: 'Content is stale and hasn\'t been accessed recently'
      });
    }

    // Organize clustered content
    for (const cluster of clusters) {
      if (cluster.confidence > 0.7 && cluster.links.length >= 3) {
        actions.push({
          action: 'organize',
          items: cluster.links,
          reason: `Group related ${cluster.theme} content into a collection`
        });
      }
    }

    return actions;
  }

  private estimateProcessingTime(actions: Array<{ items: SavedLink[] }>): string {
    const totalItems = actions.reduce((sum, action) => sum + action.items.length, 0);
    const minutes = Math.max(2, Math.ceil(totalItems / 5)); // ~5 items per minute
    
    if (minutes < 5) return `${minutes} min`;
    if (minutes < 15) return `${minutes}-${minutes + 3} min`;
    return `15+ min`;
  }

  private generateBatchActionSummary(result: BatchActionResult): string {
    if (result.success) {
      return `Successfully processed ${result.itemsProcessed} items. ${result.itemsArchived} items were organized or archived.`;
    } else {
      return `Processed ${result.itemsProcessed} items with ${result.errors.length} errors. Some items may need manual attention.`;
    }
  }

  private generateRecommendedActions(inboxItems: SavedLink[]): string[] {
    const actions: string[] = [];
    
    if (inboxItems.length > 15) {
      actions.push('Use batch actions to quickly organize multiple items');
    }
    
    if (inboxItems.length > 5) {
      actions.push('Create collections for related content');
      actions.push('Archive items you\'re no longer interested in');
    }
    
    actions.push('Review and tag important items');
    actions.push('Add notes to items you want to remember');
    
    return actions;
  }

  private estimateReadingTime(link: SavedLink): string {
    // Simple estimation based on content type and domain
    const domain = link.domain.toLowerCase();
    
    if (domain.includes('youtube.com')) return '10-20 min';
    if (domain.includes('twitter.com')) return '2 min';
    if (domain.includes('github.com')) return '5-15 min';
    if (domain.includes('medium.com')) return '8-12 min';
    if (domain.includes('stackoverflow.com')) return '3-5 min';
    
    return '5-10 min';
  }

  private priorityScore(suggestion: Suggestion): number {
    const priorityWeights = { urgent: 4, high: 3, medium: 2, low: 1 };
    return priorityWeights[suggestion.priority] * suggestion.confidence;
  }

  private getFallbackSuggestions(): Suggestion[] {
    return [
      {
        id: 'fallback_organize',
        type: 'organize',
        priority: 'medium',
        title: 'Organize Your Content',
        description: 'Take a few minutes to organize your saved items.',
        actionData: {},
        reasoning: 'Regular organization improves content discoverability.',
        dismissible: true,
        estimatedTime: '5 min',
        confidence: 0.5,
        category: 'organization'
      }
    ];
  }
}

// Export singleton instance
export const suggestionEngine = SuggestionEngine.getInstance(); 